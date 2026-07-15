import { configureStore } from '@reduxjs/toolkit';

import authReducer         from './slices/authSlice';
import interactionsReducer from './slices/interactionsSlice';
import chatReducer         from './slices/chatSlice';
import doctorsReducer      from './slices/doctorsSlice';
import loadingReducer      from './slices/loadingSlice';
import errorsReducer       from './slices/errorsSlice';

/**
 * Redux Store
 *
 * State tree:
 * ┌───────────────────────────────────────────────────────────────────┐
 * │  auth          – current user, login status, JWT lifecycle        │
 * │  interactions  – doctor-rep interaction records + filters/paging  │
 * │  chat          – AI assistant panel messages + open/typing state  │
 * │  doctors       – HCP directory, selected doctor, search/filters   │
 * │  loading       – key-based async operation loading flags          │
 * │  errors        – key-based error messages from any operation      │
 * └───────────────────────────────────────────────────────────────────┘
 */

const store = configureStore({
  reducer: {
    auth:         authReducer,
    interactions: interactionsReducer,
    chat:         chatReducer,
    doctors:      doctorsReducer,
    loading:      loadingReducer,
    errors:       errorsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActionPaths: [],
        ignoredPaths: [],
      },
    }),
  devTools: import.meta.env.DEV,
});

export default store;
