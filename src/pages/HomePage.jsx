import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Package, ShoppingBag, ShoppingCart, Sparkles } from "lucide-react";
import api from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useCartStore } from "../stores/cartStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useUiStore } from "../stores/uiStore";
import heroImage from "../images/hero.png";

const RECENT_VIEWED_PRODUCTS_KEY = "recent_viewed_products_v1";
const statusLabel = {
  PENDING: "Bekliyor",
  PREPARING: "Hazırlanıyor",
  SHIPPED: "Hazır",
  DELIVERED: "Teslim edildi",
  CANCELLED: "İptal",
};

function AnimatedNumber({ value, duration = 750, fractionDigits = 0 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    if (!Number.isFinite(target)) {
      setDisplay(0);
      return;
    }
    let frameId;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(target * eased);
      if (progress < 1) frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return <>{display.toFixed(fractionDigits)}</>;
}

function HomePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const setToast = useUiStore((state) => state.setToast);
  const cartItems = useCartStore((state) => state.items);
  const cartCount = useMemo(() => cartItems.reduce((total, item) => total + item.quantity, 0), [cartItems]);
  const cartTotal = useMemo(() => cartItems.reduce((sum, item) => sum + Number(item.price || 0) * item.quantity, 0), [cartItems]);
  const profileImagesByUser = useSettingsStore((s) => s.profileImagesByUser || {});
  const isAdmin = user?.role === "ADMIN";
  const welcomeName = isAdmin ? "Hasan" : user?.name || "Misafir";
  const [showRegister, setShowRegister] = useState(true);
  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardReady, setDashboardReady] = useState(false);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [recentViewedIds, setRecentViewedIds] = useState([]);
  const [registerForm, setRegisterForm] = useState({ name: "", email: "", password: "" });
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const userAvatar = useMemo(() => {
    const key = user?.id || user?.email;
    return (key ? profileImagesByUser[key] : null) || user?.image || user?.avatarUrl || null;
  }, [profileImagesByUser, user]);

  useEffect(() => {
    if (!user || isAdmin) return;
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_VIEWED_PRODUCTS_KEY) || "[]");
      setRecentViewedIds(Array.isArray(saved) ? saved : []);
    } catch (_error) {
      setRecentViewedIds([]);
    }
  }, [user, isAdmin]);

  useEffect(() => {
    if (!user || isAdmin) return;
    const fetchDashboardData = async () => {
      setDashboardLoading(true);
      setDashboardReady(false);
      try {
        const [ordersRes, productsRes] = await Promise.all([api.get("/orders"), api.get("/products")]);
        setOrders(ordersRes.data?.data || []);
        setProducts(productsRes.data?.data || []);
      } catch (_error) {
        setOrders([]);
        setProducts([]);
      } finally {
        setDashboardLoading(false);
        setTimeout(() => setDashboardReady(true), 60);
      }
    };
    fetchDashboardData();
  }, [user, isAdmin]);

  const lastOrders = useMemo(() => (orders || []).slice(0, 4), [orders]);
  const recentlyViewedProducts = useMemo(() => {
    const map = new Map(products.map((p) => [p.id, p]));
    return recentViewedIds.map((id) => map.get(id)).filter(Boolean).slice(0, 4);
  }, [products, recentViewedIds]);

  const submitInlineRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", registerForm);
      setAuth(data.data);
      setToast("Kayıt başarılı");
      navigate("/");
    } catch (_error) {
      setToast("Kayıt başarısız", "error");
    } finally {
      setLoading(false);
    }
  };

  const submitInlineLogin = async (e) => {
    e.preventDefault();
    if (isEntering) return;
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", loginForm);
      setAuth(data.data);
      setIsEntering(true);
      await new Promise((resolve) => setTimeout(resolve, 420));
      navigate(data?.data?.user?.role === "ADMIN" ? "/admin/dashboard" : "/");
    } catch (_error) {
      setToast("Giriş başarısız", "error");
    } finally {
      setLoading(false);
    }
  };

  if (!user || isEntering) {
    return (
      <section className="relative min-h-screen overflow-hidden bg-gray-50">
        <div className="relative h-[32vh] sm:hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${heroImage})` }}
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-white/55 to-white/90" aria-hidden="true" />
        </div>

        <div
          className="absolute inset-0 hidden bg-cover bg-right sm:block"
          style={{ backgroundImage: `url(${heroImage})` }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 hidden sm:block"
          style={{
            background:
              "linear-gradient(to right, #ffffff 28%, rgba(255,255,255,0.85) 42%, rgba(255,255,255,0.45) 55%, rgba(255,255,255,0.15) 68%, rgba(255,255,255,0) 80%)",
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex min-h-[68vh] w-full items-start justify-center px-3 pb-4 pt-2 sm:min-h-screen sm:items-center sm:justify-start sm:px-10 sm:py-12 md:pl-16 lg:pl-24">
          <div className="w-full max-w-lg rounded-3xl bg-white/90 p-4 shadow-xl backdrop-blur-sm sm:rounded-none sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
            <div className="py-1 sm:py-2">

              <h1 className="mt-3 text-3xl font-bold leading-tight text-gray-900 sm:mt-5 sm:text-5xl">Sebzecin Artık Online</h1>
              <p className="mt-3 text-sm leading-7 text-gray-600 sm:mt-5 sm:text-base">
                Taze sebze ve meyveleri birkaç saniyede sipariş ver. Siparişlerini kolayca takip et.
              </p>
            </div>

            <div className="relative mx-auto mt-4 min-h-[350px] w-full overflow-hidden sm:mt-8">
              <div
                className={[
                  "absolute inset-0 w-full rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-xl backdrop-blur-md transition-all duration-700 ease-in-out",
                  showRegister ? "translate-x-0 translate-y-0 opacity-100" : "translate-x-full translate-y-6 opacity-0 pointer-events-none",
                ].join(" ")}
              >
                <h2 className="text-2xl font-semibold text-gray-900">Kayıt Ol</h2>
                <p className="mt-1 text-sm text-gray-500">Yeni hesabını oluştur.</p>
                <form className="mt-4 space-y-3" onSubmit={submitInlineRegister}>
                  <input
                    required
                    placeholder="Ad Soyad"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-green-500"
                    value={registerForm.name}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <input
                    required
                    type="email"
                    placeholder="E-posta"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-green-500"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  <div className="relative">
                    <input
                      required
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="Şifre"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-green-500"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm((prev) => ({ ...prev, password: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                      aria-label={showRegisterPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                    >
                      {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button
                    disabled={loading}
                    type="submit"
                    className="h-12 w-full rounded-lg bg-green-700 px-4 text-base font-medium text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
                  >
                    {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
                  </button>
                </form>
                <p className="mt-4 text-sm text-gray-600">
                  Zaten hesabın var mı?{" "}
                  <button
                    type="button"
                    onClick={() => setShowRegister(false)}
                    className="font-medium text-green-700 hover:underline"
                  >
                    Giriş yap
                  </button>
                </p>
              </div>

              <div
                className={[
                  "absolute inset-0 w-full rounded-2xl border border-gray-200 bg-white/80 p-5 shadow-xl backdrop-blur-md transition-all duration-700 ease-in-out",
                  showRegister ? "-translate-x-full translate-y-6 opacity-0 pointer-events-none" : "translate-x-0 translate-y-0 opacity-100",
                ].join(" ")}
              >
                <h2 className="text-2xl font-semibold text-gray-900">Giriş Yap</h2>
                <p className="mt-1 text-sm text-gray-500">Hesabınla devam et.</p>
                <form className="mt-4 space-y-3" onSubmit={submitInlineLogin}>
                  <input
                    required
                    type="email"
                    placeholder="E-posta"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-green-500"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                  <div className="relative">
                    <input
                      required
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="Şifre"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-transparent focus:ring-2 focus:ring-green-500"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-gray-500 hover:bg-gray-100"
                      aria-label={showLoginPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <button
                    disabled={loading || isEntering}
                    type="submit"
                    className="h-12 w-full rounded-lg bg-green-700 px-4 text-base font-medium text-white shadow-sm transition hover:bg-green-800 disabled:opacity-50"
                  >
                    {isEntering ? "Panele geçiliyor..." : loading ? "Giriş yapılıyor..." : "Giriş Yap"}
                  </button>
                </form>
                <p className="mt-4 text-sm text-gray-600">
                  Hesabın yok mu?{" "}
                  <button
                    type="button"
                    onClick={() => setShowRegister(true)}
                    className="font-medium text-green-700 hover:underline"
                  >
                    Hemen Kayıt Ol
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
        <div
          className={[
            "pointer-events-none absolute inset-0 z-20 bg-white/80 backdrop-blur-sm transition-opacity duration-500",
            isEntering ? "opacity-100" : "opacity-0",
          ].join(" ")}
          aria-hidden="true"
        />
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-green-50 via-white to-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-green-100 text-sm font-semibold text-green-800">
              {userAvatar ? (
                <img src={userAvatar} alt={welcomeName} className="h-full w-full object-cover" />
              ) : (
                welcomeName.slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-green-800">Hoş geldin {welcomeName} 👋</h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-600">
              Bugün taze ürünleri keşfetmeye ne dersin?
            </p>
            </div>
          </div>
          <Link
            to="/urunler"
            className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-800"
          >
            Alışverişe Başla
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {dashboardLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <article key={idx} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="h-6 w-6 animate-pulse rounded bg-gray-100" />
              <div className="mt-3 h-4 w-24 animate-pulse rounded bg-gray-100" />
              <div className="mt-2 h-8 w-28 animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-4 w-32 animate-pulse rounded bg-gray-100" />
            </article>
          ))
        ) : (
          <>
        <article className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${dashboardReady ? "animate-[dashFadeIn_320ms_ease-out]" : ""}`}>
          <div className="mb-2 inline-flex rounded-lg bg-green-50 p-2 text-green-700">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <p className="text-sm text-gray-500">Sepet</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            <AnimatedNumber value={cartCount} /> ürün
          </p>
          <p className="mt-1 text-sm text-gray-600">
            Toplam: <AnimatedNumber value={cartTotal} fractionDigits={2} /> TL
          </p>
          <Link to="/sepet" className="mt-3 inline-block text-sm font-medium text-green-700 hover:underline">
            Sepeti görüntüle
          </Link>
        </article>
        <article className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${dashboardReady ? "animate-[dashFadeIn_360ms_ease-out]" : ""}`}>
          <div className="mb-2 inline-flex rounded-lg bg-blue-50 p-2 text-blue-700">
            <Package className="h-4 w-4" />
          </div>
          <p className="text-sm text-gray-500">Alışverişe devam et</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">Ürünler</p>
          <Link to="/urunler" className="mt-3 inline-block text-sm font-medium text-green-700 hover:underline">
            Ürün listesine git
          </Link>
        </article>
        <article className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:col-span-2 lg:col-span-1 ${dashboardReady ? "animate-[dashFadeIn_400ms_ease-out]" : ""}`}>
          <div className="mb-2 inline-flex rounded-lg bg-amber-50 p-2 text-amber-700">
            <ShoppingBag className="h-4 w-4" />
          </div>
          <p className="text-sm text-gray-500">Toplam sipariş</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900"><AnimatedNumber value={orders.length} /></p>
          <Link to="/siparislerim" className="mt-3 inline-block text-sm font-medium text-green-700 hover:underline">
            Siparişleri görüntüle
          </Link>
        </article>
          </>
        )}
      </div>

      <div className="grid gap-4">
        <article className={`rounded-xl border border-gray-200 bg-white p-5 shadow-sm ${dashboardReady ? "animate-[dashFadeIn_440ms_ease-out]" : ""}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Son Verdiğin Siparişler</h2>
            <Link to="/siparislerim" className="text-sm font-medium text-green-700 hover:underline">
              Tüm siparişleri gör
            </Link>
          </div>
          {dashboardLoading ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="h-10 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : lastOrders.length > 0 ? (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-gray-500">
                  <tr>
                    <th className="py-2">Sipariş</th>
                    <th className="py-2">Tarih</th>
                    <th className="py-2">Durum</th>
                    <th className="py-2 text-right">Tutar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lastOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="py-2">#{order.id.slice(0, 8)}</td>
                      <td className="py-2">{new Date(order.createdAt).toLocaleDateString("tr-TR")}</td>
                      <td className="py-2">{statusLabel[order.status] || order.status}</td>
                      <td className="py-2 text-right font-semibold">{Number(order.totalPrice || 0).toFixed(2)} TL</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-600">Henüz siparişin yok.</p>
          )}
        </article>
      </div>
      <style>{`
        @keyframes dashFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px);
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

export default HomePage;