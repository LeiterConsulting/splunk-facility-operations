// Uses an existing lab credential file; never writes authentication state or logs credentials.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
const [envFile, prefix, output] = process.argv.slice(2);
if (!envFile || !prefix || !output) throw new Error('Supply env file, lab prefix, and output directory');
const values = Object.fromEntries(readFileSync(envFile, 'utf8').split('\n').filter((line) => line.includes('=') && !line.startsWith('#')).map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
const key = prefix + '_SPLUNK_';
const parsed = new URL(values[key + 'URL']);
const origin = parsed.protocol + '//' + parsed.hostname + ':' + (values[key + 'WEB_PORT'] || '8000');
const browserTlsException = process.argv.includes('--browser-tls-exception') || values[key + 'VERIFY_TLS'] === 'false';
const browser = await chromium.launch({ channel: 'chrome', headless: !process.argv.includes('--headed'), args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', ...(parsed.protocol === 'http:' ? ['--unsafely-treat-insecure-origin-as-secure=' + origin] : [])] });
const context = await browser.newContext({ ignoreHTTPSErrors: browserTlsException, viewport: { width: 1600, height: 1100 } });
const page = await context.newPage();
page.setDefaultTimeout(45000);
const receipt = { target: prefix, checks: [], page_error_count: 0, runtime_architecture: process.arch, browser_tls_exception: browserTlsException, lab_secure_origin_exception: parsed.protocol === 'http:' };
page.on('pageerror', () => receipt.page_error_count++);
receipt.console_errors = [];
page.on('console', (message) => {
  if (message.type() === 'error' && receipt.console_errors.length < 30) {
    const detail = message.text().replaceAll(origin, '[lab origin]').slice(0, 1500);
    receipt.console_errors.push(detail);
  }
});
receipt.asset_responses = [];
page.on('response', (response) => {
  const path = new URL(response.url()).pathname;
  if (path.includes('facility-operations.') || path.includes('/build/api/layout') || path.includes('/servicesNS/-/splunk_facility_operations/')) receipt.asset_responses.push({ path, status: response.status(), type: response.headers()['content-type'] });
});
page.on('response', async (response) => {
  if (new URL(response.url()).pathname.endsWith('/facility-operations.js') && response.status() === 200) {
    const bundle = await response.body();
    receipt.served_bundle_sha256 = createHash('sha256').update(bundle).digest('hex');
    const localBundle = readFileSync('splunk_facility_operations/appserver/static/facility-operations.js');
    receipt.local_bundle_sha256 = createHash('sha256').update(localBundle).digest('hex');
    receipt.candidate_bundle_in_served_asset = bundle.includes(localBundle);
  }
});
receipt.failed_requests = [];
page.on('requestfailed', (request) => receipt.failed_requests.push({ path: new URL(request.url()).pathname, failure: request.failure()?.errorText }));
function check(name, passed) { receipt.checks.push({ name, passed: !!passed }); console.log(name + ': ' + (passed ? 'passed' : 'FAILED')); }
async function clickButton(name) {
  await page.locator('#facility-operations-root').getByRole('button', { name, exact: typeof name === 'string' }).click();
}
mkdirSync(output, { recursive: true });
try {
  receipt.stage = 'login';
  await page.goto(origin + '/en-US/account/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[name=username]').fill(values[key + 'USERNAME']);
  await page.locator('input[name=password]').fill(values[key + 'PASSWORD']);
  await page.locator('input[type=submit],button[type=submit]').first().click();
  await page.waitForURL((url) => !url.pathname.includes('/account/login'), { waitUntil: 'commit' });
  if (process.argv.includes('--bump')) {
    const bumpURL = origin + '/en-US/_bump';
    await page.goto(bumpURL, { waitUntil: 'domcontentloaded' });
    const acknowledged = page.waitForResponse((response) => response.url().includes('/_bump') && response.request().method() === 'POST');
    await page.locator('input[type=submit],button[type=submit]').first().click();
    receipt.static_cache_bump_status = (await acknowledged).status();
  }
  receipt.stage = 'app';
  const entry = await page.goto(origin + '/en-US/app/splunk_facility_operations/facility_operations?vertical=public_services&audience=operations&usecase=dependency', { waitUntil: 'commit' });
  receipt.entry_http_status = entry.status();
  const entryHTML = await entry.text();
  receipt.entry_script_paths = (entryHTML.match(/<script[^>]+src=["'][^"']+/g) || []).map((tag) => tag.split(/src=["']/)[1]).map((url) => new URL(url, origin).pathname);
  console.log('Installed app entry HTTP ' + receipt.entry_http_status);
  if (receipt.entry_http_status >= 400) throw new Error('The installed app entry returned HTTP ' + receipt.entry_http_status);
  receipt.stage = 'demo';
  await page.bringToFront();
  await page.getByRole('link', { name: /Open current search in Splunk/ }).waitFor();
  check('installed_application_shell', await page.getByText('Splunk proof of concept', { exact: true }).isVisible());
  // These belong to Splunk Web, outside the React app root. A branded local
  // header or component-preview screenshot cannot satisfy this check.
  const chrome = page.getByRole('banner').first();
  check('native_splunk_chrome_visible', await chrome.isVisible() && !(await page.locator('#facility-operations-root [role=banner]').count()));
  const workspaceLink = page.locator('a[href$="/app/splunk_facility_operations/facility_operations"]').first();
  const guideLink = page.locator('a[href*="/docs/demo-guide.md"]').first();
  await workspaceLink.waitFor();
  await guideLink.waitFor();
  check('native_app_navigation_visible', await workspaceLink.isVisible() && await guideLink.isVisible() && !(await page.locator('#facility-operations-root a[href*="/docs/demo-guide.md"]').count()));
  const skip = page.locator('#facility-operations-root').getByRole('link', { name: 'Skip to workspace', exact: true });
  await skip.focus();
  await skip.press('Enter');
  check('workspace_keyboard_focus_inside_app', await page.locator('#facility-operations-main').evaluate((element) => element === document.activeElement) && await chrome.isVisible());
  check('standard_view_without_custom_template', !entryHTML.includes('/templates/facility_operations.html') && entryHTML.includes('facility_operations_host_row'));
  const handoff = new URL(await page.getByRole('link', { name: /Open current search in Splunk/ }).getAttribute('href'), origin);
  check('search_handoff_keeps_app_and_scope', handoff.pathname.endsWith('/app/splunk_facility_operations/search') && handoff.searchParams.get('q').includes('facility_ops_demo_events'));
  await clickButton('Pause');
  await clickButton('3 Impact');
  await clickButton('Dependencies');
  await page.getByRole('button', { name: 'Benefits access broker, Critical, inspect evidence', exact: true }).waitFor();
  check('installed_assets_match_candidate', receipt.candidate_bundle_in_served_asset);
  check('installed_situation_and_demo_search', true);
  check('dashboard_selectors_hidden', await page.getByRole('combobox', { name: 'Audience', exact: true }).count() === 0 && await page.getByRole('combobox', { name: 'Use case', exact: true }).count() === 0);
  receipt.stage = 'commercial_settings';
  await clickButton('Presentation settings');
  await page.getByRole('combobox', { name: 'Industry / vertical', exact: true }).selectOption('retail');
  await page.getByRole('combobox', { name: 'Audience', exact: true }).selectOption('executive');
  await clickButton('Apply presentation');
  await page.getByRole('heading', { name: 'Online checkout', exact: true }).waitFor();
  await page.getByRole('region', { name: 'Platform diagnostic comparison' }).getByText('TOKEN_EXCHANGE_TIMEOUT', {exact:true}).waitFor();
  check('commercial_settings_and_native_search', (await page.getByLabel('Current presentation context').innerText()).includes('Retail and Commerce'));
  check('retail_completion_from_splunk', (await page.getByRole('region', { name: 'Business transaction performance' }).innerText()).includes('2,286 / 2,472'));
  await page.screenshot({ path: output + '/commercial-situation.png', fullPage: true });
  const briefing = page.getByRole('region', { name: 'Operational briefing', exact: true });
  check('audience_operational_briefing', (await briefing.innerText()).includes('Online checkout') && (await briefing.innerText()).includes('6 components at lower priority'));
  await briefing.getByText('What this dataset can answer', { exact: true }).click();
  check('dataset_purpose_and_limits', (await briefing.innerText()).includes('Request traces, independent application telemetry'));
  receipt.stage = 'search_handoff';
  const [searchPage] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('link', { name: /Open current search in Splunk/ }).click(),
  ]);
  await searchPage.getByText('Online checkout', { exact: true }).first().waitFor({ timeout: 45000 });
  check('native_search_page_runs_current_scope', new URL(searchPage.url()).pathname.endsWith('/app/splunk_facility_operations/search') && new URL(searchPage.url()).searchParams.get('q').includes('"retail"'));
  await searchPage.close();
  receipt.stage = 'investigation';
  await page.screenshot({ path: output + '/situation.png', fullPage: true });
  await clickButton('Investigate priority');
  await page.getByText('Focused on Commerce access broker [identity]', { exact: true }).waitFor();
  check('component_investigation_handoff', (await page.getByLabel('Ask about the current operational context').inputValue()).includes('[identity]'));
  const connectedProvider = !(await page.locator('.fo-agent-provider').innerText()).includes('Deterministic demo assistant');
  if (connectedProvider && !process.argv.includes('--allow-provider-inference')) throw new Error('Configured inference requires --allow-provider-inference; provider settings are preserved.');
  await page.getByLabel('Ask about the current operational context').fill('Trace the event sequence using query_events timeline and follow_dependencies for Commerce access broker. Explain dependency impact, counter-evidence and missing evidence.');
  await clickButton('Investigate');
  await page.getByText('Investigation steps', { exact: true }).waitFor();
  check('installed_investigation_service', true);
  const downloading = page.waitForEvent('download');
  await clickButton('Export evidence');
  const download = await downloading;
  const evidence = JSON.parse(readFileSync(await download.path(), 'utf8'));
  check('commercial_investigation_export', evidence.scope.vertical === 'retail' && evidence.scope.audience === 'executive' && evidence.results.some((result) => result.rows.some((row) => row.name === 'Online checkout')));
  check('computed_evidence_and_dataset_grounding', evidence.scope.entity_id === 'identity' && evidence.assessment.queue === 520 && evidence.assessment.observed === 9 && evidence.knowledge.audience.id === 'executive' && evidence.knowledge.vertical.unit === 'orders');
  check('current_pass_chronology', evidence.results.find((result) => result.kind === 'timeline').rows.every((row) => Number(row.phase) <= 2));
  check('receipt_evidence_drilldown', await page.getByRole('region', { name: 'Retrieved evidence summary', exact: true }).isVisible());
  await page.screenshot({ path: output + '/investigation.png', fullPage: true });
  receipt.stage = 'manufacturing';
  await clickButton('Presentation settings');
  await page.getByRole('combobox', { name: 'Industry / vertical', exact: true }).selectOption('manufacturing');
  await page.getByRole('combobox', { name: 'Audience', exact: true }).selectOption('facilities');
  await page.getByRole('combobox', { name: 'Use case', exact: true }).selectOption('facility');
  await clickButton('Apply presentation');
  await page.getByRole('heading', { name: 'Manufacturing plant', exact: true }).waitFor();
  check('commercial_facility_sites', await page.getByRole('heading', { name: 'Central campus', exact: true }).count() === 0);
  await clickButton('Situation room');
  await page.getByRole('heading', {name:'Quality release',exact:true}).waitFor();
  check('manufacturing_business_handoffs', (await page.getByRole('region', {name:'Business transaction performance'}).innerText()).includes('107 / 124'));
  await page.screenshot({path:output+'/manufacturing-operations.png',fullPage:true});
  await clickButton('Presentation settings');
  await page.getByRole('combobox',{name:'Industry / vertical',exact:true}).selectOption('distributed_care');
  await page.getByRole('combobox',{name:'Audience',exact:true}).selectOption('operations');
  await page.getByRole('combobox',{name:'Use case',exact:true}).selectOption('dependency');
  await clickButton('Apply presentation');
  const clinical=page.getByRole('region',{name:'Business transaction performance'});
  await clinical.getByRole('heading',{name:'Clinical orders and results',exact:true}).waitFor();
  check('clinical_business_handoffs',(await clinical.innerText()).includes('247 / 268'));
  await clinical.locator('article').first().getByRole('button').click();
  const source=page.getByRole('region',{name:'Operational source observation'});
  await source.getByText('demo:hl7:order_ack',{exact:true}).waitFor();
  check('clinical_source_and_system_reference',(await source.innerText()).includes('Epic interfaces / Oracle Health interfaces'));
  await page.screenshot({path:output+'/healthcare-operations.png',fullPage:true});
  receipt.stage = 'settings';
  await clickButton('Settings');
  if (!connectedProvider) {
    await clickButton('Test saved connection');
    await page.getByRole('status').filter({ hasText: 'Deterministic demo assistant is available' }).waitFor();
  } else {
    await page.getByRole('combobox', { name: 'LLM provider', exact: true }).waitFor();
  }
  check('installed_provider_settings', true);
  await page.screenshot({ path: output + '/presentation-settings.png', fullPage: true });
  await clickButton('Present');
  check('presentation_preserves_native_chrome', await chrome.isVisible() && await page.getByRole('combobox', { name: 'Workspace view', exact: true }).isVisible());
  await page.screenshot({ path: output + '/presentation.png', fullPage: true });
  await page.getByRole('combobox', { name: 'Workspace view', exact: true }).selectOption('investigate');
  await page.getByRole('heading', { name: 'Operations investigation assistant', exact: true }).waitFor();
  check('presentation_investigation_navigation', await chrome.isVisible());
  await page.screenshot({ path: output + '/investigation-presentation.png', fullPage: true });
  check('no_application_page_errors', receipt.page_error_count === 0);
} catch (error) {
  receipt.failure_type = error.name;
  receipt.failure_hint = error.message.split('\n')[0].replaceAll(origin, '[lab origin]');
  receipt.failure_details = error.message.replaceAll(origin, '[lab origin]').slice(0, 3000);
  receipt.page_path = new URL(page.url()).pathname;
  try {
    receipt.root_present = await page.locator('#facility-operations-root').count();
    if (receipt.root_present) receipt.root_mounted = await page.locator('#facility-operations-root').getAttribute('data-mounted', { timeout: 5000 });
  } catch { receipt.dom_diagnostic_unavailable = true; }
  if (receipt.page_path.includes('/app/splunk_facility_operations')) {
    try { await page.screenshot({ path: output + '/failure.png', fullPage: true, timeout: 15000 }); }
    catch { receipt.failure_screenshot_unavailable = true; }
  }
  check('installed_browser_workflow', false);
} finally {
  await context.close(); await browser.close();
  writeFileSync(output + '/receipt.json', JSON.stringify(receipt, null, 2) + '\n');
}
if (!receipt.checks.every((item) => item.passed)) process.exitCode = 1;
