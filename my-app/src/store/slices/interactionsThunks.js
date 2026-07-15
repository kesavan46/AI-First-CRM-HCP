import { createAsyncThunk } from '@reduxjs/toolkit';
import interactionsService from '../../services/interactionsService';
import {
  setInteractions, addInteraction, updateInteraction,
  removeInteraction, setPagination,
} from './interactionsSlice';

/**
 * Interactions Thunks
 * All map to FastAPI /api/v1/interactions endpoints.
 * API pagination: skip / limit (not page / pageSize).
 */

// ── Fetch paginated list ──────────────────────────────────────────────────
export const fetchInteractionsThunk = createAsyncThunk(
  'interactions/fetchAll',
  async (params = {}, { dispatch, rejectWithValue }) => {
    try {
      // Convert page/pageSize → skip/limit for the API
      const { page = 0, pageSize = 20, ...rest } = params;
      const apiParams = { skip: page * pageSize, limit: pageSize, ...rest };

      const { data } = await interactionsService.getAll(apiParams);
      dispatch(setInteractions(data.items ?? data));
      dispatch(setPagination({ total: data.total ?? (data.items ?? data).length }));
      return data;
    } catch (err) {
      return rejectWithValue(err.message ?? 'Failed to load interactions.');
    }
  },
);

// ── Create ────────────────────────────────────────────────────────────────
export const createInteractionThunk = createAsyncThunk(
  'interactions/create',
  async (payload, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await interactionsService.create(payload);
      dispatch(addInteraction(data));
      return data;
    } catch (err) {
      return rejectWithValue(err.message ?? 'Failed to save interaction.');
    }
  },
);

// ── Update (PATCH — partial) ───────────────────────────────────────────────
export const updateInteractionThunk = createAsyncThunk(
  'interactions/update',
  async ({ id, payload }, { dispatch, rejectWithValue }) => {
    try {
      const { data } = await interactionsService.patch(id, payload);
      dispatch(updateInteraction(data));
      return data;
    } catch (err) {
      return rejectWithValue(err.message ?? 'Failed to update interaction.');
    }
  },
);

// ── Delete ────────────────────────────────────────────────────────────────
export const deleteInteractionThunk = createAsyncThunk(
  'interactions/delete',
  async (id, { dispatch, rejectWithValue }) => {
    try {
      await interactionsService.remove(id);
      dispatch(removeInteraction(id));
      return id;
    } catch (err) {
      return rejectWithValue(err.message ?? 'Failed to delete interaction.');
    }
  },
);
