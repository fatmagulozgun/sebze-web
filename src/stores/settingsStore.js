import { create } from "zustand";

const STORAGE_KEY = "app_settings";

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

const defaults = {
  shopName: "Sebzeci",
  lowStockThreshold: 5,
  profileImageDataUrl: null,
  profileImagesByUser: {},
  notifyNewOrder: true,
  notifyLowStock: true,
  notifyNewCustomer: true,
};

const initial = { ...defaults, ...(loadSettings() || {}) };

export const useSettingsStore = create((set) => ({
  ...initial,
  setSettings: (partial) =>
    set((prev) => {
      const next = { ...prev, ...partial };
      saveSettings({
        shopName: next.shopName,
        lowStockThreshold: next.lowStockThreshold,
        profileImageDataUrl: next.profileImageDataUrl,
        profileImagesByUser: next.profileImagesByUser,
        notifyNewOrder: next.notifyNewOrder,
        notifyLowStock: next.notifyLowStock,
        notifyNewCustomer: next.notifyNewCustomer,
      });
      return next;
    }),
  setProfileImageForUser: (userKey, dataUrl) =>
    set((prev) => {
      if (!userKey) return prev;
      const profileImagesByUser = { ...(prev.profileImagesByUser || {}) };
      if (dataUrl) profileImagesByUser[userKey] = dataUrl;
      else delete profileImagesByUser[userKey];
      const next = { ...prev, profileImagesByUser };
      saveSettings({
        shopName: next.shopName,
        lowStockThreshold: next.lowStockThreshold,
        profileImageDataUrl: next.profileImageDataUrl,
        profileImagesByUser: next.profileImagesByUser,
        notifyNewOrder: next.notifyNewOrder,
        notifyLowStock: next.notifyLowStock,
        notifyNewCustomer: next.notifyNewCustomer,
      });
      return next;
    }),
  resetSettings: () =>
    set(() => {
      saveSettings(defaults);
      return { ...defaults };
    }),
}));

