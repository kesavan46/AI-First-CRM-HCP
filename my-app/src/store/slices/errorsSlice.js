import { createSlice } from '@reduxjs/toolkit';

/**
 * Errors Slice
 *
 * Centralised error bus for the application.
 * Errors are stored in a key-based map so each feature can own its error
 * independently without clobbering other features.
 *
 * State shape:
 *   keys – { [errorKey: string]: { message: string, code?: string|number, detail?: any } }
 *
 * Usage:
 *   dispatch(setError({ key: 'fetchInteractions', message: 'Network error' }))
 *   dispatch(clearError('fetchInteractions'))
 *   useSelector(selectError('fetchInteractions'))
 */

const initialState = {
  keys: {},
};

const errorsSlice = createSlice({
  name: 'errors',
  initialState,
  reducers: {
    // Set an error for a given key
    setError(state, action) {
      const { key, message, code, detail } = action.payload;
      state.keys[key] = { message, code: code ?? null, detail: detail ?? null };
    },

    // Clear a single error by key
    clearError(state, action) {
      delete state.keys[action.payload];
    },

    // Clear all errors (e.g. on logout or navigation)
    clearAllErrors(state) {
      state.keys = {};
    },
  },
});

export const { setError, clearError, clearAllErrors } = errorsSlice.actions;

// ── Selectors ──────────────────────────────────────────────────────────────

// Returns the error object for a specific key, or null
export const selectError = (key) => (state) =>
  state.errors.keys[key] ?? null;

// Returns true if there is any active error anywhere in the app
export const selectHasAnyError = (state) =>
  Object.keys(state.errors.keys).length > 0;

// Returns all error keys (useful for a global error banner)
export const selectAllErrors = (state) => state.errors.keys;

export default errorsSlice.reducer;
