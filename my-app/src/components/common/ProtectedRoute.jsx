import { Navigate, Outlet } from 'react-router-dom';
import { getAccessToken } from '../../services/apiClient';

/**
 * ProtectedRoute
 * Wraps all authenticated routes.
 * If no access token in localStorage → redirect to /login.
 */
const ProtectedRoute = () => {
  const token = getAccessToken();
  return token ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
