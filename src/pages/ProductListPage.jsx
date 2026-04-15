import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, ShoppingCart } from "lucide-react";
import api from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";
import { useUiStore } from "../stores/uiStore";

function ProductListPage() {
  const [products, setProducts] = useState([]);
  const [allCategoryNames, setAllCategoryNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const requestIdRef = useRef(0);
  const addToCartTimerRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const addItem = useCartStore((state) => state.addItem);
  const setToast = useUiStore((state) => state.setToast);
  const isAdmin = useAuthStore((state) => state.user?.role === "ADMIN");
  const [addedProductId, setAddedProductId] = useState(null);

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "";
  const [searchInput, setSearchInput] = useState(search);

  useEffect(() => {
    const fetchProducts = async () => {
      const currentRequestId = ++requestIdRef.current;
      setLoading(true);
      try {
        const { data } = await api.get("/products", {
          params: {
            ...(search ? { search } : {}),
            ...(category ? { category } : {}),
          },
        });
        if (currentRequestId !== requestIdRef.current) return;
        setProducts(data.data || []);
      } finally {
        if (currentRequestId !== requestIdRef.current) return;
        setLoading(false);
      }
    };
    fetchProducts();
  }, [search, category]);

  useEffect(() => {
    const fetchAllCategories = async () => {
      try {
        const { data } = await api.get("/products");
        const names = (data.data || []).map((item) => item.category?.name).filter(Boolean);
        setAllCategoryNames([...new Set(names)]);
      } catch (_error) {
        // kategori yüklenemese bile ürün listesi akışı devam etsin
      }
    };
    fetchAllCategories();
  }, []);

  useEffect(() => {
    return () => {
      if (addToCartTimerRef.current) {
        clearTimeout(addToCartTimerRef.current);
      }
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setSearchInput(search);
  }, [search]);

  const categories = useMemo(() => allCategoryNames, [allCategoryNames]);
  const sortedProducts = useMemo(() => {
    const items = [...products];
    if (sort === "priceAsc") return items.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sort === "priceDesc") return items.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sort === "popular") return items.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
    return items;
  }, [products, sort]);

  const mobileCategoryEmoji = (name) => {
    const value = (name || "").toLowerCase();
    if (value.includes("meyve")) return "🍎";
    if (value.includes("sebze")) return "🥬";
    if (value.includes("patates")) return "🥔";
    return "🧺";
  };

  const handleAddToCart = (product) => {
    addItem(product, 1);
    setToast("Ürün sepete eklendi");
    setAddedProductId(product.id);
    if (addToCartTimerRef.current) clearTimeout(addToCartTimerRef.current);
    addToCartTimerRef.current = setTimeout(() => {
      setAddedProductId(null);
    }, 1500);
  };

  return (
    <section>
      <h1 className="text-2xl font-semibold">Ürün Listesi</h1>

      <div className="mt-4 flex flex-wrap gap-3">
        <input
          value={searchInput}
          placeholder="Ürün ara..."
          className="rounded-md border border-gray-300 px-3 py-2"
          onChange={(e) => {
            const next = e.target.value;
            setSearchInput(next);
            if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
            searchDebounceRef.current = setTimeout(() => {
              const value = next.trim();
              setSearchParams((prev) => {
                const params = new URLSearchParams(prev);
                if (value) params.set("search", value);
                else params.delete("search");
                return params;
              });
            }, 250);
          }}
        />
        <select
          value={category}
          className="rounded-md border border-gray-300 px-3 py-2"
          onChange={(e) => {
            const value = e.target.value;
            setSearchParams((prev) => {
              const params = new URLSearchParams(prev);
              if (value) params.set("category", value);
              else params.delete("category");
              return params;
            });
          }}
        >
          <option value="">Tüm Kategoriler</option>
          {categories.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
        <select
          value={sort}
          className="rounded-md border border-gray-300 px-3 py-2"
          onChange={(e) => {
            const value = e.target.value;
            setSearchParams((prev) => {
              const params = new URLSearchParams(prev);
              if (value) params.set("sort", value);
              else params.delete("sort");
              return params;
            });
          }}
        >
          <option value="">Sıralama</option>
          <option value="priceAsc">Fiyat artan</option>
          <option value="priceDesc">Fiyat azalan</option>
          <option value="popular">En popüler</option>
        </select>
      </div>

      <div className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 md:hidden">
        {categories.map((name) => {
          const isActive = category === name;
          return (
            <button
              key={name}
              type="button"
              onClick={() => {
                setSearchParams((prev) => {
                  const params = new URLSearchParams(prev);
                  if (isActive) params.delete("category");
                  else params.set("category", name);
                  return params;
                });
              }}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition ${
                isActive
                  ? "border-green-300 bg-green-50 font-medium text-green-800"
                  : "border-gray-200 bg-white text-gray-700"
              }`}
            >
              {mobileCategoryEmoji(name)} {name}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <article key={index} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="relative h-40 overflow-hidden rounded-lg bg-gray-200 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent" />
              <div className="mt-4 space-y-3">
                <div className="relative h-4 w-2/3 overflow-hidden rounded bg-gray-200 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent" />
                <div className="relative h-4 w-1/3 overflow-hidden rounded bg-gray-200 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent" />
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="relative h-9 overflow-hidden rounded-lg bg-gray-200 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent" />
                  <div className="relative h-9 overflow-hidden rounded-lg bg-gray-200 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent" />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedProducts.map((product, index) => (
            <article
              key={product.id}
              className="animate-[fadeSlideIn_360ms_ease-out_forwards] overflow-hidden rounded-xl border border-gray-200 bg-white p-4 opacity-0 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
            >
              <div className="flex h-40 w-full items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-green-50 to-white">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-40 w-full object-contain" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-white text-xl font-bold text-green-700 shadow-sm">
                      {(product.name || "?").slice(0, 1).toUpperCase()}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold">{product.name}</h2>
                    <p className="mt-1 text-sm text-gray-500">{product.category?.name || "Kategori yok"}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-semibold text-green-700">{Number(product.price || 0).toFixed(2)} TL</p>
                    <p className="text-xs text-gray-500">/kg</p>
                  </div>
                </div>

                <div className="mt-2">
                  {Number(product.stock || 0) > 0 ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Stok: Var
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                      Tükendi
                    </span>
                  )}
                </div>

                {product.description ? (
                  <p className="mt-3 line-clamp-2 text-sm text-gray-600">{product.description}</p>
                ) : (
                  <p className="mt-3 text-sm text-gray-400">Açıklama yok</p>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Link
                    to={`/urunler/${product.id}`}
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-800 transition hover:bg-gray-100"
                  >
                    Detay
                  </Link>
                  {!isAdmin ? (
                    <button
                      type="button"
                      className={`inline-flex items-center justify-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-white shadow-sm transition ${
                        addedProductId === product.id ? "bg-emerald-600" : "bg-green-700 hover:bg-green-800"
                      }`}
                      onClick={() => handleAddToCart(product)}
                    >
                      {addedProductId === product.id ? (
                        <>
                          <Check className="h-4 w-4" />
                          Sepete eklendi
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="h-4 w-4" />
                          Sepete ekle
                        </>
                      )}
                    </button>
                  ) : (
                    <div className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500">
                      Admin görünümü
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <style>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
}

export default ProductListPage;
