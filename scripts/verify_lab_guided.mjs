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
  const menuLefts = await root.getByRole('navigation', { name: 'Workspace views' }).locator('[data-test=label]').evaluateAll(labels => labels.map(label => label.getBoundingClientRect().left));
  check('sidebar_labels_share_left_alignment', menuLefts.length === 9 && Math.max(...menuLefts) - Math.min(...menuLefts) < 1);
  check('default_operations_story', await root.getByRole('region', { name: 'Operational story', exact: true }).isVisible());
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
  const explanation = guide.getByRole('region', { name: 'Incident story explanation', exact: true });
  check('what_why_when_from_returned_chronology', (await explanation.innerText()).includes('640 to 3,960') && (await explanation.innerText()).includes('T+00:45') && (await explanation.innerText()).includes('T+01:30'));
  await explanation.getByText('What was queried? · 2 searches', { exact: true }).click();
  check('executed_chronology_receipt_and_spl', (await explanation.innerText()).includes('Executed in Splunk · 30 returned rows') && (await explanation.locator('pre').last().textContent()).includes('where phase<=2'));
  await explanation.getByText('How was it addressed?', { exact: true }).click();
  check('no_future_response_before_intervention', (await explanation.innerText()).includes('No applied response has been returned'));
  await page.screenshot({ path: output + '/story-impact.png', fullPage: false });
  const canvasBounds = await root.locator('#facility-operations-main').boundingBox();
  const guideBounds = await guide.boundingBox();
  check('desktop_guide_has_reserved_column', guideBounds.x >= canvasBounds.x + canvasBounds.width - 2);
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
    check('new_runtime_carries_incident_source_fields', evidence.knowledge.operational_facts.diagnostics.some(row => row.entity_id === 'identity' && row.story_kind === 'investigation' && row.response_state === 'planned'));
    check('assistant_uses_guided_stage', evidence.scope.clock === 135 && evidence.scope.entity_id === 'identity' && evidence.knowledge.operational_facts.delivery.length === 3);
    check('assistant_chronology_bounded', evidence.results.some(result => result.kind === 'timeline' && result.rows.every(row => Number(row.phase) <= 3)));
    receipt.provider = evidence.provider; receipt.model = evidence.model;
    check('completed_investigation_reenables_navigation', await guide.getByRole('button', { name: 'Next: Decision', exact: true }).isEnabled());
    await expect.poll(() => root.locator('.fo-guide-arrow>path').evaluate(path => path.getBBox().y >= document.getElementById('facility-operations-main').getBoundingClientRect().top - 2)).toBe(true);
    check('long_response_arrow_stays_below_native_chrome', true);
    await guide.getByRole('button', { name: 'Show highlighted evidence', exact: true }).click();
    await page.screenshot({ path: output + '/guided-assistant.png', fullPage: false });
  }
  await guide.getByRole('button', { name: 'Next: Decision', exact: true }).click();
  await expect(guide.getByRole('button', { name: 'Next: Recover', exact: true })).toBeEnabled();
  check('audience_decision_has_relevant_evidence', (await root.getByLabel('Audience decision evidence').innerText()).includes('executive situation brief'));
  check('decision_is_review_not_approval', (await guide.innerText()).includes('without approving or executing') && (await root.locator('.fo-guide-highlight').innerText()).includes('Confirm rollback'));
  await guide.getByRole('button', { name: 'Next: Recover', exact: true }).click();
  await expect(guide).toContainText('98.18%'); check('partial_recovery_distinguished', true);
  check('authored_response_method_owner_reference', (await explanation.innerText()).includes('DEMO-RESPONSE-RETAIL-DEPENDENCY-005') && (await explanation.innerText()).includes('fictional team moves the client token route') && (await explanation.innerText()).includes('T+03:45'));
  await page.screenshot({ path: output + '/story-response.png', fullPage: false });
  await guide.getByRole('button', { name: 'Next: Verify', exact: true }).click();
  await expect(guide).toContainText('99.92%');
  const briefDownload = page.waitForEvent('download'); await guide.getByRole('button', { name: 'Download customer brief', exact: true }).click();
  const brief = readFileSync(await (await briefDownload).path(), 'utf8');
  check('readable_customer_brief_and_poc_requirements', brief.includes('99.92%') && brief.includes('Customer proof-of-concept requirements') && brief.includes('before measuring improvement'));
  if (!connected || inference) check('brief_retains_frozen_earlier_investigation', brief.includes('frozen earlier evidence') && brief.includes('replay clock 135'));
  const downloading = page.waitForEvent('download'); await guide.getByRole('button', { name: 'Download story evidence', exact: true }).click();
  const story = JSON.parse(readFileSync(await (await downloading).path(), 'utf8'));
  const verifyExplanation = story.visited_steps.find(step => step.step === 'verify').narrative;
  check('export_retains_explanations_queries_and_phase_boundaries', verifyExplanation.events.length === 7 && verifyExplanation.events.every(event => event.phase <= 6) && verifyExplanation.queries.some(query => query.label === 'Incident chronology' && query.rows === 70 && query.execution === 'splunk'));
  check('story_export_retains_eight_visited_stages', story.synthetic && story.visited_steps.length === 8 && story.visited_steps.every(step => step.signals.length === 10 && step.signals.every(row => row.phase === step.phase)));
  await guide.getByRole('button', { name: 'Finish walkthrough', exact: true }).click();
  check('finish_removes_highlight_and_holds_stage', await guide.count() === 0 && await root.locator('.fo-guide-highlight,.fo-guide-arrow').count() === 0 && await root.getByRole('button', { name: '7 Verify', exact: true }).getAttribute('aria-pressed') === 'true');
  if (!connected || inference) {
    await click('Return to investigation');
    const retainedDownload = page.waitForEvent('download'); await click('Export evidence');
    const retained = JSON.parse(readFileSync(await (await retainedDownload).path(), 'utf8'));
    check('investigation_export_survives_recovery_navigation', retained.scope.clock === 135);
  }
  const startsBeforeOverview = receipt.submitted_investigations;
  await click('Start three-minute overview');
  for (const label of ['Business impact', 'Dependency', 'Decision', 'Verify']) {
    await expect(guide.getByRole('button', { name: 'Next: ' + label, exact: true })).toBeEnabled();
    await guide.getByRole('button', { name: 'Next: ' + label, exact: true }).click();
  }
  await expect(guide.getByRole('button', { name: 'Finish walkthrough', exact: true })).toBeEnabled();
  check('short_overview_without_inference', (await guide.innerText()).includes('STEP 5 OF 5') && receipt.submitted_investigations === startsBeforeOverview);
  const overviewDownload = page.waitForEvent('download'); await guide.getByRole('button', { name: 'Download story evidence', exact: true }).click();
  const overview = JSON.parse(readFileSync(await (await overviewDownload).path(), 'utf8'));
  check('new_case_clears_old_findings_and_skipped_stages', overview.investigation === null && overview.decisions.length === 0 && overview.visited_steps.length === 5);
  await guide.getByRole('button', { name: 'Finish walkthrough', exact: true }).click();
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
