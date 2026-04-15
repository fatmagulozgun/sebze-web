import { useEffect, useMemo, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  LayoutDashboard,
  LogOut,
  Menu,
  Package as PackageIcon,
  Settings,
  ShoppingBag,
  ShoppingCart,
  UserPlus,
  Users,
} from "lucide-react";
import api from "../../lib/api";
import defaultProfileImage from "../../images/profilmini.png";
import logoImage from "../../images/logo.png";
import { useAuthStore } from "../../stores/authStore";
import { useSettingsStore } from "../../stores/settingsStore";
import Toast from "../common/Toast";

function titleFromPath(pathname) {
  if (pathname.startsWith("/admin/dashboard")) return "Kontrol Paneli";
  if (pathname.startsWith("/admin/urunler")) return "Ürünler";
  if (pathname.startsWith("/admin/siparisler")) return "Siparişler";
  if (pathname.startsWith("/admin/musteriler")) return "Müşteriler";
  if (pathname.startsWith("/admin/ayarlar")) return "Ayarlar";
  return "Yönetim Paneli";
}

function SidebarLink({ to, Icon, children, onClick }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        [
          "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition",
          isActive
            ? "border border-green-200 bg-gradient-to-r from-green-100 to-emerald-50 text-green-900 shadow-sm"
            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900",
        ].join(" ")
      }
      end
      onClick={onClick}
    >
      {Icon ? <Icon className="h-4 w-4" aria-hidden="true" /> : null}
      {children}
    </NavLink>
  );
}

const READ_NOTIFICATION_KEY = "admin_read_notifications";

