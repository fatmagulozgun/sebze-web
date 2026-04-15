import { create } from "zustand";

const initialToken = localStorage.getItem("auth_token");
const initialUser = localStorage.getItem("auth_user");

export const useAuthStore = create((set) => ({
  token: initialToken || null,
  user: initialUser ? JSON.parse(initialUser) : null,
  setAuth: ({ token, user }) => {
    localStorage.setItem("auth_token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    set({ token: null, user: null });
  },
}));
