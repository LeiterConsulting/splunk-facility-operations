import React from 'react';
import { createRoot } from 'react-dom/client';
import SplunkThemeProvider from '@splunk/themes/SplunkThemeProvider';
import { App } from './App';
import './styles.css';
function mount() {
  const root = document.getElementById('facility-operations-root');
  if (!root || root.dataset.mounted) return false;
  root.dataset.mounted = 'true';
  createRoot(root).render(<React.StrictMode><SplunkThemeProvider family="enterprise" colorScheme="light" density="comfortable"><App /></SplunkThemeProvider></React.StrictMode>);
  return true;
}
if (!mount()) {
  const observer = new MutationObserver(() => { if (mount()) observer.disconnect(); });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
