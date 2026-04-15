import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../lib/api";
import { useAuthStore } from "../stores/authStore";
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
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  PREPARING: "bg-blue-100 text-blue-800 border-blue-200",
  SHIPPED: "bg-green-100 text-green-800 border-green-200",
  READY: "bg-green-100 text-green-800 border-green-200",
  DELIVERED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-red-100 text-red-800 border-red-200",
};

const timelineSteps = ["PENDING", "PREPARING", "SHIPPED", "DELIVERED"];

function StatusBadge({ status }) {
  const label = statusLabels[status] || status;
  const classes = statusBadgeClasses[status] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}

function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const setToast = useUiStore((state) => state.setToast);
  const isAdmin = useAuthStore((state) => state.user?.role === "ADMIN");

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/orders/${id}`);
        setOrder(data.data);
      } catch (_error) {
        setToast("Sipariş detayı alınamadı", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, setToast]);

  if (loading) {
    return (
      <section className="h-full min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <div className="h-7 w-56 animate-pulse rounded bg-gray-200" />
          <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
            <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 animate-pulse rounded-lg bg-gray-200" />
                    <div className="space-y-2">
                      <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
                      <div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
                    </div>
                  </div>
                  <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                </div>
              ))}
            </div>
          </div>
          <aside className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
              <div className="mt-3 h-4 w-36 animate-pulse rounded bg-gray-200" />
              <div className="mt-2 h-3 w-28 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="h-5 w-28 animate-pulse rounded bg-gray-200" />
              <div className="mt-3 space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-4 w-full animate-pulse rounded bg-gray-100" />
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
              <div className="mt-3 space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-6 w-full animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          </aside>
        </div>
      </section>
    );
  }
  if (!order) return <p>Sipariş bulunamadı.</p>;
  const subtotal = (order.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const timelineInteractiveSteps = ["PENDING", "PREPARING", "SHIPPED", "DELIVERED"];
  const currentStepIndex = timelineSteps.indexOf(order.status);

  const handleStatusUpdate = async (status) => {
    if (!isAdmin) return;
    if (!order?.id || order.status === status) return;
    setUpdatingStatus(true);
    try {
      await api.patch(`/orders/${order.id}/status`, { status });
      setOrder((prev) => ({ ...prev, status }));
      setToast("Sipariş durumu güncellendi");
    } catch (_error) {
      setToast("Durum güncellenemedi", "error");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">Sipariş Detayı</h1>
            <StatusBadge status={order.status} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/orders/${order.id}/print`}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
          >
            Yazdır
          </Link>
          <Link
            to={-1}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-800"
          >
            Geri
          </Link>
        </div>
      </div>

      <div className="mt-6 grid min-h-0 flex-1 gap-4 lg:grid-cols-3">
        <div className="min-h-0 overflow-auto rounded-xl border border-gray-200 bg-white p-5 lg:col-span-2">
          <h2 className="text-base font-semibold text-gray-900">Ürünler</h2>
          <div className="mt-3 divide-y divide-gray-200">
            {order.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                    {item.product?.imageUrl ? (
                      <img src={item.product.imageUrl} alt={item.product?.name || "urun"} className="h-full w-full object-cover" />
                    ) : (
                      <span>🥬</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{item.product?.name || "-"}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 font-medium">x{item.quantity}</span>{" "}
                      <span className="text-gray-400">•</span> {Number(item.price).toFixed(2)} TL
                    </p>
                  </div>
                </div>
                <p className="shrink-0 font-semibold text-gray-900">
                  {(item.price * item.quantity).toFixed(2)} TL
                </p>
              </div>
            ))}
          </div>
        </div>

        <aside className="min-h-0 space-y-4 overflow-auto pr-1">
          
          {order.note ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
              <p className="font-medium text-gray-900">Sipariş Notu</p>
              <p className="mt-1">{order.note}</p>
            </div>
          ) : null}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <h2 className="text-base font-semibold text-gray-900">Sipariş Akışı</h2>
            <div className="mt-3 space-y-2">
              {timelineInteractiveSteps.map((step, idx) => {
                const stepIndex = timelineSteps.indexOf(step);
                const completed = currentStepIndex > -1 && currentStepIndex > stepIndex;
                const current = currentStepIndex === stepIndex;
                const active = current || completed;
                return (
                  <button
                    key={step}
                    type="button"
                    disabled={!isAdmin || updatingStatus}
                    onClick={() => handleStatusUpdate(step)}
                    className={`relative flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-sm transition ${
                      isAdmin ? "hover:bg-gray-50" : "cursor-default"
                    } disabled:opacity-50`}
                  >
                    {step !== timelineInteractiveSteps[timelineInteractiveSteps.length - 1] ? (
                      <span className={`absolute left-[11px] top-6 h-5 w-px ${completed ? "bg-green-300" : "bg-gray-200"}`} />
                    ) : null}
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                        current
                          ? "bg-green-100 text-green-700 ring-2 ring-green-200"
                          : active
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {active ? "✔" : "○"}
                    </span>
                    <span
                      className={
                        current
                          ? "font-bold text-green-800"
                          : active
                            ? "font-medium text-gray-900"
                            : "text-gray-500"
                      }
                    >
                      {statusLabels[step]}
                    </span>
                  </button>
                );
              })}
            </div>
            {!isAdmin ? (
              <p className="mt-3 text-xs text-gray-500">Siparis akis durumu sadece yonetici tarafindan guncellenebilir.</p>
            ) : null}
          </div>
          <div className="rounded-xl border border-gray-200 bg-gradient-to-br from-green-50 to-white p-5">
            <h2 className="text-base font-semibold text-gray-900">Özet</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Ara toplam</span>
                <span className="font-semibold text-gray-900">{subtotal.toFixed(2)} TL</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Kargo</span>
                <span className="font-semibold text-gray-900">0.00 TL</span>
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-2">
                <span className="font-semibold text-gray-900">Toplam</span>
                <span className="text-2xl font-semibold text-gray-900">{order.totalPrice.toFixed(2)} TL</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

export default OrderDetailPage;
