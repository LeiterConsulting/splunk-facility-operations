// Keep application classes separate from Splunk Web's global selectors.
export function uiClass(value: string): string {
  return value.split(/\s+/).filter(Boolean).map((name) => name.startsWith('fo-') ? name : 'fo-' + name).join(' ');
}
