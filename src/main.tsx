import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// The SPA rewrite serves index.html for any path; normalise "/processes" to "/#/processes" so the URL matches the view.
if (window.location.pathname !== '/') {
  const target = window.location.hash || `#${window.location.pathname.replace(/\/+$/, '')}`;
  window.history.replaceState(null, '', `/${target}`);
}

const container = document.getElementById('root');
if (!container) throw new Error('Root-Element #root fehlt in index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
