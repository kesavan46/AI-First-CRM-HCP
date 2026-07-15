import { useState } from 'react';
import { Box, Toolbar } from '@mui/material';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar, { SIDEBAR_WIDTH } from './Sidebar';
import Navbar from './Navbar';
import AIChatPanel from './AIChatPanel';
import { GlobalLoadingBar } from '../common/LoadingStates';
import { GlobalErrorBanner } from '../common/ApiErrorBanner';
import ErrorBoundary from '../common/ErrorBoundary';

const PAGE_TITLES = {
  '/':          'Dashboard',
  '/log':       'Log Interaction',
  '/history':   'Interaction History',
  '/doctors':   'Doctor Profiles',
};

const AppShell = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const title =
    PAGE_TITLES[location.pathname] ??
    Object.entries(PAGE_TITLES).find(
      ([key]) => key !== '/' && location.pathname.startsWith(key),
    )?.[1] ??
    'MedCRM';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Global top-of-page loading bar */}
      <GlobalLoadingBar />

      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${SIDEBAR_WIDTH}px)` },
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Navbar onMenuClick={() => setMobileOpen(true)} title={title} />
        <Toolbar />

        <Box sx={{ flexGrow: 1, p: { xs: 2, sm: 3 } }}>
          {/* Global error banner — shows all Redux operation errors */}
          <GlobalErrorBanner />

          {/* Per-page content wrapped in a render-error boundary.
               key={location.pathname} resets the boundary on every navigation
               so a crash on one page doesn't bleed into the next. */}
          <ErrorBoundary key={location.pathname}>
            <Outlet />
          </ErrorBoundary>
        </Box>
      </Box>

      {/* AI Assistant slide-in panel — controlled by chatSlice.isOpen */}
      <AIChatPanel />
    </Box>
  );
};

export default AppShell;
