import apiClient from './apiClient';

/**
 * chatService
 *
 * Wraps all AI-assistant API calls.
 *
 * LangGraph endpoint contract
 * ───────────────────────────
 * POST /chat/langgraph
 *
 * Request body:
 * {
 *   message  : string          // latest user text
 *   history  : [               // full conversation so far (for context)
 *     { role: "user"|"assistant", content: string }
 *   ]
 *   context? : {               // optional CRM entity context
 *     type: "doctor"|"interaction"
 *     id  : string
 *   }
 * }
 *
 * Response body (FastAPI / LangGraph):
 * {
 *   reply            : string   // AI reply text
 *   extracted_fields : {        // fields parsed from the full conversation
 *     doctor_name?      : string
 *     hospital?         : string
 *     date?             : string   // ISO date "YYYY-MM-DD"
 *     interaction_type? : string
 *     product?          : string
 *     notes?            : string
 *     follow_up?        : string
 *     outcome?          : string
 *   } | null
 * }
 */

const chatService = {
  /**
   * Send a message to the LangGraph agent.
   * history is the full messages[] array from Redux chatSlice.
   */
  sendToLangGraph: ({ message, history = [], context = null }) =>
    apiClient.post('/chat/langgraph', {
      message,
      history: history
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content })),
      context,
    }),

  /** Legacy plain-chat endpoint (kept for non-LangGraph use). */
  sendMessage: (payload) => apiClient.post('/chat/message', payload),

  /** Fetch server-persisted conversation history. */
  getHistory: () => apiClient.get('/chat/history'),
};

export default chatService;
