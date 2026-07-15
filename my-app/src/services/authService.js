import apiClient, { setTokens, clearTokens } from './apiClient';

const authService = {
  /**
   * Login — POST /auth/login (JSON body)
   * Returns: { access_token, token_type, user }
   */
  login: ({ email, password }) =>
    apiClient.post('/auth/login', { email, password }),

  /**
   * Register — POST /auth/register (JSON body)
   * Returns: UserRead { id, email, full_name, role, is_active, created_at, updated_at }
   */
  register: ({ email, password, full_name, role = 'rep' }) =>
    apiClient.post('/auth/register', { email, password, full_name, role }),

  /**
   * Get current user — GET /auth/me
   */
  me: () => apiClient.get('/auth/me'),

  /** Logout — best-effort (no server endpoint yet) */
  logout: () => Promise.resolve(),

  /** Helper: persist tokens after successful login */
  persistTokens: (data) => setTokens(data.access_token, null),

  /** Helper: clear tokens on logout */
  clearSession: () => clearTokens(),
};

export default authService;
