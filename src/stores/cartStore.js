import { create } from "zustand";

const initialCart = localStorage.getItem("cart_items");

export const useCartStore = create((set, get) => ({
  items: initialCart ? JSON.parse(initialCart) : [],
  addItem: (product, quantity = 1) => {
    const currentItems = get().items;
    const existing = currentItems.find((item) => item.id === product.id);

    let updatedItems;
    if (existing) {
      updatedItems = currentItems.map((item) =>
        item.id === product.id
          ? { ...item, quantity: Math.min(item.quantity + quantity, product.stock) }
          : item
      );
    } else {
      updatedItems = [...currentItems, { ...product, quantity: Math.min(quantity, product.stock) }];
    }

    localStorage.setItem("cart_items", JSON.stringify(updatedItems));
    set({ items: updatedItems });
  },
  updateQuantity: (productId, quantity) => {
    const updatedItems = get()
      .items.map((item) =>
        item.id === productId
          ? { ...item, quantity: Math.min(Math.max(quantity, 0), item.stock) }
          : item
      )
      .filter((item) => item.quantity > 0);
    localStorage.setItem("cart_items", JSON.stringify(updatedItems));
    set({ items: updatedItems });
  },
  removeItem: (productId) => {
    const updatedItems = get().items.filter((item) => item.id !== productId);
    localStorage.setItem("cart_items", JSON.stringify(updatedItems));
    set({ items: updatedItems });
  },
  clearCart: () => {
    localStorage.removeItem("cart_items");
    set({ items: [] });
  },
}));
