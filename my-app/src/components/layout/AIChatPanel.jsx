import { useState, useRef, useEffect } from 'react';
import {
  Drawer, Box, Typography, IconButton, Divider,
  TextField, Avatar, Paper, CircularProgress,
  Alert, Button, Chip, Tooltip, Stack,
} from '@mui/material';
import CloseIcon     from '@mui/icons-material/Close';
import SendIcon      from '@mui/icons-material/Send';
import SmartToyIcon  from '@mui/icons-material/SmartToy';
import PersonIcon    from '@mui/icons-material/Person';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectChatMessages,
  selectChatIsOpen,
  selectChatIsTyping,
  selectChatError,
  setOpen,
  clearMessages,
  clearChatError,
} from '../../store/slices/chatSlice';
import { sendMessageThunk } from '../../store/slices/chatThunks';

const DRAWER_WIDTH = 380;

const PROMPTS = [
  'I visited Dr Ravi today at Apollo',
  'Show my recent interactions',
  'Any follow-ups due this week?',
  'What do I know about Dr Mehta?',
];

// ── Chat bubble ────────────────────────────────────────────────────────────
const ChatBubble = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <Box sx={{
      display: 'flex',
      justifyContent: isUser ? 'flex-end' : 'flex-start',
      mb: 1.5, gap: 1, alignItems: 'flex-end',
    }}>
      {!isUser && (
        <Avatar sx={{ width: 26, height: 26, bgcolor: 'primary.main', mb: 0.5, flexShrink: 0 }}>
          <SmartToyIcon sx={{ fontSize: 14 }} />
        </Avatar>
      )}
      <Paper elevation={0} sx={{
        maxWidth: '80%', px: 1.75, py: 1,
        bgcolor: isUser ? 'primary.main' : 'grey.100',
        color:   isUser ? 'white' : 'text.primary',
        borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
      }}>
        <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '0.82rem' }}>
          {message.content}
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.55, display: 'block', mt: 0.25, textAlign: 'right', fontSize: '0.62rem' }}>
          {message.timestamp}
        </Typography>
      </Paper>
      {isUser && (
        <Avatar sx={{ width: 26, height: 26, bgcolor: 'secondary.main', mb: 0.5, flexShrink: 0 }}>
          <PersonIcon sx={{ fontSize: 14 }} />
        </Avatar>
      )}
    </Box>
  );
};

// ── Typing dots ────────────────────────────────────────────────────────────
const TypingIndicator = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
    <Avatar sx={{ width: 26, height: 26, bgcolor: 'primary.main' }}>
      <SmartToyIcon sx={{ fontSize: 14 }} />
    </Avatar>
    <Paper elevation={0} sx={{ px: 1.75, py: 1, bgcolor: 'grey.100', borderRadius: '16px 16px 16px 4px' }}>
      <Box sx={{ display: 'flex', gap: '4px', alignItems: 'center', height: 14 }}>
        {[0, 1, 2].map((i) => (
          <Box key={i} sx={{
            width: 6, height: 6, borderRadius: '50%', bgcolor: 'text.disabled',
            animation: 'bounce 1.2s infinite',
            animationDelay: `${i * 0.2}s`,
            '@keyframes bounce': {
              '0%, 80%, 100%': { transform: 'translateY(0)' },
              '40%':           { transform: 'translateY(-5px)' },
            },
          }} />
        ))}
      </Box>
    </Paper>
  </Box>
);

// ── Main panel ─────────────────────────────────────────────────────────────
const AIChatPanel = () => {
  const dispatch  = useDispatch();
  const messages  = useSelector(selectChatMessages);
  const isOpen    = useSelector(selectChatIsOpen);
  const isTyping  = useSelector(selectChatIsTyping);
  const chatError = useSelector(selectChatError);

  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const send = () => {
    const text = input.trim();
    if (!text || isTyping) return;
    setInput('');
    dispatch(sendMessageThunk({ content: text, context: null }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={() => dispatch(setOpen(false))}
      variant="temporary"
      ModalProps={{ keepMounted: true }}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 2,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          maxWidth: '100vw',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        },
      }}
    >
      {/* ── Header ── */}
      <Box sx={{
        px: 2, py: 1.5,
        display: 'flex', alignItems: 'center', gap: 1.5,
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: 'primary.main',
      }}>
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.dark' }}>
          <SmartToyIcon fontSize="small" />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} color="white">
            AI Assistant
          </Typography>
          <Typography variant="caption" sx={{ color: 'primary.light', fontSize: '0.68rem' }}>
            Powered by LangGraph + Groq
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          {messages.length > 0 && (
            <Tooltip title="Clear conversation">
              <IconButton size="small" onClick={() => dispatch(clearMessages())}
                sx={{ color: 'white', opacity: 0.8, '&:hover': { opacity: 1 } }}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Close">
            <IconButton size="small" onClick={() => dispatch(setOpen(false))}
              aria-label="close AI assistant"
              sx={{ color: 'white', opacity: 0.8, '&:hover': { opacity: 1 } }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ── Messages ── */}
      <Box sx={{
        flex: 1, overflowY: 'auto',
        px: 1.5, py: 2,
        bgcolor: 'background.default',
      }}>
        {/* Empty state */}
        {messages.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <SmartToyIcon sx={{ fontSize: 44, color: 'primary.light', mb: 1.5 }} />
            <Typography variant="body2" fontWeight={600} gutterBottom>
              How can I help you?
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2.5 }}>
              Log interactions, check history, or ask about a doctor.
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', justifyContent: 'center' }}>
              {PROMPTS.map((p) => (
                <Chip key={p} label={p} size="small" variant="outlined"
                  onClick={() => setInput(p)}
                  sx={{ cursor: 'pointer', fontSize: '0.7rem',
                    '&:hover': { bgcolor: 'primary.50', borderColor: 'primary.main' } }}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Conversation */}
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}

        {isTyping && <TypingIndicator />}
        <div ref={bottomRef} />
      </Box>

      {/* ── Error ── */}
      {chatError && (
        <Box sx={{ px: 1.5, pt: 1 }}>
          <Alert severity="error" onClose={() => dispatch(clearChatError())} sx={{ fontSize: '0.75rem', py: 0.5 }}>
            {chatError}
          </Alert>
        </Box>
      )}

      <Divider />

      {/* ── Input ── */}
      <Box sx={{ px: 1.5, py: 1.5, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            size="small"
            placeholder="Ask me anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            inputProps={{ 'aria-label': 'AI chat input' }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3, fontSize: '0.85rem' } }}
          />
          <IconButton
            onClick={send}
            disabled={!input.trim() || isTyping}
            aria-label="send message"
            sx={{
              bgcolor: 'primary.main', color: 'white',
              width: 38, height: 38, flexShrink: 0,
              '&:hover': { bgcolor: 'primary.dark' },
              '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
            }}
          >
            {isTyping
              ? <CircularProgress size={16} color="inherit" />
              : <SendIcon fontSize="small" />
            }
          </IconButton>
        </Box>
        <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mt: 0.75, textAlign: 'center' }}>
          Press Enter to send · Shift+Enter for new line
        </Typography>
      </Box>
    </Drawer>
  );
};

export default AIChatPanel;
