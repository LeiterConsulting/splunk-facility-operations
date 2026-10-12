// Uses an existing lab credential file; never writes authentication state or logs credentials.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createHash } from 'node:crypto';
const [envFile, prefix, output] = process.argv.slice(2);
if (!process.argv.includes('--allow-provider-inference')) throw new Error('Pass --allow-provider-inference to qualify the saved provider. No settings are changed.');
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
let updates = [];
const pendingOutputs = [];
page.on('response', (response) => {
  if (!new URL(response.url()).pathname.endsWith('/facility_ops/agent')) return;
  pendingOutputs.push((async () => {
    const state = await response.json();
    if (state.job_id) updates.push({ status: state.status, text_length: state.partial?.length || 0, activity_count: state.activities?.length || 0, kinds: (state.activities || []).map((event) => event.kind) });
  })().catch(() => undefined));
});
try {
  await page.goto(origin + '/en-US/account/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[name=username]').fill(values[key + 'USERNAME']);
  await page.locator('input[name=password]').fill(values[key + 'PASSWORD']);
  await page.locator('input[type=submit],button[type=submit]').first().click();
  await page.waitForURL((url) => !url.pathname.includes('/account/login'), { waitUntil: 'commit' });
  if (process.argv.includes('--bump')) {
    await page.goto(origin + '/en-US/_bump', { waitUntil: 'domcontentloaded' });
    const bumped = page.waitForResponse((response) => response.url().includes('/_bump') && response.request().method() === 'POST');
    await page.locator('input[type=submit],button[type=submit]').first().click();
    await bumped;
  }
  await page.goto(origin + '/en-US/app/splunk_facility_operations/facility_operations?vertical=retail&audience=executive&usecase=dependency&replay=loop', { waitUntil: 'commit' });
  await clickButton('Pause'); await clickButton('3 Impact');
  await clickButton('Dependencies');
  await page.getByRole('button', { name: 'Commerce access broker, Critical, inspect evidence', exact: true }).waitFor();
  check('native_splunk_chrome', await page.getByRole('banner').first().isVisible() && !(await page.locator('#facility-operations-root [role=banner]').count()));
  check('served_candidate_bundle', receipt.candidate_bundle_in_served_asset);
  await clickButton('Investigation assistant');
  receipt.provider_label = await page.locator('.fo-agent-provider').innerText();
  check('configured_openai_provider', receipt.provider_label.includes('OpenAI'));
  await page.getByLabel('Ask about the current operational context').fill('Trace the event sequence using query_events timeline and follow_dependencies for Commerce access broker. Also report online checkout completed/attempted counts, completion percentage, p95 and source signature from operational_facts. Compare token p95 with the database lock-wait signal. Distinguish observations, the dependency hypothesis, counter-evidence and accountable next steps.');
  await clickButton('Investigate');
  await page.getByRole('button', { name: 'Export evidence', exact: true }).waitFor({ timeout: 190000 });
  await Promise.all(pendingOutputs);
  const partials = updates.filter((item) => item.status === 'running' && item.text_length > 0);
  check('actual_partial_answer_before_completion', partials.length >= 1);
  check('incremental_partial_updates', new Set(partials.map((item) => item.text_length)).size >= 2);
  check('activity_before_completion', updates.some((item) => item.status === 'running' && item.kinds.includes('tool_start')));
  receipt.answer_heading_count = await page.locator('.fo-answer-markdown :is(h3,h4,h5,h6)').count();
  check('formatted_answer_headings', receipt.answer_heading_count > 0);
  check('safe_narrative_surface', await page.locator('.fo-answer-markdown img,.fo-answer-markdown script,.fo-answer-markdown a').count() === 0);
  const downloading = page.waitForEvent('download'); await clickButton('Export evidence');
  const evidence = JSON.parse(readFileSync(await (await downloading).path(), 'utf8'));
  check('computed_assessment_grounding', evidence.assessment.queue === 520 && evidence.assessment.observed === 9 && evidence.assessment.affected_functions.length === 2);
  check('business_measures_retrieved', evidence.knowledge.operational_facts.delivery.some((row) => row.entity_id === 'service-1' && row.attempted === 2472 && row.completed === 2286));
  check('business_measures_in_answer', /2,?286/.test(evidence.answer) && /2,?472/.test(evidence.answer));
  check('diagnostic_counter_evidence_retrieved', evidence.knowledge.operational_facts.diagnostics.some((row) => row.entity_id === 'database' && row.signal_value === 18));
  check('actual_function_tools', evidence.trace.some((step) => step.tool === 'follow_dependencies') && evidence.results.some((result) => result.kind === 'timeline'));
  check('current_pass_chronology', evidence.results.find((result) => result.kind === 'timeline').rows.every((row) => Number(row.phase) <= 2));
  check('model_usage_and_activity_export', evidence.calls.length > 0 && evidence.calls.every((call) => call.usage.output_tokens > 0) && evidence.activities.length > 0);
  check('reasoning_not_exported', !/encrypted_content|"thinking"/.test(JSON.stringify(evidence)));
  receipt.provider = evidence.provider; receipt.model = evidence.model;
  receipt.calls = evidence.calls; receipt.progress_samples = updates;
  const citation = page.locator('.fo-answer-markdown').getByRole('button').first();
  await citation.click();
  check('citation_drilldown', await page.getByRole('region', { name: 'Cited component evidence' }).isVisible());
  await page.screenshot({ path: output + '/openai-investigation.png', fullPage: true });
  await clickButton('Close citation');
  await clickButton('Prepare decision brief');
  check('followup_prepared_for_review', (await page.getByLabel('Ask about the current operational context').inputValue()).length > 30);
  updates = [];
  await page.getByLabel('Ask about the current operational context').fill('Summarize this for the executive audience in under 150 words. Use draft_report to prepare the decision brief. Include accountable owners and uncertainty.');
  await clickButton('Investigate');
  await page.getByRole('button', { name: 'Export evidence', exact: true }).nth(1).waitFor({ timeout: 190000 });
  const secondDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export evidence', exact: true }).nth(1).click();
  const brief = JSON.parse(readFileSync(await (await secondDownload).path(), 'utf8'));
  check('followup_report_tool', brief.results.some((item) => item.kind === 'report') && brief.scope.audience === 'executive');
  check('adaptive_reasoning_in_real_calls', brief.calls[0].reasoning === 'low' && evidence.calls[0].reasoning === 'high');
  receipt.brief_calls = brief.calls;
  await page.screenshot({ path: output + '/openai-brief.png', fullPage: true });
  await clickButton('Provider settings');
  await clickButton('Refresh available models');
  await page.getByRole('combobox', { name: 'Available models', exact: true }).waitFor({ timeout: 60000 });
  check('saved_endpoint_model_discovery', (await page.getByRole('combobox', { name: 'Available models', exact: true }).innerText()).includes(evidence.model));
  check('no_application_page_errors', receipt.page_error_count === 0);
} catch (error) {
  receipt.failure_type = error.name; receipt.failure_hint = error.message.split('\n')[0].replaceAll(origin, '[lab origin]');
  check('connected_assistant_workflow', false);
} finally {
  await Promise.all(pendingOutputs);
  await context.close(); await browser.close();
  writeFileSync(output + '/receipt.json', JSON.stringify(receipt, null, 2) + '\n');
}
if (!receipt.checks.every((item) => item.passed)) process.exitCode = 1;
