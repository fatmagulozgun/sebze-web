import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, Minus, PackageCheck, Plus, ShieldCheck, Trash2, Truck } from "lucide-react";
import api from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";
import { useUiStore } from "../stores/uiStore";

function unitLabel(item) {
  if (item?.customUnit) return item.customUnit;
  if (item?.unit === "KG") return "kg";
  if (item?.unit === "GRAM" || item?.unit === "GR") return "gr";
  if (item?.unit === "PIECE" || item?.unit === "ADET") return "adet";
  if (item?.unit === "PAKET") return "paket";
  if (item?.unit === "LT") return "lt";
  if (item?.unit === "ML") return "ml";
  return "kg";
}

function CartPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const items = useCartStore((state) => state.items);
  const addItem = useCartStore((state) => state.addItem);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const clearCart = useCartStore((state) => state.clearCart);
  const setToast = useUiStore((state) => state.setToast);
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState("");
  const [popularProducts, setPopularProducts] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );
  const itemCount = useMemo(() => items.reduce((sum, item) => sum + Number(item.quantity || 0), 0), [items]);
  const averageUnitPrice = itemCount > 0 ? subtotal / itemCount : 0;
  const suggestedProducts = useMemo(() => {
    const cartIds = new Set(items.map((item) => item.id));
    return popularProducts.filter((product) => !cartIds.has(product.id)).slice(0, 3);
  }, [items, popularProducts]);
  const shippingText = "Ücretsiz";
  const total = subtotal;

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 420);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const fetchPopularProducts = async () => {
      try {
        const { data } = await api.get("/products");
        const products = data?.data || [];
        const sorted = [...products].sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
        setPopularProducts(sorted);
      } catch (_error) {
        setPopularProducts([]);
      }
    };
    fetchPopularProducts();
  }, []);

  const handleQuantityChange = (item, nextValue) => {
    if (nextValue === "") return;

    const parsed = Number(nextValue);
    if (Number.isNaN(parsed)) return;
    if (parsed < 1) return;

    if (parsed > item.stock) {
      updateQuantity(item.id, item.stock);
      setToast(`Stokta kalmamıştır. En fazla ${item.stock} adet seçebilirsiniz.`, "error");
      return;
    }

    updateQuantity(item.id, parsed);
  };

  const createOrder = async () => {
    if (!user) {
      setToast("Sipariş vermek için giriş yapmalısın", "error");
      navigate("/");
      return;
    }
    if (items.length === 0) return;

    setSubmitting(true);
    try {
      await api.post("/orders", {
        items: items.map((item) => ({ productId: item.id, quantity: item.quantity })),
        note,
      });
      clearCart();
      setNote("");
      setToast("Siparişin oluşturuldu");
      navigate("/siparislerim");
    } catch (_error) {
      setToast("Sipariş oluşturulamadı", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-2xl bg-gray-50 p-4 sm:p-5">
      <h1 className="text-2xl font-semibold">Sepet</h1>
      {pageLoading ? (
        <div className="mt-4 grid gap-5 lg:grid-cols-3 lg:items-start">
          <div className="space-y-4 lg:col-span-2">
            <div className="h-5 w-44 animate-pulse rounded bg-gray-200" />
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 animate-pulse rounded-xl bg-gray-200" />
                    <div className="space-y-2">
                      <div className="h-5 w-36 animate-pulse rounded bg-gray-200" />
                      <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
                      <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
                    </div>
                  </div>
                  <div className="h-10 w-44 animate-pulse rounded-lg bg-gray-200" />
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="h-5 w-52 animate-pulse rounded bg-gray-200" />
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={`skel-suggest-${idx}`} className="rounded-xl border border-gray-200 p-3">
                    <div className="h-24 animate-pulse rounded-lg bg-gray-100" />
                    <div className="mt-2 h-4 w-20 animate-pulse rounded bg-gray-200" />
                    <div className="mt-1 h-3 w-14 animate-pulse rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
            <div className="mt-3 space-y-2">
              <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
            </div>
            <div className="mt-3 h-24 w-full animate-pulse rounded-lg bg-gray-100" />
            <div className="mt-3 h-12 w-full animate-pulse rounded-lg bg-gray-200" />
          </div>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-base font-semibold text-gray-900">🧺 Sepetin şu an boş</p>
          <p className="mt-2 text-sm text-gray-600">
            Henüz ürün eklemedin. Taze meyve ve sebzeleri keşfetmeye başla.
          </p>
          <Link
            to="/urunler"
            className="mt-4 inline-flex items-center rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 transition hover:bg-green-100"
          >
            Ürünleri keşfet
          </Link>

          {popularProducts.length > 0 ? (
            <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">Popüler ürünler</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {popularProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      addItem(product, 1);
                      setToast(`${product.name} sepete eklendi ✓`);
                    }}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-left transition hover:border-green-300 hover:bg-green-50"
                  >
                    <p className="truncate text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">{Number(product.price || 0).toFixed(2)} TL</p>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4 grid gap-5 lg:grid-cols-3 lg:items-start">
          <div className="space-y-4 lg:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <Link to="/urunler" className="inline-block text-sm font-medium text-green-700 hover:underline">
                Ürün eklemeye devam et
              </Link>
              <button
                type="button"
                onClick={clearCart}
                className="text-xs font-medium text-gray-500 transition hover:text-red-500 hover:underline"
              >
                Sepeti temizle
              </button>
            </div>
            {items.map((item) => (
              <article
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
              >
                <div className="flex min-w-0 items-center gap-4">
                  {item.imageUrl ? (
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-xl border border-gray-100 bg-gray-50 text-2xl">🥬</div>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate font-medium text-gray-900">{item.name}</h2>
                    <p className="text-sm text-gray-500">
                      Birim fiyat: {Number(item.price || 0).toFixed(2)} TL / {unitLabel(item)}
                    </p>
                   
                  </div>
                </div>
                <div className="flex-grow" />
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border border-gray-300">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(item, item.quantity - 1)}
                      className="inline-flex h-9 w-9 items-center justify-center text-gray-700 transition hover:bg-gray-100"
                      aria-label="Azalt"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="inline-flex min-w-10 items-center justify-center px-2 text-sm font-medium">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(item, item.quantity + 1)}
                      className="inline-flex h-9 w-9 items-center justify-center text-gray-700 transition hover:bg-gray-100"
                      aria-label="Artır"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-600 transition hover:bg-red-50"
                    aria-label="Ürünü sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}

            {suggestedProducts.length > 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h2 className="text-sm font-semibold text-gray-900">Yanina yakisacak urunler</h2>
                <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                  {suggestedProducts.map((product) => (
                    <button
                      key={product.id}
                      type="button"
                      onClick={() => {
                        addItem(product, 1);
                        setToast(`${product.name} sepete eklendi ✓`);
                      }}
                      className="w-52 shrink-0 rounded-xl border border-gray-200 bg-white p-3 text-left transition hover:border-green-300 hover:bg-green-50"
                    >
                      <div className="flex h-24 items-center justify-center overflow-hidden rounded-lg bg-gray-50">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-contain p-2" />
                        ) : (
                          <div className="text-xl">🥬</div>
                        )}
                      </div>
                      <p className="mt-2 truncate text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-500">{Number(product.price || 0).toFixed(2)} TL</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <Leaf className="h-4 w-4 text-green-600" />
                  Tarladan kapiniza
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <Truck className="h-4 w-4 text-green-600" />
                  Ayni gun teslimat
                </div>
                <div className="inline-flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
                  <ShieldCheck className="h-4 w-4 text-green-600" />
                  Guvenli alisveris
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
            <p className="text-xs uppercase tracking-wide text-gray-500">Sipariş Özeti</p>
            <div className="mt-3 space-y-2 text-sm">
              
              <div className="flex items-center justify-between text-gray-600">
                <span>Ara toplam</span>
                <span>{subtotal.toFixed(2)} TL</span>
              </div>
              <div className="flex items-center justify-between text-gray-600">
                <span>Kargo</span>
                <span>{shippingText}</span>
              </div>
              
              <div className="flex items-center justify-between border-t border-gray-100 pt-2 text-base font-semibold text-gray-900">
                <span>Toplam</span>
                <span>{total.toFixed(2)} TL</span>
              </div>
            </div>
            <div className="mt-3 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
              <PackageCheck className="h-3.5 w-3.5" />
              Siparisin guvenli odeme ile tamamlanir
            </div>
            <textarea
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Sipariş notu ekleyebilirsin (opsiyonel)"
              className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={submitting}
              onClick={createOrder}
              className="mt-3 h-12 w-full rounded-lg bg-green-700 px-4 text-base font-semibold text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
            >
              {submitting ? "Gönderiliyor..." : "Siparişi Tamamla"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default CartPage;
