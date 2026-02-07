import React from 'react';
import ReactDOM from 'react-dom/client';
import '../animations.css';
import './index.css';
import App from './App';

import { AnalyticsService } from './services/analytics';

// Initialize Analytics
AnalyticsService.initialize();

// System Winks
if (import.meta.env.PROD) {
  console.log("%cUnauthorized access detected in System Logic. We see you.", "color: red; font-weight: bold;");
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);