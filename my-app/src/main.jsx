import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { ThemeProvider, CssBaseline } from '@mui/material';
import store from './store';
import theme from './theme';
import App from './App';

/**
 * Entry point
 *
 * Provider order (outer → inner):
 *   StrictMode        – highlights potential problems in dev
 *   Redux Provider    – makes the store available to all components
 *   MUI ThemeProvider – applies Inter font + colour palette globally
 *   CssBaseline       – MUI CSS reset (normalises browser defaults)
 *   App               – mounts the React Router
 */
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </Provider>
  </StrictMode>,
);
