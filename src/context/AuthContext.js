import { createContext } from 'react';

export const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  loginWithGoogle: async () => {},
  logout: async () => {},
});
