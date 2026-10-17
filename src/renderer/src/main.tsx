import React from 'react';
import ReactDOM from 'react-dom/client';
import '../assets/main.css';
import App from './App';
import { ThemeProvider } from '@/components/ThemeProvider';

const rootElement = document.getElementById('root');

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </React.StrictMode>,
  );
}
