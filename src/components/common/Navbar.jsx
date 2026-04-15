import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Bell, Clock3, PackageCheck } from "lucide-react";
import { FaRegUserCircle } from "react-icons/fa";
import logoImage from "../../images/logo.png";
import api from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import { useCartStore } from "../../stores/cartStore";
import { useSettingsStore } from "../../stores/settingsStore";

const READ_NOTIFICATIONS_KEY = "customer_read_notifications_v1";

function formatRelativeTime(value) {
  const date = value ? new Date(value) : new Date();
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.max(1, Math.floor(diffMs / 60000));
  if (diffMins < 60) return `${diffMins} dk önce`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} saat önce`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} gün önce`;
}

function statusText(status) {
  if (status === "PENDING") return "Bekliyor";
  if (status === "PREPARING") return "Hazırlanıyor";
  if (status === "DELIVERED") return "Teslim edildi";
  if (status === "CANCELLED") return "İptal edildi";
  return status || "-";
}

function Navbar() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const isAdmin = user?.role === "ADMIN";
  const profileImageDataUrl = useSettingsStore((s) => s.profileImageDataUrl);
  const profileImagesByUser = useSettingsStore((s) => s.profileImagesByUser || {});
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState([]);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const menuRef = useRef(null);
  const notificationRef = useRef(null);
  const cartCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0)
  );
  const profileImageSrc = useMemo(() => {
    if (isAdmin) return profileImageDataUrl || null;
    const userKey = user?.id || user?.email;
    const storedForUser = userKey ? profileImagesByUser[userKey] : null;
    return storedForUser || user?.image || user?.avatarUrl || user?.photoUrl || null;
  }, [isAdmin, profileImageDataUrl, profileImagesByUser, user]);
  const displayName = useMemo(() => {
    if (isAdmin) return user?.name || "Hasan";
    if (user?.name) return user.name;
    if (user?.email) return user.email.split("@")[0];
    return "Kullanici";
  }, [isAdmin, user]);
  const unreadCount = useMemo(
    () => notifications.filter((item) => !readIds.includes(item.id)).length,
    [notifications, readIds]
  );

  useEffect(() => {
    const onDocClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(READ_NOTIFICATIONS_KEY) || "[]");
      setReadIds(Array.isArray(saved) ? saved : []);
    } catch (_error) {
      setReadIds([]);
    }
  }, []);

  useEffect(() => {
    if (!user || isAdmin) return;
    const fetchNotifications = async () => {
      try {
        const { data } = await api.get("/orders");
        const orders = (data?.data || []).slice(0, 20);
        const mapped = orders.map((order) => ({
          id: `${order.id}-${order.status}-${order.updatedAt || order.createdAt || ""}`,
          orderId: order.id,
          status: order.status,
          totalPrice: order.totalPrice || 0,
          createdAt: order.updatedAt || order.createdAt,
        }));
        setNotifications(mapped);
      } catch (_error) {
        setNotifications([]);
      }
    };
    fetchNotifications();
  }, [isAdmin, user]);

  const markAllRead = () => {
    const allIds = notifications.map((item) => item.id);
    setReadIds(allIds);
    localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(allIds));
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setMenuOpen(false);
    setNotificationOpen(false);
    await new Promise((resolve) => setTimeout(resolve, 450));
    logout();
    navigate("/");
  };

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <Link to={isAdmin ? "/admin/dashboard" : "/"} className="inline-flex items-center">
          <img src={logoImage} alt="Sebzeci" className="h-10 w-auto object-contain" />
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <NavLink to={isAdmin ? "/admin/dashboard" : "/"} className="text-gray-700 hover:text-green-700">
            Ana Sayfa
          </NavLink>
          <NavLink to="/urunler" className="text-gray-700 hover:text-green-700">
            Ürünler
          </NavLink>
          {!isAdmin ? (
            <NavLink to="/sepet" className="text-gray-700 hover:text-green-700">
              Sepet ({cartCount})
            </NavLink>
          ) : null}
          {user ? (
            <>
              
              {isAdmin ? (
                <>
                  <NavLink to="/admin/urunler" className="text-gray-700 hover:text-green-700">
                    Ürün Yönetimi
                  </NavLink>
                </>
              ) : null}

              <NavLink to="/siparislerim" className="text-gray-700 hover:text-green-700">
                {isAdmin ? "Gelen Siparişler" : "Verilen Siparişler"}
              </NavLink>
              {!isAdmin ? (
                <div className="relative" ref={notificationRef}>
                  <button
                    type="button"
                    onClick={() => setNotificationOpen((v) => !v)}
                    className="relative rounded-lg border border-gray-200 bg-white p-2 shadow-sm hover:bg-gray-50"
                    aria-label="Bildirimler"
                  >
                    <Bell className="h-4 w-4 text-gray-700" />
                    {unreadCount > 0 ? (
                      <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
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
                        {notifications.slice(0, 5).map((item) => {
                          const isRead = readIds.includes(item.id);
                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                const next = Array.from(new Set([...readIds, item.id]));
                                setReadIds(next);
                                localStorage.setItem(READ_NOTIFICATIONS_KEY, JSON.stringify(next));
                                setNotificationOpen(false);
                                navigate(`/siparislerim/${item.orderId}`);
                              }}
                              className={`mb-1 flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left hover:bg-gray-50 ${
                                isRead ? "bg-white" : "bg-green-50"
                              }`}
                            >
                              <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-700" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-gray-900">
                                  Siparis #{item.orderId.slice(0, 8)} - {statusText(item.status)}
                                </p>
                                <p className="text-xs text-gray-600">{Number(item.totalPrice).toFixed(2)} TL</p>
                                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-gray-500">
                                  <Clock3 className="h-3.5 w-3.5" />
                                  <span>{formatRelativeTime(item.createdAt)}</span>
                                </div>
                              </div>
                              {!isRead ? <span className="mt-1 h-2 w-2 rounded-full bg-green-600" /> : null}
                            </button>
                          );
                        })}
                        {notifications.length === 0 ? (
                          <p className="px-2 py-6 text-center text-xs text-gray-500">Henuz bildirimin yok</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 shadow-sm hover:bg-gray-50"
                >
                  {profileImageSrc ? (
                    <img
                      src={profileImageSrc}
                      alt="Profil"
                      className="h-6 w-6 rounded-full border border-gray-200 object-cover"
                    />
                  ) : (
                    <FaRegUserCircle className="h-6 w-6 text-gray-500" aria-hidden="true" />
                  )}
                  <span className="max-w-28 truncate font-medium text-gray-800">{displayName}</span>
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 z-40 mt-2 w-full rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        navigate(isAdmin ? "/admin/ayarlar" : "/ayarlar");
                      }}
                      className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Ayarlar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleLogout();
                      }}
                      className="mt-0.5 flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-red-700 hover:bg-red-50"
                    >
                      Çıkış Yap
                    </button>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <NavLink to="/" className="text-gray-700 hover:text-green-700">
                Giriş
              </NavLink>
              <NavLink to="/" className="rounded-md bg-green-700 px-3 py-1.5 text-white">
                Kayıt
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Navbar;
