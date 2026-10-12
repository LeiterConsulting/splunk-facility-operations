import { test, expect, type Page } from '@playwright/test';
import { demoSnapshot } from '../../src/model';
import { assessOperations } from '../../src/intelligence';

async function installedAssistant(page: Page) {
  const now = Math.floor(Date.now() / 1000);
  const rows = demoSnapshot('retail', 'dependency', 90, now);
  const assessment = assessOperations(rows, now);
  const state = { complete: false, failed: false, cancelled: 0, starts: 0 };
  const html = await (await page.request.get('/')).body();
  await page.route('**/app/splunk_facility_operations/facility_operations*', (route) => route.fulfill({ contentType: 'text/html', body: html }));
  await page.route('**/facility_ops/settings*', (route) => route.fulfill({ json: { provider: 'openai', model: 'gpt-6-luna', reasoning_mode: 'adaptive', key_configured: true, can_configure: false, allow_live_llm: false } }));
  await page.route('**/search/jobs*', (route) => route.fulfill({ json: { results: rows } }));
  await page.route('**/facility_ops/agent*', async (route) => {
    const body = JSON.parse(new URLSearchParams(route.request().postData() ?? '').get('payload')!);
    if (body.operation === 'cancel') { state.cancelled++; return route.fulfill({ json: { status: 'cancelled' } }); }
    if (body.operation === 'start') state.starts++;
    const job = { job_id: 'test-job-' + state.starts, created_at: now, activities: [{ kind: 'search_done', at: now, search_kind: 'snapshot', rows: 10 }, { kind: 'model_start', at: now + 1, turn: 1, reasoning: 'high' }], assessment, partial: '### Checking returned evidence\n\nThe dependency hypothesis is being evaluated.' };
    if (state.failed) return route.fulfill({ json: { ...job, status: 'failed', error: 'The provider stream ended before completion. Retry after checking connectivity.' } });
    if (body.operation === 'start' || !state.complete) return route.fulfill({ status: body.operation === 'start' ? 202 : 200, json: { ...job, status: 'running' } });
    const answer = '## Decision summary\n\n**Two functions** need attention. Review [Shared identity](evidence:identity).\n\n- Validate `identity` with its owner.\n- Missing evidence stays unknown.\n\n| Component | State |\n| --- | --- |\n| Identity | Critical |\n\n```spl\n| stats count by owner\n```\n\n[Unreturned component](evidence:outside) [Unsafe](javascript:alert(1)) [External](https://example.invalid/)\n\n<img src="https://example.invalid/leak" onerror="alert(1)"><script>alert(1)</script>';
    await route.fulfill({ json: { ...job, status: 'completed', result: { answer, assessment, trace: [{ tool: 'query_events', mode: 'demo', rows: 10 }], results: [{ kind: 'snapshot', rows }, { kind: 'timeline', rows }], provider: 'openai', model: 'gpt-6-luna', mode: 'demo', generated_at: now, scope: { mode: 'demo', vertical: 'retail', usecase: 'dependency', audience: 'operations', clock: 90 } } } });
  });
  await page.goto('/app/splunk_facility_operations/facility_operations?vertical=retail&audience=operations&usecase=dependency&replay=loop#investigate');
  await page.getByLabel('Ask about the current operational context').fill('Investigate dependency impact');
  await page.getByRole('button', { name: 'Investigate', exact: true }).click();
  return state;
}

test('Progress, formatted answers and citations connect to retrieved evidence without executing model HTML', async ({ page }) => {
  const state = await installedAssistant(page);
  await expect(page.getByRole('region', { name: 'Response in progress' })).toContainText('dependency hypothesis');
  await expect(page.getByRole('status')).toContainText('Model call 1');
  await expect(page.getByLabel('Investigation activity', { exact: true })).toContainText('Retrieved 10 snapshot rows');
  await expect(page.getByRole('button', { name: 'Export evidence', exact: true })).toHaveCount(0);
  state.complete = true;
  await expect(page.getByRole('heading', { name: 'Decision summary', exact: true })).toBeVisible();
  await expect(page.locator('.fo-answer-markdown strong')).toContainText('Two functions');
  await expect(page.locator('.fo-answer-markdown table')).toContainText('Critical');
  await expect(page.locator('.fo-answer-markdown pre code')).toContainText('| stats count by owner');
  await expect(page.locator('.fo-answer-markdown img,.fo-answer-markdown script,.fo-answer-markdown a')).toHaveCount(0);
  await page.locator('.fo-answer-markdown').getByRole('button', { name: 'Shared identity', exact: true }).click();
  const citation = page.getByRole('region', { name: 'Cited component evidence' });
  await expect(citation).toContainText('Identity engineering');
  await expect(citation).toContainText('Frozen returned evidence');
  await page.getByText('Returned abnormal event sequence', { exact: false }).click();
  await expect(page.locator('.fo-answer-sequence ol')).toContainText('UTC');
  await page.getByRole('button', { name: 'Prepare counter-evidence question' }).click();
  await expect(page.getByLabel('Ask about the current operational context')).toHaveValue(/independent observations/);
  await expect(page.getByLabel('Ask about the current operational context')).toBeFocused();
});

test('Stop cancels server work and a context change cannot receive a late answer', async ({ page }) => {
  const state = await installedAssistant(page);
  await expect(page.getByRole('region', { name: 'Response in progress' })).toBeVisible();
  await page.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect.poll(() => state.cancelled).toBe(1);
  await expect(page.getByRole('alert')).toContainText('Investigation stopped');
  await page.getByLabel('Ask about the current operational context').fill('Investigate again');
  await page.getByRole('button', { name: 'Investigate', exact: true }).click();
  await expect.poll(() => state.starts).toBe(2);
  await page.getByRole('button', { name: 'Live', exact: true }).click();
  await expect.poll(() => state.cancelled).toBe(2);
  state.complete = true;
  await expect(page.getByRole('heading', { name: 'Decision summary', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export evidence', exact: true })).toHaveCount(0);
});

test('A failed provider stream clears unfinished text and exposes no completed report', async ({ page }) => {
  const state = await installedAssistant(page);
  await expect(page.getByRole('region', { name: 'Response in progress' })).toBeVisible();
  state.failed = true;
  await expect(page.getByRole('alert')).toContainText('stream ended before completion');
  await expect(page.getByRole('region', { name: 'Response in progress' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Export evidence', exact: true })).toHaveCount(0);
});
