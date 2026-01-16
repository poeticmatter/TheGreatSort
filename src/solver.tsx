import React from 'react';
import { createRoot } from 'react-dom/client';
import SolverApp from './SolverApp';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <React.StrictMode>
      <SolverApp />
    </React.StrictMode>
  );
}
