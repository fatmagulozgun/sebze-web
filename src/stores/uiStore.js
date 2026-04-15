import { create } from "zustand";

export const useUiStore = create((set) => ({
  toast: null,
  setToast: (message, type = "success") => set({ toast: { message, type } }),
  clearToast: () => set({ toast: null }),
}));
