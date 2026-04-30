import { useState } from 'react';
import ChatDialog from '../components/ChatDialog.jsx';
import ChatContext from './ChatContextContext.js';

/**
 * Provides chat dialog state and actions to children via context.
 * @param {{children: React.ReactNode}} props
 * @returns {JSX.Element}
 */
export function ChatProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [prefill, setPrefill] = useState(null);

  /**
   * Opens the chat dialog, optionally with initial context.
   * @param {any} initialContext
   */
  const openChat = (initialContext = null) => {
    setPrefill(initialContext);
    setOpen(true);
  };
  /**
   * Closes the chat dialog.
   */
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

/**
 * Custom hook to access chat dialog context.
 * @returns {JSX.Element}
 */

// Intentionally export only the provider from this file to keep fast-refresh happy.
