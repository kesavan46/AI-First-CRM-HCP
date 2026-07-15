import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import router from './router';
import { fetchMeThunk } from './store/slices/authSlice';
import { getAccessToken } from './services/apiClient';

/**
 * App
 *
 * Root component. Mounts the router and restores the user session
 * on every page load by calling GET /auth/me if a token exists in
 * localStorage. This prevents the user from being kicked to /login
 * after a browser refresh.
 */
const App = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // If a token is already stored, validate it against the backend
    // and hydrate the Redux auth state.
    if (getAccessToken()) {
      dispatch(fetchMeThunk());
    }
  }, [dispatch]);

  return <RouterProvider router={router} />;
};

export default App;
