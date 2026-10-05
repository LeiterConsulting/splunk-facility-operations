import { audiences, verticals, usecases } from './catalogue';

export type Presentation = { audience: string; vertical: string; usecase: string };
export const PRESENTATION_KEY = 'facility-operations.presentation.v1';
const defaults: Presentation = { audience: 'operations', vertical: 'enterprise', usecase: 'dependency' };

export function loadPresentation(search: string, saved?: string | null): Presentation {
  let stored: Record<string, unknown> = {};
  try {
    const parsed: unknown = JSON.parse(saved || '{}');
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) stored = parsed as Record<string, unknown>;
  } catch { /* A damaged preference must not prevent the presentation from opening. */ }
  const params = new URLSearchParams(search);
  const choose = (key: keyof Presentation, choices: readonly { id: string }[]) => {
    const valid = (value: unknown): value is string => typeof value === 'string' && choices.some((item) => item.id === value);
    const linked = params.get(key);
    return valid(linked) ? linked : valid(stored[key]) ? stored[key] : defaults[key];
  };
  return { audience: choose('audience', audiences), vertical: choose('vertical', verticals), usecase: choose('usecase', usecases) };
}
