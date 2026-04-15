import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  Heart,
  Leaf,
  Minus,
  Package,
  Plus,
  Scale,
  ShoppingBag,
  Sparkles,
  Tag,
} from "lucide-react";
import api from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";
import { useUiStore } from "../stores/uiStore";

const RECENT_VIEWED_PRODUCTS_KEY = "recent_viewed_products_v1";
const TABS = [
  { key: "description", label: "Ürün Açıklaması" },
  { key: "nutrition", label: "Besin Değerleri" },
  { key: "storage", label: "Saklama Koşulları" },
];

function unitLabel(product) {
  if (product?.customUnit) return product.customUnit;
  if (product?.unit === "KG") return "kg";
  if (product?.unit === "GRAM" || product?.unit === "GR") return "gr";
  if (product?.unit === "PIECE" || product?.unit === "ADET") return "adet";
  if (product?.unit === "PAKET") return "paket";
  if (product?.unit === "LT") return "lt";
  if (product?.unit === "ML") return "ml";
  return "kg";
}

function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeTab, setActiveTab] = useState("description");
  const [isFavorite, setIsFavorite] = useState(false);
  const similarScrollRef = useRef(null);
  const addItem = useCartStore((state) => state.addItem);
  const setToast = useUiStore((state) => state.setToast);
  const isAdmin = useAuthStore((state) => state.user?.role === "ADMIN");

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/products");
        const list = data?.data || [];
        setProducts(list);
        const current = list.find((item) => item.id === id) || null;
        setProduct(current);
      } catch (_error) {
        setProduct(null);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [id]);

  useEffect(() => {
    if (!product) return;
    setActiveImageIdx(0);
    setQuantity(1);
  }, [product?.id]);

  useEffect(() => {
    if (!product || isAdmin) return;
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_VIEWED_PRODUCTS_KEY) || "[]");
      const list = Array.isArray(saved) ? saved.filter((item) => item !== product.id) : [];
      const next = [product.id, ...list].slice(0, 12);
      localStorage.setItem(RECENT_VIEWED_PRODUCTS_KEY, JSON.stringify(next));
    } catch (_error) {
      localStorage.setItem(RECENT_VIEWED_PRODUCTS_KEY, JSON.stringify([product.id]));
    }
  }, [isAdmin, product]);

  const galleryImages = useMemo(() => {
    if (!product) return [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      return product.images.filter(Boolean);
    }
    if (product.imageUrl) return [product.imageUrl];
    return [];
  }, [product]);

  const selectedImage = galleryImages[activeImageIdx] || null;
  const categoryName = product?.category?.name || "Kategori";
  const unit = unitLabel(product);
  const isInStock = Number(product?.stock || 0) > 0;
  const stockCount = Number(product?.stock || 0);
  const isLowStock = isInStock && stockCount <= 10;

  const badges = useMemo(() => {
    const tags = [];
    if (categoryName.toLowerCase().includes("meyve")) tags.push({ label: "Yerli Uretim", Icon: Tag });
    if (categoryName.toLowerCase().includes("sebze")) tags.push({ label: "Organik", Icon: Leaf });
    tags.push({ label: "%100 Dogal", Icon: Sparkles });
    return tags.slice(0, 3);
  }, [categoryName]);

  const similarProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((item) => item.id !== product.id && item.category?.name === product.category?.name)
      .slice(0, 10);
  }, [product, products]);

  const decrementQty = () => setQuantity((prev) => Math.max(1, prev - 1));
  const incrementQty = () => setQuantity((prev) => Math.min(Number(product?.stock || 1), prev + 1));

  const addToCart = () => {
    if (!product || !isInStock) return;
    addItem(product, quantity);
    setAdded(true);
    setToast("Ürün sepete eklendi ✓");
    setTimeout(() => setAdded(false), 1400);
  };

  const buyNow = () => {
    if (!product || !isInStock) return;
    addItem(product, quantity);
    setToast("Ürün sepete eklendi, sepete yönlendiriliyorsunuz ✓");
    navigate("/sepet");
  };

  const scrollSimilar = (direction) => {
    if (!similarScrollRef.current) return;
    const amount = direction === "left" ? -280 : 280;
    similarScrollRef.current.scrollBy({ left: amount, behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-5 w-64 animate-pulse rounded bg-gray-200" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-[440px] animate-pulse rounded-2xl bg-gray-200" />
          <div className="space-y-4">
            <div className="h-8 w-72 animate-pulse rounded bg-gray-200" />
            <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
            <div className="h-28 w-full animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-gray-900">Ürün bulunamadı</p>
        <p className="mt-2 text-sm text-gray-600">Aradığınız ürün kaldırılmış veya farklı bir ürünle taşınmış olabilir.</p>
        <Link
          to="/urunler"
          className="mt-5 inline-flex rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800"
        >
          Ürünlere dön
        </Link>
      </section>
    );
  }

  return (
    <section className="space-y-8">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
        <Link to="/urunler" className="hover:text-green-700">
          Ürünler
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span>{categoryName}</span>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-gray-900">{product.name}</span>
      </nav>

      <div className="grid items-stretch gap-8 lg:grid-cols-2">
        <div className="animate-[slideFadeLeft_460ms_ease-out]">
          <div className="h-[380px] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            {selectedImage ? (
              <img
                src={selectedImage}
                alt={product.name}
                className="h-full w-full object-contain p-5 box-border transition duration-300 hover:scale-[1.04]"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-5">
                <div className="flex h-24 w-24 items-center justify-center rounded-2xl border border-gray-200 bg-white text-3xl font-semibold text-green-700">
                  {(product.name || "?").slice(0, 1).toUpperCase()}
                </div>
              </div>
            )}
          </div>

          {galleryImages.length > 1 ? (
            <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
              {galleryImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setActiveImageIdx(index)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-xl border transition ${
                    activeImageIdx === index ? "border-green-500 ring-2 ring-green-200" : "border-gray-200"
                  }`}
                >
                  <img src={image} alt={`${product.name} ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="animate-[slideFadeRight_460ms_ease-out]">
          <div className="flex h-[380px] flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {badges.map(({ label, Icon }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-full border border-green-200 bg-green-50 px-2.5 py-1 text-xs font-medium text-green-800"
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 rounded-xl border border-green-100 bg-green-50 p-4">
              <div>
                <p className="text-4xl font-bold tracking-tight text-green-700">{Number(product.price || 0).toFixed(2)} TL</p>
                <p className="mt-1 text-xs text-gray-500">Birim fiyat: /{unit}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsFavorite((prev) => !prev)}
                className={`rounded-full border p-2 transition ${
                  isFavorite ? "border-red-200 bg-red-50 text-red-500" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}
                aria-label="Favorilere ekle"
              >
                <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
              </button>
            </div>

            

            <div className="mt-auto">
              {!isAdmin ? (
                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <div className="inline-flex items-center rounded-xl border border-gray-300 bg-white p-1">
                    <button
                      type="button"
                      onClick={decrementQty}
                      className="rounded-lg p-2 text-gray-700 transition hover:bg-gray-100"
                      disabled={!isInStock}
                      aria-label="Miktari azalt"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-10 text-center text-sm font-semibold text-gray-900">{quantity}</span>
                    <button
                      type="button"
                      onClick={incrementQty}
                      className="rounded-lg p-2 text-gray-700 transition hover:bg-gray-100"
                      disabled={!isInStock}
                      aria-label="Miktari artir"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={addToCart}
                    disabled={!isInStock}
                    className={`inline-flex min-w-44 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold leading-none text-white shadow-sm transition ${
                      !isInStock
                        ? "cursor-not-allowed bg-gray-300"
                        : added
                          ? "bg-emerald-600"
                          : "bg-green-700 hover:bg-green-800"
                    }`}
                  >
                    {added ? (
                      <>
                        <Check className="h-4 w-4 shrink-0" />
                        Sepete eklendi
                      </>
                    ) : (
                      <>
                        <Scale className="h-4 w-4 shrink-0" />
                        Sepete ekle
                      </>
                    )}
                  </button>

                </div>
              ) : (
                <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                  Admin görünümünde sepete ekleme kapalı.
                </div>
              )}

              <div className="mt-6">
                <div className="grid gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 text-xs text-gray-600">
                  <p className="inline-flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-green-600" />
                    Tahmini Teslimat: Yarın kapında
                  </p>
                  <p className="inline-flex items-center gap-1.5">
                    <CircleCheckBig className="h-3.5 w-3.5 text-green-600" />
                    Güvenli ödeme ve iade garantisi
                  </p>
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-3">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                activeTab === tab.key ? "bg-green-100 text-green-800" : "text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="pt-4 text-sm leading-6 text-gray-700">
          {activeTab === "description" ? (
            <p>{product.description || "Bu taze ürün yerel çiftçilerimizden günlük olarak temin edilmektedir."}</p>
          ) : null}
          {activeTab === "nutrition" ? (
            <div className="space-y-2">
              <p className="font-medium text-gray-900">100 {unit} için ortalama değerler:</p>
              <p>Enerji: 42 kcal</p>
              <p>Karbonhidrat: 10.2 g</p>
              <p>Lif: 2.9 g</p>
              <p>C Vitamini: Yüksek</p>
            </div>
          ) : null}
          {activeTab === "storage" ? (
            <div className="space-y-2">
              <p>Serin ve güneş almayan ortamda saklayınız.</p>
              <p>Yıkandıktan sonra tüketilecekse nemsiz saklama kabı tercih ediniz.</p>
              <p>Açıldıktan sonra 2-3 gün içinde tüketilmesi önerilir.</p>
            </div>
          ) : null}
        </div>
      </div>

      {similarProducts.length > 0 ? (
        <div>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-gray-900">Bunları da beğenebilirsiniz</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollSimilar("left")}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50"
                aria-label="Sola kaydır"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollSimilar("right")}
                className="rounded-full border border-gray-200 bg-white p-2 text-gray-600 transition hover:bg-gray-50"
                aria-label="Saga kaydır"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div ref={similarScrollRef} className="mt-4 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {similarProducts.map((item) => (
              <Link
                key={item.id}
                to={`/urunler/${item.id}`}
                className="group w-60 shrink-0 rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-36 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-green-50 to-white">
                  {item.imageUrl ? (
                    <img src={item.imageUrl} alt={item.name} className="h-full w-full object-contain p-3" />
                  ) : (
                    <div className="text-2xl font-bold text-green-700">{(item.name || "?").slice(0, 1).toUpperCase()}</div>
                  )}
                </div>
                <p className="mt-3 truncate font-semibold text-gray-900">{item.name}</p>
                <p className="text-sm text-gray-500">{item.category?.name || "Kategori"}</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-green-700">{Number(item.price || 0).toFixed(2)} TL</p>
                  <span className="opacity-0 transition group-hover:opacity-100 text-xs font-medium text-gray-500">Detayı gör</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <style>{`
        @keyframes slideFadeLeft {
          from {
            opacity: 0;
            transform: translateX(-16px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideFadeRight {
          from {
            opacity: 0;
            transform: translateX(16px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </section>
  );
}

export default ProductDetailPage;