function getStoredReadIds() {
  try {
    const raw = localStorage.getItem(READ_NOTIFICATION_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveReadIds(ids) {
  try {
    localStorage.setItem(READ_NOTIFICATION_KEY, JSON.stringify(ids));
  } catch {
    // ignore
  }
}

function formatRelativeTime(dateValue) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "az once";
  if (mins < 60) return `${mins} dk once`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat once`;
  const days = Math.floor(hours / 24);
  return `${days} gun once`;
}

function NotificationIcon({ type, severity }) {
  if (type === "ORDER") return <ShoppingCart className="h-4 w-4 text-green-700" aria-hidden="true" />;
  if (type === "STOCK") {
    if (severity === "CRITICAL") return <AlertTriangle className="h-4 w-4 text-red-700" aria-hidden="true" />;
    return <AlertTriangle className="h-4 w-4 text-amber-700" aria-hidden="true" />;
  }
  if (type === "CUSTOMER") return <UserPlus className="h-4 w-4 text-blue-700" aria-hidden="true" />;
  return <Bell className="h-4 w-4 text-gray-600" aria-hidden="true" />;
}

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const shopName = useSettingsStore((s) => s.shopName) || "Sebzeci";
  const profileImageDataUrl = useSettingsStore((s) => s.profileImageDataUrl);
  const notifyNewOrder = useSettingsStore((s) => s.notifyNewOrder);
  const notifyLowStock = useSettingsStore((s) => s.notifyLowStock);
  const notifyNewCustomer = useSettingsStore((s) => s.notifyNewCustomer);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => getStoredReadIds());
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const userMenuRef = useRef(null);
  const notificationRef = useRef(null);
  const pageTitle = useMemo(() => titleFromPath(location.pathname), [location.pathname]);
  const displayName = useMemo(() => {
    if (user?.role === "ADMIN") return "Hasan Özgün";
    if (user?.name) return user.name;
    if (user?.email) return user.email.split("@")[0];
    return "Hasan Özgün";
  }, [user]);
  const profileImageSrc = profileImageDataUrl || defaultProfileImage;

  useEffect(() => {
    const onDocClick = (event) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (!notificationRef.current) return;
      if (!notificationRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [listRes, unreadRes] = await Promise.all([
          api.get("/admin/notifications"),
          api.get("/admin/notifications/unread"),
        ]);
        setNotifications((listRes.data?.data || []).slice(0, 5));
      } catch (_error) {
        setNotifications([]);
      }
    };
    fetchNotifications();
  }, []);

  const unreadLocalCount = useMemo(
    () =>
      notifications
        .filter((n) => {
          if (n.type === "ORDER" && !notifyNewOrder) return false;
          if (n.type === "STOCK" && !notifyLowStock) return false;
          if (n.type === "CUSTOMER" && !notifyNewCustomer) return false;
          return true;
        })
        .filter((n) => !readIds.includes(n.id)).length,
    [notifications, notifyLowStock, notifyNewCustomer, notifyNewOrder, readIds]
  );
  const badgeCount = unreadLocalCount;

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((n) => {
        if (n.type === "ORDER" && !notifyNewOrder) return false;
        if (n.type === "STOCK" && !notifyLowStock) return false;
        if (n.type === "CUSTOMER" && !notifyNewCustomer) return false;
        return true;
      }),
    [notifications, notifyLowStock, notifyNewCustomer, notifyNewOrder]
  );

  const groupedNotifications = useMemo(() => {
    const groups = { ORDER: [], STOCK: [], CUSTOMER: [], OTHER: [] };
    visibleNotifications.forEach((n) => {
      if (groups[n.type]) groups[n.type].push(n);
      else groups.OTHER.push(n);
    });
    return groups;
  }, [visibleNotifications]);

  const markAsRead = (id) => {
    setReadIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveReadIds(next);
      return next;
    });
  };

  const markAllAsRead = () => {
    const allIds = visibleNotifications.map((n) => n.id);
    setReadIds((prev) => {
      const merged = Array.from(new Set([...prev, ...allIds]));
      saveReadIds(merged);
      return merged;
    });
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

  return (
    <div className="h-screen overflow-hidden bg-gray-50 text-gray-900">
      <div className="flex h-full">
        <aside className="hidden h-screen w-64 flex-col border-r border-gray-200 bg-white md:flex">
          <div className="flex h-16 items-center justify-center border-b border-gray-200">
            <button
              type="button"
              onClick={() => navigate("/admin/dashboard")}
              className="inline-flex items-center"
            >
              <img src={logoImage} alt={shopName} className="h-14 w-auto object-contain" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            <SidebarLink to="/admin/dashboard" Icon={LayoutDashboard}>
              Kontrol Paneli
            </SidebarLink>
            <SidebarLink to="/admin/urunler" Icon={PackageIcon}>
              Ürünler
            </SidebarLink>
            <SidebarLink to="/admin/siparisler" Icon={ShoppingBag}>
              Siparişler
            </SidebarLink>
            <SidebarLink to="/admin/musteriler" Icon={Users}>
              Müşteriler
            </SidebarLink>
            <SidebarLink to="/admin/ayarlar" Icon={Settings}>
              Ayarlar
            </SidebarLink>
          </nav>
          <div className="border-t border-gray-200 p-3">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
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
                    <Menu className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <div className="hidden min-w-0 md:block">
                    <p className="truncate text-base font-semibold text-gray-900">{pageTitle} Sayfası</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative" ref={notificationRef}>
                  <button
                    type="button"
                    onClick={() => setNotificationOpen((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:bg-gray-50"
                    aria-label="Bildirimler"
                  >
                    <Bell className="h-4 w-4" aria-hidden="true" />
                    <span className="hidden sm:inline">Bildirim</span>
                    {badgeCount > 0 ? (
                      <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        {badgeCount}
                      </span>
                    ) : null}
                  </button>
                  {notificationOpen ? (
                    <div className="absolute left-1/2 z-40 mt-2 w-[calc(100vw-1rem)] max-w-sm -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-2 shadow-lg md:left-auto md:right-0 md:w-80 md:translate-x-0">
                      <div className="flex items-center justify-between px-2 py-1">
                        <p className="text-xs font-semibold text-gray-500">Bildirimler</p>
                        {visibleNotifications.length > 0 ? (
                          <button
                            type="button"
                            onClick={markAllAsRead}
                            className="text-xs font-medium text-green-700 hover:underline"
                          >
                            Tümünü okundu işaretle
                          </button>
                        ) : null}
                      </div>
                      {visibleNotifications.length === 0 ? (
                        <p className="px-2 py-3 text-sm text-gray-600">Yeni bildirim yok.</p>
                      ) : (
                        <div className="max-h-96 overflow-y-auto pr-1">
                          {[
                            ["ORDER", "Yeni Sipariş"],
                            ["STOCK", "Stok Uyarısı"],
                            ["CUSTOMER", "Yeni Müşteri"],
                          ].map(([key, title]) =>
                            groupedNotifications[key].length > 0 ? (
                              <div key={key} className="mt-2">
                                <p className="px-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                                  {title}
                                </p>
                                {groupedNotifications[key].map((n) => {
                                  const isUnread = !readIds.includes(n.id);
                                  return (
                                    <button
                                      key={n.id}
                                      type="button"
                                      onClick={() => {
                                        markAsRead(n.id);
                                        setNotificationOpen(false);
                                        navigate(n.targetRoute || "/admin/dashboard");
                                      }}
                                      className={[
                                        "mt-1 w-full rounded-lg border px-2 py-2 text-left text-sm transition",
                                        isUnread
                                          ? n.type === "STOCK"
                                            ? n.severity === "CRITICAL"
                                              ? "border-red-200 bg-red-50 text-red-900"
                                              : "border-amber-200 bg-amber-50 text-amber-900"
                                            : "border-green-100 bg-green-50/70"
                                          : n.type === "STOCK"
                                            ? n.severity === "CRITICAL"
                                              ? "border-red-100 bg-red-50/40 hover:bg-red-50"
                                              : "border-amber-100 bg-amber-50/40 hover:bg-amber-50"
                                            : "border-transparent hover:bg-gray-50",
                                      ].join(" ")}
                                    >
                                      <div className="flex items-start gap-2">
                                        <NotificationIcon type={n.type} severity={n.severity} />
                                        <div className="min-w-0 flex-1">
                                          <div className="flex items-center justify-between gap-2">
                                            <p
                                              className={[
                                                "truncate text-sm text-gray-900",
                                                isUnread ? "font-semibold" : "font-medium",
                                              ].join(" ")}
                                            >
                                              {n.title}
                                            </p>
                                            {isUnread ? (
                                              <span className="h-2 w-2 rounded-full bg-green-600" aria-hidden="true" />
                                            ) : null}
                                          </div>
                                          <p className="truncate text-xs text-gray-600">{n.subtitle}</p>
                                          <p className="mt-0.5 text-[11px] text-gray-500">
                                            {formatRelativeTime(n.createdAt)}
                                          </p>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            ) : null
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-sm transition hover:bg-gray-50"
                  >
                    <img
                      src={profileImageSrc}
                      alt="Profil"
                      className="h-6 w-6 rounded-full border border-gray-200 object-cover"
                    />
                    <span className="max-w-40 truncate text-sm font-medium">{displayName}</span>
                  </button>

                  {userMenuOpen ? (
                    <div className="absolute right-0 z-40 mt-2 w-full rounded-xl border border-gray-200 bg-white p-1 shadow-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setUserMenuOpen(false);
                          navigate("/admin/ayarlar");
                        }}
                        className="flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                      >
                        Ayarlar
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          handleLogout();
                        }}
                        className="mt-0.5 flex w-full items-center rounded-lg px-2.5 py-1.5 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
                      >
                        Çıkış Yap
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </header>

          <main
            className={[
              "min-h-0 w-full flex-1 px-2 py-3 lg:px-6",
              location.pathname.startsWith("/admin/urunler") ? "overflow-hidden" : "overflow-y-auto",
            ].join(" ")}
          >
            <Outlet />
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
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-xl">
            <div className="flex h-20 items-center justify-between border-b border-gray-200 px-5">
              <button
                type="button"
                onClick={() => {
                  navigate("/admin/dashboard");
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
            <nav className="flex-1 space-y-1 px-3 py-4">
              <SidebarLink to="/admin/dashboard" Icon={LayoutDashboard} onClick={() => setMobileOpen(false)}>
                Kontrol Paneli
              </SidebarLink>
              <SidebarLink to="/admin/urunler" Icon={PackageIcon} onClick={() => setMobileOpen(false)}>
                Ürünler
              </SidebarLink>
              <SidebarLink to="/admin/siparisler" Icon={ShoppingBag} onClick={() => setMobileOpen(false)}>
                Siparişler
              </SidebarLink>
              <SidebarLink to="/admin/musteriler" Icon={Users} onClick={() => setMobileOpen(false)}>
                Müşteriler
              </SidebarLink>
              <SidebarLink to="/admin/ayarlar" Icon={Settings} onClick={() => setMobileOpen(false)}>
                Ayarlar
              </SidebarLink>
            </nav>
            <div className="mt-auto border-t border-gray-200 p-3">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
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

export default AdminLayout;

