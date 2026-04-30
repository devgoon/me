import { createContext, useContext } from 'react';
/**
 * React context for chat dialog state and actions.
 * @type {import('react').Context<{open: boolean, openChat: Function, closeChat: Function, prefill: any}>}
 */
const ChatContext = createContext(null);
export default ChatContext;

/**
 * Custom hook to access chat dialog context.
 * @returns {{open: boolean, openChat: Function, closeChat: Function, prefill: any}}
 */
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
