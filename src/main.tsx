import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { useThemeStore } from './store/useThemeStore';

// Применяем тему сразу при загрузке (из localStorage), не ждём авторизацию
useThemeStore.getState().initTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
