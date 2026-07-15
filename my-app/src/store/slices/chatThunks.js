import { createAsyncThunk } from '@reduxjs/toolkit';
import chatService from '../../services/chatService';
import {
  addMessage, setTyping, setChatError,
  selectChatMessages,
} from './chatSlice';

/**
 * normaliseExtractedFields
 *
 * LangGraph returns snake_case keys.
 * Convert to the camelCase shape used throughout the frontend.
 *
 * Backend shape → Frontend shape
 *   doctor_name      → doctorName
 *   hospital         → hospital
 *   date             → date
 *   interaction_type → interactionType
 *   product          → product
 *   notes            → notes
 *   follow_up        → followUp
 *   outcome          → outcome
 */
const normaliseExtractedFields = (raw) => {
  if (!raw) return null;
  return {
    doctorName:      raw.doctor_name      ?? raw.doctorName      ?? '',
    hospital:        raw.hospital                                 ?? '',
    date:            raw.date                                     ?? '',
    interactionType: raw.interaction_type ?? raw.interactionType  ?? '',
    product:         raw.product                                  ?? '',
    notes:           raw.notes                                    ?? '',
    followUp:        raw.follow_up        ?? raw.followUp         ?? '',
    outcome:         raw.outcome                                  ?? '',
  };
};

// ── sendMessageThunk ──────────────────────────────────────────────────────
/**
 * Sends the user's message to the LangGraph endpoint.
 *
 * Flow:
 *  1. Add user message to store (optimistic)
 *  2. Set typing indicator
 *  3. POST /chat/langgraph  { message, history, context }
 *  4. Parse response → { reply, extracted_fields }
 *  5. Normalise extracted_fields to camelCase
 *  6. Add assistant message with extractedFields attached
 *     → chatSlice.addMessage stores it AND updates latestExtractedFields
 *  7. On error → setChatError, stop typing
 */
export const sendMessageThunk = createAsyncThunk(
  'chat/sendMessage',
  async ({ content, context = null }, { dispatch, getState, rejectWithValue }) => {
    const ts = () =>
      new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Optimistically add user message
    dispatch(
      addMessage({ id: `user-${Date.now()}`, role: 'user', content, timestamp: ts() }),
    );

    // 2. Typing on
    dispatch(setTyping(true));

    try {
      // 3. Read current history AFTER adding the user message
      const history = selectChatMessages(getState());

      // 4. Call LangGraph
      const { data } = await chatService.sendToLangGraph({ message: content, history, context });

      // 5. Normalise fields
      const extractedFields = normaliseExtractedFields(data.extracted_fields);

      // 6. Add assistant message
      dispatch(setTyping(false));
      dispatch(
        addMessage({
          id:              `ai-${Date.now()}`,
          role:            'assistant',
          content:         data.reply ?? data.message ?? data.content ?? '',
          timestamp:       ts(),
          extractedFields, // stored on message + updates latestExtractedFields in slice
        }),
      );

      return { reply: data.reply, extractedFields };
    } catch (err) {
      dispatch(setTyping(false));
      dispatch(setChatError(err.message ?? 'AI assistant unavailable. Please try again.'));
      return rejectWithValue(err.message);
    }
  },
);

// ── fetchChatHistoryThunk ─────────────────────────────────────────────────
export const fetchChatHistoryThunk = createAsyncThunk(
  'chat/fetchHistory',
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await chatService.getHistory();
      return data;
    } catch (err) {
      return rejectWithValue(err.message ?? 'Failed to load chat history.');
    }
  },
);
