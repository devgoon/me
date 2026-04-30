import { createContext, useContext, useState } from 'react';
import ChatDialog from '../components/ChatDialog.jsx';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);

  const openChat = (initialContext = null) => {
    setPrefill(initialContext);
    setOpen(true);
  };
  const closeChat = () => {
    setOpen(false);
    // keep prefill in case user re-opens from navbar; clear if needed
    // setPrefill(null);
  };

  return (
    <ChatContext.Provider value={{ open, openChat, closeChat, prefill }}>
      {children}
      <ChatDialog open={open} onClose={closeChat} initialContext={prefill} />
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    // Provide a safe fallback for tests and non-provider usage.
    return {
      open: false,
      openChat: () => {},
      closeChat: () => {},
      prefill: null,
    };
  }
  return ctx;
}
