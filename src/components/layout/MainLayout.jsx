import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Bell, Home, LogOut, Menu, Package, Settings, ShoppingBag, ShoppingCart } from "lucide-react";
import { FaRegUserCircle } from "react-icons/fa";
import Navbar from "../common/Navbar";
import Toast from "../common/Toast";
import logoImage from "../../images/logo.png";
import api from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import { useCartStore } from "../../stores/cartStore";
import { useSettingsStore } from "../../stores/settingsStore";

const READ_NOTIFICATIONS_KEY = "customer_panel_read_notifications_v1";

function titleFromPath(pathname) {
  if (pathname === "/") return "Kontrol Paneli";
  if (pathname.startsWith("/urunler")) return "Ürünler";
  if (pathname.startsWith("/sepet")) return "Sepet";
  if (pathname.startsWith("/siparislerim")) return "Siparişlerim";
  if (pathname.startsWith("/ayarlar")) return "Ayarlar";
  return "Sebzeci";
}

function SidebarLink({ to, Icon, children, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        [
          "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition",
          isActive
            ? "border border-green-200 bg-gradient-to-r from-green-100 to-emerald-50 text-green-900 shadow-sm"
            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
        ].join(" ")
      }
    >
      <Icon className="h-4 w-4" />
      {children}
    </NavLink>
  );
}

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const token = useAuthStore((s) => s.token);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0)
  );
  const shopName = useSettingsStore((s) => s.shopName) || "Sebzeci";
  const profileImagesByUser = useSettingsStore((s) => s.profileImagesByUser || {});
  const isAuthPage = location.pathname === "/giris" || location.pathname === "/kayit";
  const isGuestHomePage = !token && location.pathname === "/";
  const isCustomerPanel = Boolean(token) && Boolean(user) && user?.role !== "ADMIN" && !isAuthPage;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const notificationRef = useRef(null);
  const userMenuRef = useRef(null);
  const pageTitle = useMemo(() => titleFromPath(location.pathname), [location.pathname]);
  const displayName = user?.name || user?.email?.split("@")[0] || "Kullanici";
  const customerImageSrc = useMemo(() => {
    const userKey = user?.id || user?.email;
    const storedForUser = userKey ? profileImagesByUser[userKey] : null;
    return storedForUser || user?.image || user?.avatarUrl || user?.photoUrl || null;
  }, [profileImagesByUser, user]);
  const unreadCount = useMemo(
    () => notifications.filter((item) => !readIds.includes(item.id)).length,
    [notifications, readIds]
  );

  useEffect(() => {
    if (!isCustomerPanel) return;
    try {
      const saved = JSON.parse(localStorage.getItem(READ_NOTIFICATIONS_KEY) || "[]");
      setReadIds(Array.isArray(saved) ? saved : []);
    } catch (_error) {
      setReadIds([]);
    }
  }, [isCustomerPanel]);

  useEffect(() => {
    if (!isCustomerPanel) return;
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get("/orders");
        const orders = data?.data || [];
        setNotifications(
          orders.slice(0, 20).map((order) => ({
            id: `${order.id}-${order.status}-${order.updatedAt || order.createdAt || ""}`,
            orderId: order.id,
            status: order.status,
            totalPrice: Number(order.totalPrice || 0),
          }))
        );
      } catch (_error) {
        setNotifications([]);
      }
    };
    fetchNotifications();
  }, [isCustomerPanel]);

  useEffect(() => {
    if (!isCustomerPanel) return;
    const onDocClick = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [isCustomerPanel]);

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(allIds));
  };
  const statusLabel = (status) => {
    if (status === "PENDING") return "Bekliyor";
    if (status === "PREPARING") return "Hazırlanıyor";
    if (status === "DELIVERED") return "Teslim Edildi";
    if (status === "CANCELLED") return "İptal Edildi";
    return status;
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setUserMenuOpen(false);
    setNotificationOpen(false);
    setMobileOpen(false);
    await new Promise((resolve) => setTimeout(resolve, 450));
    logout();
    navigate("/");
  };

  if (isAuthPage) {
    return <Navigate to="/" replace />;
  }

  if (isGuestHomePage) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <main className="w-full">
          <Outlet />
        </main>
        <Toast />
      </div>
    );
  }

  if (isCustomerPanel) {
    return (
      <div className="h-screen overflow-hidden bg-gray-50 text-gray-900">
        <div className="flex h-full">
          <aside className="hidden h-screen w-64 flex-col border-r border-gray-200 bg-white md:flex">
            <div className="flex h-16 items-center justify-center border-b border-gray-200">
              <button type="button" onClick={() => navigate("/")} className="inline-flex items-center">
                <img src={logoImage} alt={shopName} className="h-14 w-auto object-contain" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 px-3 py-4">
              <SidebarLink to="/" Icon={Home} end>
                Kontrol Paneli
              </SidebarLink>
              <SidebarLink to="/urunler" Icon={Package}>
                Ürünler
              </SidebarLink>
              <SidebarLink to="/sepet" Icon={ShoppingCart}>
                Sepet
              </SidebarLink>
              <SidebarLink to="/siparislerim" Icon={ShoppingBag}>
                Siparişlerim
              </SidebarLink>
              <SidebarLink to="/ayarlar" Icon={Settings}>
                Ayarlar
              </SidebarLink>
            </nav>
            <div className="border-t border-gray-200 p-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
              >
                <LogOut className="h-4 w-4" />
                Çıkış
              </button>
            </div>
          </aside>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/80 backdrop-blur">
              <div className="flex h-16 w-full items-center justify-between px-4 lg:px-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setMobileOpen(true)}
                      className="inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white p-2 shadow-sm hover:bg-gray-50 md:hidden"
                      aria-label="Menü"
                    >
                      <Menu className="h-4 w-4" />
                    </button>
                    <div className="hidden min-w-0 md:block">
                      <p className="truncate text-base font-semibold text-gray-900">{pageTitle} Sayfası</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate("/sepet")}
                    className="relative inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
                    aria-label="Sepet"
                  >
                    <ShoppingCart className="h-4 w-4 text-gray-700" aria-hidden="true" />
                    <span className="hidden sm:inline">Sepet</span>
                    {cartCount > 0 ? (
                      <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800">
                        {cartCount}
                      </span>
                    ) : null}
                  </button>
                  <div className="relative" ref={notificationRef}>
                    <button
                      type="button"
                      onClick={() => setNotificationOpen((v) => !v)}
                      className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
                    >
                      <Bell className="h-4 w-4 text-gray-700" />
                      <span className="hidden sm:inline">Bildirim</span>
                      {unreadCount > 0 ? (
                        <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                          {unreadCount}
                        </span>
                      ) : null}
                    </button>
                    {notificationOpen ? (
                      <div className="absolute left-1/2 z-40 mt-2 w-[calc(100vw-1rem)] max-w-sm -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-2 shadow-lg md:left-auto md:right-0 md:w-80 md:translate-x-0">
                        <div className="mb-1 flex items-center justify-between px-1">
                          <p className="text-sm font-semibold text-gray-900">Bildirimler</p>
                          <button
                            type="button"
                            onClick={markAllRead}
                            className="text-xs font-medium text-green-700 hover:text-green-800"
                          >
                            Tümünü okundu yap
                          </button>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.slice(0, 5).map((n) => (
                            <button
                              key={n.id}
                              type="button"
                              onClick={() => {
                                const next = Array.from(new Set([...readIds, n.id]));
                                setReadIds(next);
                                localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(next));
                                setNotificationOpen(false);
                                navigate(`/siparislerim/${n.orderId}`);
                              }}
                              className={`mb-1 flex w-full items-center justify-between rounded-lg border px-2 py-2 text-left transition hover:bg-gray-50 ${
                                readIds.includes(n.id) ? "bg-white" : "bg-green-50"
                              }`}
                            >
                              <span className="truncate text-sm text-gray-800">
                                Sipariş #{n.orderId.slice(0, 8)} - {statusLabel(n.status)}
                              </span>
                              {!readIds.includes(n.id) ? <span className="h-2 w-2 rounded-full bg-green-600" /> : null}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <div className="relative" ref={userMenuRef}>
                    <button
                      type="button"
                      onClick={() => setUserMenuOpen((v) => !v)}
                      className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm hover:bg-gray-50"
                    >
                      {customerImageSrc ? (
                        <img src={customerImageSrc} alt="Profil" className="h-6 w-6 rounded-full object-cover" />
                      ) : (
                        <FaRegUserCircle className="h-6 w-6 text-gray-500" aria-hidden="true" />
                      )}
                      <span className="max-w-40 truncate text-sm font-medium">{displayName}</span>
                    </button>
                    {userMenuOpen ? (
                      <div className="absolute right-0 z-40 mt-2 w-full rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                            navigate("/ayarlar");
                          }}
                          className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          Ayarlar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setUserMenuOpen(false);
                                  handleLogout();
                          }}
                          className="mt-0.5 flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-red-700 hover:bg-red-50"
                        >
                          Çıkış Yap
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </header>

            <main className="min-h-0 w-full flex-1 overflow-y-auto px-3 py-4 lg:px-6">
              <div className="mx-auto w-full max-w-6xl">
                <Outlet />
              </div>
            </main>
            <Toast />
          </div>
        </div>
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
              aria-label="Kapat"
            />
            <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-xl">
              <div className="flex h-20 items-center justify-between border-b border-gray-200 px-5">
                <button
                  type="button"
                  onClick={() => {
                    navigate("/");
                    setMobileOpen(false);
                  }}
                  className="inline-flex items-center"
                >
                  <img src={logoImage} alt={shopName} className="h-14 w-auto object-contain" />
                </button>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm"
                >
                  Kapat
                </button>
              </div>
              <nav className="space-y-1 px-3 py-4">
                <SidebarLink to="/" Icon={Home} end>
                  Kontrol Paneli
                </SidebarLink>
                <SidebarLink to="/urunler" Icon={Package}>
                  Ürünler
                </SidebarLink>
                <SidebarLink to="/sepet" Icon={ShoppingCart}>
                  Sepet
                </SidebarLink>
                <SidebarLink to="/siparislerim" Icon={ShoppingBag}>
                  Siparişlerim
                </SidebarLink>
                <SidebarLink to="/ayarlar" Icon={Settings}>
                  Ayarlar
                </SidebarLink>
              </nav>
              <div className="border-t border-gray-200 p-3">
                <button
                  type="button"
                onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                >
                  <LogOut className="h-4 w-4" />
                  Çıkış
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <div
          className={[
            "pointer-events-none fixed inset-0 z-[999] bg-white transition-opacity duration-300",
            isLoggingOut ? "opacity-100" : "opacity-0",
          ].join(" ")}
          aria-hidden="true"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <Toast />
    </div>
  );
}

export default MainLayout;
