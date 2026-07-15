import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';

/**
 * Auth Slice
 *
 * State shape:
 *   user      – current user object or null
 *   status    – 'idle' | 'loading' | 'succeeded' | 'failed'
 *   error     – error message string or null
 *   isAuthenticated – derived: true when user is set
 */

// ── Thunks ────────────────────────────────────────────────────────────────

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const { data } = await authService.login(credentials);
      authService.persistTokens(data);
      const { data: user } = await authService.me();
      return user;
    } catch (err) {
      return rejectWithValue(err.message ?? 'Login failed.');
    }
  },
);

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      authService.clearSession();
    } catch (err) {
      authService.clearSession(); // always clear locally
      return rejectWithValue(err.message);
    }
  },
);

export const fetchMeThunk = createAsyncThunk(
  'auth/me',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await authService.me();
      return data;
    } catch (err) {
      return rejectWithValue(err.message ?? 'Session expired.');
    }
  },
);

// ── Slice ─────────────────────────────────────────────────────────────────

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user:            null,
    status:          'idle',   // 'idle' | 'loading' | 'succeeded' | 'failed'
    error:           null,
    isAuthenticated: false,
  },
  reducers: {
    // Manually clear session (e.g. token expiry handled in apiClient)
    clearAuth(state) {
      state.user            = null;
      state.isAuthenticated = false;
      state.status          = 'idle';
      state.error           = null;
    },
  },
  extraReducers: (builder) => {
    // ── login ──────────────────────────────────────────────────────
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = 'loading';
        state.error  = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.status          = 'succeeded';
        state.user            = action.payload;
        state.isAuthenticated = true;
        state.error           = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = 'failed';
        state.error  = action.payload ?? 'Login failed.';
      });

    // ── logout ─────────────────────────────────────────────────────
    builder
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user            = null;
        state.isAuthenticated = false;
        state.status          = 'idle';
        state.error           = null;
      });

    // ── me ─────────────────────────────────────────────────────────
    builder
      .addCase(fetchMeThunk.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(fetchMeThunk.fulfilled, (state, action) => {
        state.status          = 'succeeded';
        state.user            = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchMeThunk.rejected, (state) => {
        state.user            = null;
        state.isAuthenticated = false;
        state.status          = 'failed';
      });
  },
});

export const { clearAuth } = authSlice.actions;

// ── Selectors ──────────────────────────────────────────────────────────────
export const selectCurrentUser      = (state) => state.auth.user;
export const selectIsAuthenticated  = (state) => state.auth.isAuthenticated;
export const selectAuthStatus       = (state) => state.auth.status;
export const selectAuthError        = (state) => state.auth.error;
export const selectAuthLoading      = (state) => state.auth.status === 'loading';

export default authSlice.reducer;
