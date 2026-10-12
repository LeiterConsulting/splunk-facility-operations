// Native guided-story qualification. Credentials and raw evidence stay local.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { chromium, expect } from '@playwright/test';
const [envFile, prefix, output] = process.argv.slice(2);
if (!envFile || !prefix || !output) throw new Error('Supply an existing lab env file, prefix and output directory');
const values = Object.fromEntries(readFileSync(envFile, 'utf8').split('\n').filter(line => line.includes('=') && !line.startsWith('#')).map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
const key = prefix + '_SPLUNK_';
const parsed = new URL(values[key + 'URL']);
const origin = parsed.protocol + '//' + parsed.hostname + ':' + (values[key + 'WEB_PORT'] || '8000');
const inference = process.argv.includes('--allow-provider-inference');
const browserTlsException = process.argv.includes('--browser-tls-exception') || values[key + 'VERIFY_TLS'] === 'false';
const browser = await chromium.launch({ channel: 'chrome', args: ['--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', ...(parsed.protocol === 'http:' ? ['--unsafely-treat-insecure-origin-as-secure=' + origin] : [])] });
const context = await browser.newContext({ ignoreHTTPSErrors: browserTlsException, viewport: { width: 1600, height: 1100 }, reducedMotion: 'reduce' });
const page = await context.newPage(); page.setDefaultTimeout(45000);
const receipt = { target: prefix, checks: [], page_error_count: 0, runtime_architecture: process.arch, browser_tls_exception: browserTlsException, lab_secure_origin_exception: parsed.protocol === 'http:', submitted_investigations: 0 };
const check = (name, passed) => { receipt.checks.push({ name, passed: !!passed }); console.log(name + ': ' + (passed ? 'passed' : 'FAILED')); };
const root = page.locator('#facility-operations-root');
const guide = page.getByRole('complementary', { name: 'Guided demo controls' });
const click = name => root.getByRole('button', { name, exact: true }).click();
page.on('pageerror', () => receipt.page_error_count++);
page.on('request', request => {
  if (!new URL(request.url()).pathname.endsWith('/facility_ops/agent')) return;
  const payload = JSON.parse(new URLSearchParams(request.postData() || '').get('payload') || '{}');
  if (payload.operation === 'start') receipt.submitted_investigations++;
});
page.on('response', async response => {
  if (!new URL(response.url()).pathname.endsWith('/facility-operations.js') || response.status() !== 200) return;
  const served = await response.body();
  const local = readFileSync('splunk_facility_operations/appserver/static/facility-operations.js');
  receipt.candidate_bundle_in_served_asset = served.includes(local);
  receipt.local_bundle_sha256 = createHash('sha256').update(local).digest('hex');
});
mkdirSync(output, { recursive: true });
try {
  await page.goto(origin + '/en-US/account/login', { waitUntil: 'domcontentloaded' });
  await page.locator('input[name=username]').fill(values[key + 'USERNAME']);
  await page.locator('input[name=password]').fill(values[key + 'PASSWORD']);
  await page.locator('input[type=submit],button[type=submit]').first().click();
  await page.waitForURL(url => !url.pathname.includes('/account/login'), { waitUntil: 'commit' });
  if (process.argv.includes('--bump')) {
    await page.goto(origin + '/en-US/_bump', { waitUntil: 'domcontentloaded' });
    const bumped = page.waitForResponse(response => response.url().includes('/_bump') && response.request().method() === 'POST');
    await page.locator('input[type=submit],button[type=submit]').first().click(); await bumped;
  }
  await page.goto(origin + '/en-US/app/splunk_facility_operations/facility_operations?vertical=retail&audience=executive&usecase=dependency', { waitUntil: 'commit' });
  await root.getByRole('button', { name: 'Start guided walkthrough', exact: true }).waitFor();
  const chrome = page.getByRole('banner').first();
  check('native_chrome_visible', await chrome.isVisible());
  check('default_demo_paused_at_baseline', await root.getByRole('button', { name: '1 Normal', exact: true }).getAttribute('aria-pressed') === 'true');
  await click('Start guided walkthrough');
  await expect(guide.getByRole('button', { name: 'Next: First signal', exact: true })).toBeEnabled();
  await expect(chrome).toBeInViewport(); check('guided_camera_preserves_native_chrome', true);
  check('baseline_highlight_in_view', await root.locator('.fo-guide-highlight').evaluate(element => { const r=element.getBoundingClientRect(); return r.top >= 70 && r.top < innerHeight/2; }));
  await guide.getByRole('button', { name: 'Next: First signal', exact: true }).click();
  await expect(guide.getByRole('button', { name: 'Next: Business impact', exact: true })).toBeEnabled();
  check('early_signal_explained', (await guide.innerText()).includes('4,200') && (await guide.innerText()).includes('3 business handoffs still'));
  await guide.getByRole('button', { name: 'Next: Business impact', exact: true }).click();
  await expect(guide).toContainText('2,286/2,472');
  check('business_impact_from_returned_data', true);
  check('highlight_and_arrow_visible', await root.locator('.fo-guide-highlight').isVisible() && await root.locator('.fo-guide-arrow').isVisible());
  await page.screenshot({ path: output + '/guided-impact.png', fullPage: false });
  await guide.getByRole('button', { name: 'Next: Dependency', exact: true }).click();
  await expect(guide.getByRole('button', { name: 'Next: Investigate', exact: true })).toBeEnabled();
  check('dependency_view_and_owner', page.url().endsWith('#dependencies') && (await guide.innerText()).includes('Identity engineering'));
  await guide.getByRole('button', { name: 'Next: Investigate', exact: true }).click();
  await expect(guide.getByRole('button', { name: 'Next: Decision', exact: true })).toBeEnabled();
  check('scoped_question_prepared', (await page.getByLabel('Ask about the current operational context').inputValue()).includes('query_events timeline'));
  check('no_automatic_inference', receipt.submitted_investigations === 0);
  const providerText = await root.locator('.fo-agent-provider').innerText();
  const connected = !providerText.includes('Deterministic demo assistant');
  if (!connected || inference) {
    await click('Investigate');
    if (connected) { await expect(guide.getByRole('button', { name: 'Next: Decision', exact: true })).toBeDisabled(); check('running_investigation_blocks_step_change', true); }
    await root.getByRole('button', { name: 'Export evidence', exact: true }).waitFor({ timeout: 190000 });
    const downloading = page.waitForEvent('download'); await click('Export evidence');
    const evidence = JSON.parse(readFileSync(await (await downloading).path(), 'utf8'));
    check('assistant_uses_guided_stage', evidence.scope.clock === 135 && evidence.scope.entity_id === 'identity' && evidence.knowledge.operational_facts.delivery.length === 3);
    check('assistant_chronology_bounded', evidence.results.some(result => result.kind === 'timeline' && result.rows.every(row => Number(row.phase) <= 3)));
    receipt.provider = evidence.provider; receipt.model = evidence.model;
    check('completed_investigation_reenables_navigation', await guide.getByRole('button', { name: 'Next: Decision', exact: true }).isEnabled());
    await page.screenshot({ path: output + '/guided-assistant.png', fullPage: false });
  }
  await guide.getByRole('button', { name: 'Next: Decision', exact: true }).click();
  await expect(guide.getByRole('button', { name: 'Next: Recover', exact: true })).toBeEnabled();
  check('decision_is_review_not_approval', (await guide.innerText()).includes('without approving or executing') && (await root.locator('.fo-guide-highlight').innerText()).includes('Confirm rollback'));
  await guide.getByRole('button', { name: 'Next: Recover', exact: true }).click();
  await expect(guide).toContainText('98.18%'); check('partial_recovery_distinguished', true);
  await guide.getByRole('button', { name: 'Next: Verify', exact: true }).click();
  await expect(guide).toContainText('99.92%');
  const downloading = page.waitForEvent('download'); await guide.getByRole('button', { name: 'Download story evidence', exact: true }).click();
  const story = JSON.parse(readFileSync(await (await downloading).path(), 'utf8'));
  check('story_export_retains_eight_visited_stages', story.synthetic && story.visited_steps.length === 8 && story.visited_steps.every(step => step.signals.length === 10 && step.signals.every(row => row.phase === step.phase)));
  await guide.getByRole('button', { name: 'Finish walkthrough', exact: true }).click();
  check('finish_removes_highlight_and_holds_stage', await guide.count() === 0 && await root.locator('.fo-guide-highlight,.fo-guide-arrow').count() === 0 && await root.getByRole('button', { name: '7 Verify', exact: true }).getAttribute('aria-pressed') === 'true');
  await click('Play continuous loop'); check('continuous_loop_still_available', await root.getByRole('button', { name: 'Pause', exact: true }).isVisible());
  check('candidate_asset_verified', receipt.candidate_bundle_in_served_asset);
  check('no_application_errors', receipt.page_error_count === 0);
} catch (error) {
  receipt.failure_type = error.name; receipt.failure_hint = error.message.split('\n')[0].replaceAll(origin, '[lab origin]');
  check('guided_native_workflow', false);
  try { await page.screenshot({path:output+'/failure.png',fullPage:false}); } catch {}
} finally {
  await context.close(); await browser.close(); writeFileSync(output+'/receipt.json',JSON.stringify(receipt,null,2)+'\n');
}
if (!receipt.checks.every(item => item.passed)) process.exitCode=1;
