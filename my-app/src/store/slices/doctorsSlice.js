import { createSlice } from '@reduxjs/toolkit';

/**
 * Doctors Slice
 *
 * Manages the doctor/HCP (Healthcare Professional) directory.
 *
 * State shape:
 *   items      – array of doctor objects
 *   selected   – doctor currently being viewed on the profile page
 *   searchQuery – live search string for the doctor list
 *   filters    – specialty, territory, tier filters
 *   pagination – current page state for the doctor list
 */

const initialState = {
  items: [],
  selected: null,
  status: 'idle',   // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  searchQuery: '',
  filters: {
    specialty: null,
    territory: null,
    tier: null,        // 'A' | 'B' | 'C'
    isActive: true,
  },
  pagination: {
    page: 0,
    pageSize: 20,
    total: 0,
  },
};

const doctorsSlice = createSlice({
  name: 'doctors',
  initialState,
  reducers: {
    setDoctors(state, action) {
      state.items = action.payload;
    },

    addDoctor(state, action) {
      state.items.push(action.payload);
      state.pagination.total += 1;
    },

    updateDoctor(state, action) {
      const idx = state.items.findIndex((d) => d.id === action.payload.id);
      if (idx !== -1) state.items[idx] = action.payload;
      if (state.selected?.id === action.payload.id) {
        state.selected = action.payload;
      }
    },

    removeDoctor(state, action) {
      state.items = state.items.filter((d) => d.id !== action.payload);
      if (state.selected?.id === action.payload) state.selected = null;
      state.pagination.total = Math.max(0, state.pagination.total - 1);
    },

    setSelectedDoctor(state, action) {
      state.selected = action.payload;
    },

    clearSelectedDoctor(state) {
      state.selected = null;
    },

    setSearchQuery(state, action) {
      state.searchQuery = action.payload;
      state.pagination.page = 0; // reset to first page on new search
    },

    setDoctorFilters(state, action) {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 0;
    },

    clearDoctorFilters(state) {
      state.filters = initialState.filters;
    },

    setDoctorPagination(state, action) {
      state.pagination = { ...state.pagination, ...action.payload };
    },
  },
});

export const {
  setDoctors,
  addDoctor,
  updateDoctor,
  removeDoctor,
  setSelectedDoctor,
  clearSelectedDoctor,
  setSearchQuery,
  setDoctorFilters,
  clearDoctorFilters,
  setDoctorPagination,
} = doctorsSlice.actions;

// ── Selectors ──────────────────────────────────────────────────────────────
export const selectAllDoctors       = (state) => state.doctors.items;
export const selectSelectedDoctor   = (state) => state.doctors.selected;
export const selectDoctorSearchQuery = (state) => state.doctors.searchQuery;
export const selectDoctorFilters    = (state) => state.doctors.filters;
export const selectDoctorPagination = (state) => state.doctors.pagination;
export const selectDoctorsStatus    = (state) => state.doctors.status;
export const selectDoctorsError     = (state) => state.doctors.error;
export const selectDoctorsLoading   = (state) => state.doctors.status === 'loading';

export default doctorsSlice.reducer;
