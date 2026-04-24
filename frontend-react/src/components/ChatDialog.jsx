import { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import { apiFetch } from '../lib/api.js';

const SUGGESTIONS = [
  'Do you have enterprise development experience?',
  'How do you use GitHub Copilot?',
  'What cloud platforms do you have experience with?',
  'Have you worked at scale?',
  'What roles are you looking for?',
];

const WELCOME_MESSAGE = {
  role: 'assistant',
  text: 'Ask me about strengths, hard lessons, leadership, or project outcomes.',
};

function renderMarkdown(text) {
  // Minimal markdown: bold and bullet lists
  const lines = text.split(/\r?\n/);
  const elements = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <Box component="ul" key={`list-${elements.length}`} sx={{ pl: 2, my: 0.5 }}>
          {listItems.map((item, i) => (
            <li key={i}>{applyInline(item)}</li>
          ))}
        </Box>
      );
      listItems = [];
    }
  };

  const applyInline = (str) => {
    const parts = str.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) =>
      i % 2 === 1 ? <strong key={i}>{part}</strong> : part
    );
  };

  lines.forEach((line, i) => {
    const listMatch = line.match(/^\s*-\s+(.*)/);
    if (listMatch) {
      listItems.push(listMatch[1]);
    } else {
      flushList();
      if (line.trim()) {
        elements.push(
          <Typography key={i} variant="body2" sx={{ lineHeight: 1.6, mb: 0.25 }}>
            {applyInline(line)}
          </Typography>
        );
      }
    }
  });
  flushList();

  return elements;
}

function ChatBubble({ message }) {
  const isUser = message.role === 'user';
  return (
    <Box
      sx={{
        maxWidth: '88%',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        bgcolor: isUser ? 'primary.main' : 'background.paper',
        color: isUser ? 'primary.contrastText' : 'text.primary',
        border: isUser ? 'none' : '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        px: 1.5,
        py: 1,
        fontSize: '0.9rem',
      }}
    >
      {message.typing ? (
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', py: 0.25 }}>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                bgcolor: 'text.disabled',
                animation: 'typing-bounce 1s infinite ease-in-out',
                animationDelay: `${i * 0.2}s`,
                '@keyframes typing-bounce': {
                  '0%, 80%, 100%': { transform: 'translateY(0)' },
                  '40%': { transform: 'translateY(-6px)' },
                },
              }}
            />
          ))}
        </Stack>
      ) : (
        renderMarkdown(message.text)
      )}
    </Box>
  );
}

function ChatDialog({ open, onClose }) {
  const [messages, setMessages] = useState([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const historyRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    if (historyRef.current) {
      historyRef.current.scrollTop = historyRef.current.scrollHeight;
    }
  }, [messages]);

  const sendPrompt = async (prompt) => {
    const text = (prompt || input).trim();
    if (!text || loading) return;

    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setLoading(true);
    setMessages((prev) => [...prev, { role: 'assistant', typing: true, text: '' }]);

    try {
      const response = await apiFetch(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text }),
        },
        { timeoutMs: 60000, maxAttempts: 1, baseDelay: 0 }
      );

      let answer = 'I could not generate a response right now.';
      if (response.ok) {
        const data = await response.json();
        if (data?.response) answer = data.response;
      } else {
        try {
          const err = await response.json();
          answer = err?.error
            ? `AI request failed: ${err.error}`
            : `AI request failed (${response.status})`;
        } catch {
          answer = `AI request failed (${response.status})`;
        }
      }

      setMessages((prev) => [
        ...prev.filter((m) => !m.typing),
        { role: 'assistant', text: answer },
      ]);
    } catch (error) {
      const msg =
        error?.name === 'AbortError'
          ? 'The AI service timed out. Please try again in a moment.'
          : `I am having trouble reaching the AI service right now. ${error?.message ?? ''}`.trim();
      setMessages((prev) => [
        ...prev.filter((m) => !m.typing),
        { role: 'assistant', text: msg },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendPrompt();
    }
    if (e.key === 'Escape') onClose();
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          style: { width: 'min(420px, 100vw)', display: 'flex', flexDirection: 'column' },
        },
      }}
    >
      {/* Header */}
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          flexShrink: 0,
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          Ask AI About Me
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="Close chat">
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* Chat History */}
      <Stack
        ref={historyRef}
        spacing={1.5}
        sx={{ flex: 1, overflowY: 'auto', p: 2 }}
        aria-live="polite"
      >
        {messages.map((msg, i) => (
          <ChatBubble key={i} message={msg} />
        ))}
      </Stack>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ px: 2, pb: 1, flexWrap: 'wrap', flexShrink: 0 }}
          useFlexGap
        >
          {SUGGESTIONS.map((s) => (
            <Button
              key={s}
              size="small"
              variant="outlined"
              onClick={() => sendPrompt(s)}
              disabled={loading}
              sx={{ fontSize: '0.75rem', textTransform: 'none', whiteSpace: 'nowrap' }}
            >
              {s}
            </Button>
          ))}
        </Stack>
      )}

      {/* Input Row */}
      <Box sx={{ px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider', flexShrink: 0 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Ask a question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoComplete="off"
          inputProps={{ 'aria-label': 'Ask AI' }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => sendPrompt()}
                  disabled={loading || !input.trim()}
                  size="small"
                  aria-label="Send message"
                >
                  {loading ? <CircularProgress size={16} /> : <SendIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Drawer>
  );
}

export default ChatDialog;
