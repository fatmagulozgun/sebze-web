import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { useSettingsStore } from "../stores/settingsStore";
import { useUiStore } from "../stores/uiStore";

const statusLabels = {
  PENDING: "Bekliyor",
  PREPARING: "Hazırlanıyor",
  SHIPPED: "Hazır",
  READY: "Hazır",
  DELIVERED: "Teslim Edildi",
  CANCELLED: "İptal Edildi",
};

const statusBadgeClasses = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  PREPARING: "bg-blue-100 text-blue-700 border-blue-200",
  SHIPPED: "bg-green-100 text-green-700 border-green-200",
  READY: "bg-green-100 text-green-700 border-green-200",
  DELIVERED: "bg-gray-100 text-gray-700 border-gray-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
};
const interactiveStatuses = ["PENDING", "PREPARING", "SHIPPED", "DELIVERED"];

function StatusBadge({ status }) {
  const label = statusLabels[status] || status;
  const classes = statusBadgeClasses[status] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}

function formatRelativeTime(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "az önce";
  if (diffMin < 60) return `${diffMin} dk önce`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} saat önce`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay} gün önce`;
}

function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const setToast = useUiStore((state) => state.setToast);
  const profileImagesByUser = useSettingsStore((s) => s.profileImagesByUser || {});
  const firstLoadRef = useRef(true);
  const knownOrderIdsRef = useRef(new Set());
  const pageSize = 4;

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/orders");
      const list = data.data || [];
      if (firstLoadRef.current) {
        knownOrderIdsRef.current = new Set(list.map((item) => item.id));
        firstLoadRef.current = false;
      } else {
        const known = knownOrderIdsRef.current;
        const incoming = list.filter((item) => !known.has(item.id));
        if (incoming.length > 0) {
          setToast("🔔 Yeni sipariş geldi");
          knownOrderIdsRef.current = new Set(list.map((item) => item.id));
        }
      }
      setOrders(list);
      setCurrentPage((prev) => {
        const maxPage = Math.max(1, Math.ceil(list.length / pageSize));
        return Math.min(prev, maxPage);
      });
    } catch (_error) {
      setToast("Siparişler alınamadı", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const timer = window.setInterval(fetchOrders, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      await api.patch(`/orders/${orderId}/status`, { status });
      setToast("Sipariş durumu güncellendi");
      fetchOrders();
    } catch (_error) {
      setToast("Durum güncellenemedi", "error");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteOrder = async (orderId) => {
    const ok = window.confirm("Bu siparişi silmek istediğine emin misin?");
    if (!ok) return;
    try {
      await api.delete(`/orders/${orderId}`);
      setToast("Sipariş silindi");
      fetchOrders();
    } catch (_error) {
      setToast("Sipariş silinemedi", "error");
    }
  };

  const filteredOrders = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return orders.filter((order) => {
      const matchesTab = activeTab === "ALL" ? true : order.status === activeTab;
      const haystack = `${order.id} ${order.user?.name || ""} ${order.user?.email || ""}`.toLowerCase();
      const matchesSearch = query ? haystack.includes(query) : true;
      return matchesTab && matchesSearch;
    });
  }, [orders, activeTab, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedOrders = filteredOrders.slice(startIdx, startIdx + pageSize);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm]);

  const tabCounts = useMemo(
    () => ({
      ALL: orders.length,
      PENDING: orders.filter((o) => o.status === "PENDING").length,
      PREPARING: orders.filter((o) => o.status === "PREPARING").length,
      DELIVERED: orders.filter((o) => o.status === "DELIVERED").length,
      CANCELLED: orders.filter((o) => o.status === "CANCELLED").length,
    }),
    [orders]
  );

  const customerImageSrc = (customer) => {
    const key = customer?.id || customer?.email;
    return (
      (key ? profileImagesByUser[key] : null) ||
      customer?.image ||
      customer?.avatarUrl ||
      customer?.photoUrl ||
      null
    );
  };

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Siparişler</h1>
        </div>
        <button
          type="button"
          onClick={fetchOrders}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:bg-gray-50"
        >
          Yenile
        </button>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: "ALL", label: "Tümü" },
            { key: "PENDING", label: "Bekleyen" },
            { key: "PREPARING", label: "Hazırlanan" },
            { key: "DELIVERED", label: "Teslim" },
            { key: "CANCELLED", label: "İptal" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full border px-3 py-1.5 text-sm transition ${
                activeTab === tab.key
                  ? "border-green-400 bg-green-100 font-medium text-green-800"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label} ({tabCounts[tab.key] ?? 0})
            </button>
          ))}
        </div>
        <input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="🔍 Sipariş ara"
          className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      {loading && orders.length === 0 ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <article key={index} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="space-y-3">
                <div className="relative h-5 w-2/3 overflow-hidden rounded bg-gray-200 before:absolute before:inset-0 before:-translate-x-full before:animate-[orderShimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent" />
                <div className="relative h-4 w-1/2 overflow-hidden rounded bg-gray-200 before:absolute before:inset-0 before:-translate-x-full before:animate-[orderShimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent" />
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="relative h-9 overflow-hidden rounded-lg bg-gray-200 before:absolute before:inset-0 before:-translate-x-full before:animate-[orderShimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent" />
                  <div className="relative h-9 overflow-hidden rounded-lg bg-gray-200 before:absolute before:inset-0 before:-translate-x-full before:animate-[orderShimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent" />
                  <div className="relative h-9 overflow-hidden rounded-lg bg-gray-200 before:absolute before:inset-0 before:-translate-x-full before:animate-[orderShimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent" />
                </div>
                <div className="relative h-8 w-40 overflow-hidden rounded-lg bg-gray-200 before:absolute before:inset-0 before:-translate-x-full before:animate-[orderShimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent" />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {paginatedOrders.map((order) => (
          <article
            key={order.id}
            className="rounded-xl border border-gray-200 bg-gradient-to-r from-white to-green-50/40 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="grid items-center gap-3 lg:grid-cols-[1fr_270px]">
              <div className="min-w-0 self-center">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-semibold">Sipariş #{order.id.slice(0, 8)}</h2>
                  <StatusBadge status={order.status} />
                </div>
                <p className="mt-1 text-sm text-gray-600">
                  <span className="mr-2 inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-green-100 text-xs font-semibold text-green-800">
                    {customerImageSrc(order.user) ? (
                      <img
                        src={customerImageSrc(order.user)}
                        alt={order.user?.name || "Müşteri"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (order.user?.name || order.user?.email || "?").slice(0, 1).toUpperCase()
                    )}
                  </span>
                  {order.user?.name || "-"} <span className="text-gray-400">•</span> {order.user?.email || "-"}
                </p>
                <div className="mt-2 flex items-center gap-1.5">
                  {(order.items || []).slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-gray-100"
                    >
                      {item.product?.imageUrl ? (
                        <img src={item.product.imageUrl} alt={item.product?.name || "urun"} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-[10px]">🥬</span>
                      )}
                    </div>
                  ))}
                  {(order.items || []).length > 4 ? (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      +{(order.items || []).length - 4}
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Link
                    to={`/admin/siparisler/${order.id}`}
                    className="text-sm font-medium text-green-700 hover:underline"
                  >
                    Detayı gör
                  </Link>
                  <Link
                    to={`/orders/${order.id}/print`}
                    className="text-sm text-gray-600 hover:underline"
                  >
                    Yazdır
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(order.id)}
                    className="text-sm text-red-700 hover:underline"
                  >
                    Sil
                  </button>
                </div>
              </div>

              <div className="space-y-2 rounded-xl border border-gray-200 bg-white/90 p-3">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    disabled={updatingId === order.id || order.status === "CANCELLED"}
                    onClick={() => updateStatus(order.id, "CANCELLED")}
                    className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-700 shadow-sm transition hover:bg-red-100 disabled:opacity-50"
                  >
                    İptal Et
                  </button>
                  <div className="space-y-1 text-right">
                    <p className="text-2xl font-semibold text-gray-900">{order.totalPrice.toFixed(2)} TL</p>
                    <p className="text-sm text-gray-600">
                      {(order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0)} ürün
                    </p>
                    <p className="text-xs text-gray-500">{formatRelativeTime(order.createdAt) || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-gray-200 p-1">
                  {interactiveStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={updatingId === order.id}
                      onClick={() => updateStatus(order.id, status)}
                      className={`rounded-md px-1.5 py-1 text-[11px] font-medium transition ${
                        order.status === status
                          ? {
                              PENDING: "bg-yellow-100 text-yellow-700",
                              PREPARING: "bg-blue-100 text-blue-700",
                              SHIPPED: "bg-green-100 text-green-700",
                              DELIVERED: "bg-gray-200 text-gray-800",
                            }[status]
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {statusLabels[status]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </article>
          ))}
        </div>
      )}
      {filteredOrders.length > pageSize ? (
        <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm disabled:opacity-50"
          >
            Geri
          </button>
          {Array.from({ length: totalPages }).map((_, idx) => {
            const pageNum = idx + 1;
            const active = pageNum === currentPage;
            return (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={[
                  "rounded-lg border px-3 py-1.5 text-sm shadow-sm transition",
                  active
                    ? "border-green-300 bg-green-100 font-semibold text-green-800"
                    : "border-gray-200 bg-white hover:bg-gray-50",
                ].join(" ")}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm shadow-sm disabled:opacity-50"
          >
            İleri
          </button>
        </div>
      ) : null}
      <style>{`
        @keyframes orderShimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </section>
  );
}

export default AdminOrdersPage;
