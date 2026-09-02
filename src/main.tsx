import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const root = createRoot(document.getElementById('root')!, {
  onUncaughtError: (error: any) => {
    if (
      !error ||
      error.name === 'AbortError' ||
      error.message?.includes('aborted') ||
      error.message?.includes('ResizeObserver')
    ) {
      return;
    }
    console.warn('React uncaught error:', error.message || error);
  },
  onCaughtError: (error: any) => {
    if (
      !error ||
      error.name === 'AbortError' ||
      error.message?.includes('aborted') ||
      error.message?.includes('ResizeObserver')
    ) {
      return;
    }
    console.warn('React caught error:', error.message || error);
  },
});

root.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
