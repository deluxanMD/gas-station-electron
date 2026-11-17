import React from 'react';
import ReactDOM from 'react-dom/client';
import '../assets/main.css';
import App from './App';
import { startSyncStatus } from '@/features/sync/init';

startSyncStatus();

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
