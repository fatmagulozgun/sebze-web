import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, ChevronRight, Clock3, PackageOpen, Truck, XCircle } from "lucide-react";
import api from "../lib/api";
import { useUiStore } from "../stores/uiStore";

function formatOrderDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusMeta(status) {
  if (status === "PENDING") {
    return {
      label: "Bekliyor",
      className: "bg-orange-50 text-orange-700 border-orange-200",
      Icon: Clock3,
    };
  }
  if (status === "PREPARING") {
    return {
      label: "Yolda",
      className: "bg-blue-50 text-blue-700 border-blue-200",
      Icon: Truck,
    };
  }
  if (status === "DELIVERED") {
    return {
      label: "Teslim Edildi",
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Icon: CheckCircle2,
    };
  }
  if (status === "CANCELLED") {
    return {
      label: "Iptal Edildi",
      className: "bg-red-50 text-red-700 border-red-200",
      Icon: XCircle,
    };
  }
  return {
    label: status || "-",
    className: "bg-gray-100 text-gray-700 border-gray-200",
    Icon: PackageOpen,
  };
}

function OrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [cancelingOrderId, setCancelingOrderId] = useState(null);
  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const setToast = useUiStore((state) => state.setToast);
  const pageSize = 4;

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/orders");
        const list = data.data || [];
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
    fetchOrders();
  }, [setToast]);

  const cancelOrder = async (orderId) => {
    setCancelingOrderId(orderId);
    try {
      const { data } = await api.patch(`/orders/${orderId}/cancel`);
      setOrders((prev) => prev.map((order) => (order.id === orderId ? data.data : order)));
      setToast("Sipariş iptal edildi");
    } catch (_error) {
      setToast("Sipariş iptal edilemedi", "error");
    } finally {
      setCancelingOrderId(null);
    }
  };

  const deleteOrder = async (orderId) => {
    setDeletingOrderId(orderId);
    try {
      await api.delete(`/orders/${orderId}`);
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      setToast("Sipariş silindi");
    } catch (_error) {
      setToast("Sipariş silinemedi", "error");
    } finally {
      setDeletingOrderId(null);
      setConfirmDeleteOrderId(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));
  const startIdx = (currentPage - 1) * pageSize;
  const paginatedOrders = orders.slice(startIdx, startIdx + pageSize);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold">Siparişlerim</h1>
      </div>
      {loading ? (
        <div className="mt-5 space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <article key={idx} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="h-5 w-36 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-28 animate-pulse rounded bg-gray-100" />
                </div>
                <div className="h-6 w-20 animate-pulse rounded-full bg-gray-100" />
              </div>
              <div className="mt-3 flex items-center gap-2">
                {Array.from({ length: 4 }).map((__, itemIdx) => (
                  <div key={itemIdx} className="h-12 w-12 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
              <div className="mt-3 flex items-end justify-between">
                <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
              </div>
            </article>
          ))}
        </div>
      ) : null}
      {!loading && orders.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50 text-green-700">
            <PackageOpen className="h-8 w-8" />
          </div>
          <p className="mt-4 text-lg font-semibold text-gray-900">Henuz siparisin yok</p>
          <p className="mt-2 text-sm text-gray-600">Taze urunlerimizi kesfetmek icin hemen alisverise baslayabilirsin.</p>
          <Link
            to="/urunler"
            className="mt-5 inline-flex rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800"
          >
            Urunleri kesfet
          </Link>
        </div>
      ) : null}
      <div className="mt-5 space-y-3">
        {paginatedOrders.map((order) => {
          const meta = statusMeta(order.status);
          const previewItems = (order.items || []).slice(0, 4);
          const remainCount = Math.max(0, (order.items || []).length - previewItems.length);
          const StatusIcon = meta.Icon;
          return (
            <article
              key={order.id}
              className="cursor-pointer rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              onClick={() => navigate(`/siparislerim/${order.id}`)}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900">Siparis #{order.id.slice(0, 8)}</h2>
                  <p className="mt-1 text-xs text-gray-500">{formatOrderDate(order.createdAt || order.updatedAt)}</p>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${meta.className}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {meta.label}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2">
                {previewItems.map((item, idx) => (
                  <div key={item.id || idx} className="h-12 w-12 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                    {item.product?.imageUrl ? (
                      <img src={item.product.imageUrl} alt={item.product?.name || "Urun"} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs">🥬</div>
                    )}
                  </div>
                ))}
                {remainCount > 0 ? (
                  <span className="inline-flex h-12 items-center rounded-lg bg-gray-100 px-2 text-xs font-medium text-gray-600">
                    +{remainCount} urun daha
                  </span>
                ) : null}
              </div>

              {order.note ? <p className="mt-3 text-sm text-gray-600">Not: {order.note}</p> : null}
              <div className="mt-3 flex items-end justify-between">
                <p className="text-sm font-semibold text-gray-900">Toplam: {Number(order.totalPrice || 0).toFixed(2)} TL</p>
                <div className="flex items-center gap-2">
                  {order.status !== "CANCELLED" ? (
                    <button
                      type="button"
                      disabled={cancelingOrderId === order.id}
                      onClick={(event) => {
                        event.stopPropagation();
                        cancelOrder(order.id);
                      }}
                      className="text-xs font-medium text-amber-700 transition hover:underline disabled:opacity-50"
                    >
                      {cancelingOrderId === order.id ? "Iptal ediliyor..." : "Iptal et"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={deletingOrderId === order.id}
                    onClick={(event) => {
                      event.stopPropagation();
                      setConfirmDeleteOrderId(order.id);
                    }}
                    className="text-xs font-medium text-red-600 transition hover:underline disabled:opacity-50"
                  >
                    Sil
                  </button>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {orders.length > pageSize ? (
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
      {confirmDeleteOrderId ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg">
            <h2 className="text-lg font-semibold">Emin misiniz?</h2>
            <p className="mt-2 text-sm text-gray-600">
              Bu siparişi silmek istediğinize emin misiniz? Bu işlem geri alınmaz.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOrderId(null)}
                className="rounded border border-gray-300 px-3 py-1.5 text-sm"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={() => deleteOrder(confirmDeleteOrderId)}
                className="rounded bg-red-600 px-3 py-1.5 text-sm text-white"
              >
                Evet, Sil
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

export default OrdersPage;
