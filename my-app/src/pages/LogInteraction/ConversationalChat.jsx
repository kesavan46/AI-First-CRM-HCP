import { useState, useRef, useEffect } from 'react';
import {
  Box, Grid, TextField, IconButton, Typography,
  Paper, Avatar, CircularProgress, Button, Chip, Alert,
} from '@mui/material';
import SendIcon      from '@mui/icons-material/Send';
import SmartToyIcon  from '@mui/icons-material/SmartToy';
import PersonIcon    from '@mui/icons-material/Person';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearMessages, clearChatError,
  selectChatMessages, selectChatIsTyping, selectChatError,
} from '../../store/slices/chatSlice';
import { sendMessageThunk } from '../../store/slices/chatThunks';
import ExtractedFieldsEditor from './ExtractedFieldsEditor';

// ── Suggestion prompts shown on empty state ────────────────────────────────
const PROMPTS = [
  'I met Dr Ravi today at Apollo Hospitals',
  'Called Dr Sharma about DiabeCare — he was receptive',
  'Visited Dr Priya Nair, discussed NeuroPatch samples',
  'Email sent to Dr Vikram Singh with OncoPro literature',
];

// ── Chat bubble ────────────────────────────────────────────────────────────
const ChatBubble = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <Box sx={{
      display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start',
      mb: 1.5, gap: 1, alignItems: 'flex-end',
    }}>
      {!isUser && (
        <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main', mb: 0.5 }}>
          <SmartToyIcon sx={{ fontSize: 16 }} />
        </Avatar>
      )}
      <Paper elevation={0} sx={{
        maxWidth: '76%', px: 2, py: 1.25,
        bgcolor: isUser ? 'primary.main' : 'grey.100',
        color: isUser ? 'white' : 'text.primary',
        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
      }}>
        <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.content}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', mt: 0.5, textAlign: 'right', fontSize: '0.65rem' }}>
          {message.timestamp}
        </Typography>
      </Paper>
      {isUser && (
        <Avatar sx={{ width: 28, height: 28, bgcolor: 'secondary.main', mb: 0.5 }}>
          <PersonIcon sx={{ fontSize: 16 }} />
        </Avatar>
      )}
    </Box>
  );
};

// ── Typing indicator ───────────────────────────────────────────────────────
const TypingIndicator = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.main' }}>
      <SmartToyIcon sx={{ fontSize: 16 }} />
    </Avatar>
    <Paper elevation={0} sx={{ px: 2, py: 1.25, bgcolor: 'grey.100', borderRadius: '18px 18px 18px 4px' }}>
      <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center', height: 16 }}>
        {[0, 1, 2].map((i) => (
          <Box key={i} sx={{
            width: 7, height: 7, borderRadius: '50%', bgcolor: 'text.disabled',
            animation: 'bounce 1.2s infinite', animationDelay: `${i * 0.2}s`,
            '@keyframes bounce': {
              '0%, 80%, 100%': { transform: 'translateY(0)' },
              '40%': { transform: 'translateY(-6px)' },
            },
          }} />
        ))}
      </Box>
    </Paper>
  </Box>
);

// ── Main component ─────────────────────────────────────────────────────────
/**
 * ConversationalChat — Tab 2 of Log Interaction
 *
 * Flow:
 *  1. User types a natural-language description of an interaction
 *  2. sendMessageThunk → POST /chat/langgraph → returns { reply, extracted_fields }
 *  3. chatSlice stores the message + updates latestExtractedFields
 *  4. ExtractedFieldsEditor (right panel) reads latestExtractedFields from Redux
 *     and lets the user edit any field inline
 *  5. "Save Interaction" → onSave(fields)
 *  6. "Transfer to Form" → onTransfer(fields) → switches to Tab 1 pre-filled
 *
 * Props:
 *   onSave     – async (fields) => void
 *   onTransfer – (fields) => void
 */
const ConversationalChat = ({ onSave, onTransfer }) => {
  const dispatch   = useDispatch();
  const messages   = useSelector(selectChatMessages);
  const isTyping   = useSelector(selectChatIsTyping);
  const chatError  = useSelector(selectChatError);

  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');
    dispatch(sendMessageThunk({ content: text, context: null }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <Grid container spacing={2.5} sx={{ height: { md: 580 } }}>

      {/* ── Left col: chat thread + input ── */}
      <Grid item xs={12} md={7}
        sx={{ display: 'flex', flexDirection: 'column', height: { md: 580 } }}>

        {/* Message thread */}
        <Box sx={{
          flex: 1, overflow: 'auto', px: 2, py: 1.5,
          bgcolor: 'background.default', border: '1px solid', borderColor: 'divider',
          borderRadius: 2, mb: 1.5, minHeight: 320,
        }}>
          {/* Empty state */}
          {messages.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 5 }}>
              <SmartToyIcon sx={{ fontSize: 52, color: 'primary.light', mb: 1.5 }} />
              <Typography variant="body1" fontWeight={600} gutterBottom>
                Describe your interaction naturally
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5, maxWidth: 340, mx: 'auto' }}>
                Tell me who you visited, what you discussed, and how it went.
                The AI will extract structured fields automatically.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
                {PROMPTS.map((p) => (
                  <Chip key={p} label={p} size="small" variant="outlined"
                    onClick={() => setInput(p)}
                    sx={{ cursor: 'pointer', fontSize: '0.72rem',
                      '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.main' } }} />
                ))}
              </Box>
            </Box>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}
          {isTyping && <TypingIndicator />}
          <div ref={bottomRef} />
        </Box>

        {/* Error */}
        {chatError && (
          <Alert severity="error" onClose={() => dispatch(clearChatError())} sx={{ mb: 1.5 }}>
            {chatError}
          </Alert>
        )}

        {/* Input row */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth multiline maxRows={4}
            placeholder="e.g. I met Dr Ravi today at Apollo, discussed CardioPlus, he was receptive…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            inputProps={{ 'aria-label': 'chat message input' }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          />
          <IconButton
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
            aria-label="send message"
            sx={{
              bgcolor: 'primary.main', color: 'white', width: 46, height: 46,
              '&:hover': { bgcolor: 'primary.dark' },
              '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
            }}
          >
            {isTyping
              ? <CircularProgress size={20} color="inherit" />
              : <SendIcon />
            }
          </IconButton>
        </Box>

        {/* Clear */}
        {messages.length > 0 && (
          <Box sx={{ mt: 0.75, display: 'flex', justifyContent: 'flex-end' }}>
            <Button size="small" onClick={() => dispatch(clearMessages())}
              sx={{ color: 'text.secondary', fontSize: '0.72rem' }}>
              Clear conversation
            </Button>
          </Box>
        )}
      </Grid>

      {/* ── Right col: editable extracted fields ── */}
      <Grid item xs={12} md={5} sx={{ height: { md: 580 } }}>
        <ExtractedFieldsEditor onSave={onSave} onTransfer={onTransfer} />
      </Grid>

    </Grid>
  );
};

export default ConversationalChat;
