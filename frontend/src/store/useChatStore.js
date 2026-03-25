import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  messages: [], // Array of message objects { _id, sender_id, receiver_id, text?, encrypted_message?, ... }
  mode: 'SECURE', // 'SECURE' or 'PRIVATE'
  ws: null,
  adminPublicKey: null,

  setMode: (mode) => set({ mode }),
  setAdminPublicKey: (key) => set({ adminPublicKey: key }),

  addMessage: (msg) => set((state) => ({ messages: [...state.messages, msg] })),

  setMessages: (msgs) => set({ messages: msgs }),

  clearMessages: () => set({ messages: [] }),

  setWs: (ws) => set({ ws }),
}));

export default useChatStore;
