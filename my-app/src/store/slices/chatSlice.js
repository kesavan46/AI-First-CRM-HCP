import { createSlice } from '@reduxjs/toolkit';

/**
 * Chat Slice
 *
 * State shape:
 *   messages              – ordered array of message objects
 *                           { id, role, content, timestamp, extractedFields? }
 *   isOpen                – chat panel visible?
 *   isTyping              – AI generating a response?
 *   context               – CRM entity scope { type, id } or null
 *   error                 – last chat error string or null
 *   latestExtractedFields – the most recent extracted_fields object returned
 *                           by the LangGraph endpoint; updated after every
 *                           assistant reply that contains fields
 */

const EMPTY_FIELDS = {
  doctorName:      '',
  hospital:        '',
  date:            '',
  interactionType: '',
  product:         '',
  notes:           '',
  followUp:        '',
  outcome:         '',
};

const initialState = {
  messages:              [],
  isOpen:                false,
  isTyping:              false,
  context:               null,
  error:                 null,
  latestExtractedFields: { ...EMPTY_FIELDS },
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Append a message { id, role, content, timestamp, extractedFields? }
    addMessage(state, action) {
      state.messages.push(action.payload);
      // If this assistant message carries extracted fields, persist them
      if (
        action.payload.role === 'assistant' &&
        action.payload.extractedFields
      ) {
        state.latestExtractedFields = {
          ...EMPTY_FIELDS,
          ...action.payload.extractedFields,
        };
      }
    },

    setMessages(state, action) {
      state.messages = action.payload;
    },

    clearMessages(state) {
      state.messages              = [];
      state.error                 = null;
      state.latestExtractedFields = { ...EMPTY_FIELDS };
    },

    toggleChat(state) {
      state.isOpen = !state.isOpen;
    },
    setOpen(state, action) {
      state.isOpen = action.payload;
    },

    setTyping(state, action) {
      state.isTyping = action.payload;
    },

    setChatContext(state, action) {
      state.context = action.payload;
    },
    clearChatContext(state) {
      state.context = null;
    },

    setChatError(state, action) {
      state.error = action.payload;
    },
    clearChatError(state) {
      state.error = null;
    },

    // Allow the user to manually edit the extracted fields in the preview panel
    updateExtractedField(state, action) {
      const { field, value } = action.payload;
      state.latestExtractedFields[field] = value;
    },

    // Replace all extracted fields at once (e.g. after a new AI response)
    setExtractedFields(state, action) {
      state.latestExtractedFields = { ...EMPTY_FIELDS, ...action.payload };
    },

    clearExtractedFields(state) {
      state.latestExtractedFields = { ...EMPTY_FIELDS };
    },
  },
});

export const {
  addMessage,
  setMessages,
  clearMessages,
  toggleChat,
  setOpen,
  setTyping,
  setChatContext,
  clearChatContext,
  setChatError,
  clearChatError,
  updateExtractedField,
  setExtractedFields,
  clearExtractedFields,
} = chatSlice.actions;

// ── Selectors ──────────────────────────────────────────────────────────────
export const selectChatMessages          = (s) => s.chat.messages;
export const selectChatIsOpen            = (s) => s.chat.isOpen;
export const selectChatIsTyping          = (s) => s.chat.isTyping;
export const selectChatContext           = (s) => s.chat.context;
export const selectChatError             = (s) => s.chat.error;
export const selectLatestExtractedFields = (s) => s.chat.latestExtractedFields;

// True when at least one extracted field has a non-empty value
export const selectHasExtractedFields    = (s) =>
  Object.values(s.chat.latestExtractedFields).some((v) => v && v !== '');

export default chatSlice.reducer;
