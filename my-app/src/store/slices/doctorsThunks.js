import { createAsyncThunk } from '@reduxjs/toolkit';
import doctorsService from '../../services/doctorsService';
import {
  setDoctors, setSelectedDoctor, setDoctorPagination,
} from './doctorsSlice';
import { setInteractions, setPagination } from './interactionsSlice';

/**
 * Doctors Thunks
 */

// ── Fetch paginated + filtered list ──────────────────────────────────────
export const fetchDoctorsThunk = createAsyncThunk(
  'doctors/fetchAll',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await doctorsService.getAll(params);
      const items = data.items ?? data;
      const total = data.total ?? items.length;
      dispatch(setDoctors(items));
      dispatch(setDoctorPagination({ total }));
      return { items, total };
    } catch (err) {
      return rejectWithValue(err.message ?? 'Failed to load doctors.');
    }
  },
);

// ── Fetch a single doctor by id ───────────────────────────────────────────
export const fetchDoctorByIdThunk = createAsyncThunk(
  'doctors/fetchById',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await doctorsService.getById(id);
      dispatch(setSelectedDoctor(data));
      return data;
    } catch (err) {
      return rejectWithValue(err.message ?? 'Failed to load doctor profile.');
    }
  },
);

// ── Fetch interactions that belong to a doctor ────────────────────────────
export const fetchDoctorInteractionsThunk = createAsyncThunk(
  'doctors/fetchInteractions',
  async ({ id, params = {} }, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await doctorsService.getInteractions(id, params);
      const items = data.items ?? data;
      const total = data.total ?? items.length;
      dispatch(setInteractions(items));
      dispatch(setPagination({ total }));
      return { items, total };
    } catch (err) {
      return rejectWithValue(err.message ?? 'Failed to load doctor interactions.');
    }
  },
);
