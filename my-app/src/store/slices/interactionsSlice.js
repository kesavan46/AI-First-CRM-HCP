import { createSlice } from '@reduxjs/toolkit';

/**
 * Interactions Slice
 *
 * Manages all doctor-rep interaction records.
 *
 * State shape:
 *   items       – array of interaction objects (the master list)
 *   selected    – single interaction object currently being viewed/edited
 *   filters     – active filter criteria applied to the list view
 *   pagination  – current page + page size for the history table
 */

const initialState = {
  items: [],
  selected: null,
  status: 'idle',   // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  filters: {
    doctorId: null,
    type: null,       // 'visit' | 'call' | 'email' | 'event'
    dateFrom: null,
    dateTo: null,
    outcome: null,    // 'positive' | 'neutral' | 'negative'
  },
  pagination: {
    page: 0,
    pageSize: 10,
    total: 0,
  },
};

const interactionsSlice = createSlice({
  name: 'interactions',
  initialState,
  reducers: {
    // Replace the entire list (e.g. after a fresh fetch)
    setInteractions(state, action) {
      state.items = action.payload;
    },

    // Append a newly created interaction to the list
    addInteraction(state, action) {
      state.items.unshift(action.payload); // newest first
      state.pagination.total += 1;
    },

    // Replace a single interaction in the list (after edit)
    updateInteraction(state, action) {
      const idx = state.items.findIndex((i) => i.id === action.payload.id);
      if (idx !== -1) state.items[idx] = action.payload;
      if (state.selected?.id === action.payload.id) {
        state.selected = action.payload;
      }
    },

    // Remove an interaction by id
    removeInteraction(state, action) {
      state.items = state.items.filter((i) => i.id !== action.payload);
      if (state.selected?.id === action.payload) state.selected = null;
      state.pagination.total = Math.max(0, state.pagination.total - 1);
    },

    // Set the interaction being viewed in the detail/edit view
    setSelectedInteraction(state, action) {
      state.selected = action.payload;
    },

    // Update one or more filter fields
    setFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
    },

    // Reset all filters to their defaults
    clearFilters(state) {
      state.filters = initialState.filters;
    },

    // Update pagination (page or pageSize changes)
    setPagination(state, action) {
      state.pagination = { ...state.pagination, ...action.payload };
    },
  },
});

export const {
  setInteractions,
  addInteraction,
  updateInteraction,
  removeInteraction,
  setSelectedInteraction,
  setFilters,
  clearFilters,
  setPagination,
} = interactionsSlice.actions;

// ── Extra reducers wired in after thunks are defined ──────────────────────
// Import lazily to avoid circular deps — thunks import from this slice.
// We patch extraReducers by adding a separate builder in store/index.js.
// Alternatively handled by the status field updated directly in pages.

// ── Selectors ──────────────────────────────────────────────────────────────
export const selectAllInteractions      = (state) => state.interactions.items;
export const selectSelectedInteraction  = (state) => state.interactions.selected;
export const selectInteractionFilters   = (state) => state.interactions.filters;
export const selectInteractionPagination = (state) => state.interactions.pagination;
export const selectInteractionsStatus   = (state) => state.interactions.status;
export const selectInteractionsError    = (state) => state.interactions.error;
export const selectInteractionsLoading  = (state) => state.interactions.status === 'loading';

export default interactionsSlice.reducer;
