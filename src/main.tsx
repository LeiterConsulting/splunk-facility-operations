import React from 'react';
import { createRoot } from 'react-dom/client';
import SplunkThemeProvider from '@splunk/themes/SplunkThemeProvider';
import { App } from './App';
import './styles.css';

// Splunk owns the page, authentication, localization, and navigation. The same
// bundle can also mount in the explicitly labeled developer component preview.
declare global {
  interface Window {
    requirejs?: (modules: string[], ready: () => void) => void;
  }
}
function mount() {
  const root = document.getElementById('facility-operations-root');
  if (!root || root.dataset.mounted) return false;
  root.dataset.mounted = 'true';
  createRoot(root).render(<React.StrictMode><SplunkThemeProvider family="enterprise" colorScheme="light" density="comfortable"><App /></SplunkThemeProvider></React.StrictMode>);
  return true;
}
function mountWhenReady() {
  if (mount()) return;
  const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
if (window.requirejs) window.requirejs(['splunkjs/mvc/simplexml/ready!'], mountWhenReady);
else mountWhenReady();
