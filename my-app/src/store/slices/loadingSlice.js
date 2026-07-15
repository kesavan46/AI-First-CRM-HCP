import { createSlice } from '@reduxjs/toolkit';

/**
 * Loading Slice
 *
 * Tracks async operation states across the app using a key-based map.
 * Each key is a string identifier for a specific operation
 * (e.g. 'fetchInteractions', 'submitInteraction', 'fetchDoctors').
 *
 * State shape:
 *   keys – { [operationKey: string]: boolean }
 *
 * Usage:
 *   dispatch(startLoading('fetchInteractions'))
 *   dispatch(stopLoading('fetchInteractions'))
 *   useSelector(selectIsLoading('fetchInteractions'))
 */

const initialState = {
  keys: {},
};

const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    // Mark an operation as in-progress
    startLoading(state, action) {
      state.keys[action.payload] = true;
    },

    // Mark an operation as complete (success or failure)
    stopLoading(state, action) {
      delete state.keys[action.payload];
    },

    // Clear all loading states (e.g. on logout or hard reset)
    clearAllLoading(state) {
      state.keys = {};
    },
  },
});

export const { startLoading, stopLoading, clearAllLoading } = loadingSlice.actions;

// ── Selectors ──────────────────────────────────────────────────────────────

// Returns true if the specific operation key is loading
export const selectIsLoading = (key) => (state) =>
  Boolean(state.loading.keys[key]);

// Returns true if ANY operation is currently loading
export const selectAnyLoading = (state) =>
  Object.keys(state.loading.keys).length > 0;

// Returns the full loading keys map (useful for debugging)
export const selectLoadingKeys = (state) => state.loading.keys;

export default loadingSlice.reducer;
