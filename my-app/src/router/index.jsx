import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppShell from '../components/layout/AppShell';
import ProtectedRoute from '../components/common/ProtectedRoute';
import Dashboard from '../pages/Dashboard';
import LogInteraction from '../pages/LogInteraction';
import InteractionHistory from '../pages/InteractionHistory';
import DoctorProfile from '../pages/DoctorProfile';
import Login from '../pages/Auth/Login';
import Register from '../pages/Auth/Register';
import NotFound from '../pages/NotFound';

const router = createBrowserRouter([
  // ── Public routes ────────────────────────────────────────────────────────
  { path: '/login',    element: <Login /> },
  { path: '/register', element: <Register /> },

  // ── Protected routes ─────────────────────────────────────────────────────
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: '/',
        element: <AppShell />,
        children: [
          { index: true,         element: <Dashboard /> },
          { path: 'log',         element: <LogInteraction /> },
          { path: 'history',     element: <InteractionHistory /> },
          { path: 'doctors',     element: <Dashboard /> },
          { path: 'doctors/:id', element: <DoctorProfile /> },
        ],
      },
    ],
  },

  // ── Fallback ─────────────────────────────────────────────────────────────
  { path: '*', element: <NotFound /> },
]);

export default router;
