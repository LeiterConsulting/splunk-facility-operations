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
const receipt = { target: prefix, checks: [], page_error_count: 0, browser_tls_exception: browserTlsException, lab_secure_origin_exception: parsed.protocol === 'http:' };
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
  await page.getByRole('button', { name, exact: typeof name === 'string' }).click();
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
  const entry = await page.goto(origin + '/en-US/app/splunk_facility_operations/facility_operations', { waitUntil: 'commit' });
  receipt.entry_http_status = entry.status();
  const entryHTML = await entry.text();
  receipt.entry_script_paths = (entryHTML.match(/<script[^>]+src=["'][^"']+/g) || []).map((tag) => tag.split(/src=["']/)[1]).map((url) => new URL(url, origin).pathname);
  console.log('Installed app entry HTTP ' + receipt.entry_http_status);
  if (receipt.entry_http_status >= 400) throw new Error('The installed app entry returned HTTP ' + receipt.entry_http_status);
  receipt.stage = 'demo';
  await page.bringToFront();
  await page.getByRole('link', { name: 'Splunk Search', exact: true }).waitFor();
  check('installed_application_shell', await page.getByRole('banner').filter({ hasText: 'Facility Operations' }).count() === 1);
  await clickButton('Pause');
  await clickButton('3 Impact');
  await page.getByRole('button', { name: 'Shared identity, Critical, inspect evidence', exact: true }).waitFor();
  check('installed_assets_match_candidate', receipt.candidate_bundle_in_served_asset);
  check('installed_situation_and_demo_search', true);
  receipt.stage = 'investigation';
  await page.screenshot({ path: output + '/situation.png', fullPage: true });
  await clickButton('✧ Investigation assistant');
  await clickButton(/^Investigate the current issue and its dependency impact/);
  await page.getByText('Investigation steps', { exact: true }).waitFor();
  check('installed_investigation_service', true);
  receipt.stage = 'settings';
  await page.screenshot({ path: output + '/investigation.png', fullPage: true });
  await clickButton('⚙ Settings');
  await clickButton('Test saved connection');
  await page.getByRole('status').filter({ hasText: 'Deterministic demo assistant is available' }).waitFor();
  check('installed_provider_settings', true);
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
