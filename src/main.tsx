import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { App } from './App';
import { useThemeStore } from './store/useThemeStore';

import { useAuthStore } from './store/useAuthStore';

const { user } = useAuthStore.getState();
if (!user?.mustChangePassword) {
  useThemeStore.getState().initTheme();
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
