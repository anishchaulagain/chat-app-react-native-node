import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import config from '../config';

const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  privateKey: null, // RSA private key loaded from secure storage
  isLoading: true,

  setPrivateKey: (key) => set({ privateKey: key }),

  login: async (email, password) => {
    try {
      const res = await axios.post(`${config.API_URL}/api/auth/login`, { email, password });
      const { token, _id, public_key } = res.data;
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify({ _id, email, public_key }));
      set({ token, user: { _id, email, public_key }, isLoading: false });
      return { success: true };
    } catch (err) {
      return { success: false, message: err.response?.data?.message || 'Login failed' };
    }
  },

  loadSession: async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      const userStr = await AsyncStorage.getItem('user');
      const privateKey = await AsyncStorage.getItem('privateKey');
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr), privateKey, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await AsyncStorage.multiRemove(['token', 'user', 'privateKey']);
    set({ token: null, user: null, privateKey: null });
  },
}));

export default useAuthStore;
