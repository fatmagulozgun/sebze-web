import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../lib/api";
import { useUiStore } from "../stores/uiStore";
import { useSettingsStore } from "../stores/settingsStore";

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

function StatusBadge({ status }) {
  const label = statusLabels[status] || status;
  const classes = statusBadgeClasses[status] || "bg-gray-100 text-gray-700 border-gray-200";
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${classes}`}>
      {label}
    </span>
  );
}

function money(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

function OrderPrintPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const setToast = useUiStore((state) => state.setToast);
  const shopName = useSettingsStore((s) => s.shopName) || "Sebzeci";

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/orders/${id}`);
        setOrder(data.data);
      } catch (_error) {
        setToast("Fiş verisi alınamadı", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id, setToast]);

  useEffect(() => {
    if (order) {
      setTimeout(() => window.print(), 200);
    }
  }, [order]);

  if (loading) return <p className="p-6">Yükleniyor...</p>;
  if (!order) return <p className="p-6">Sipariş bulunamadı.</p>;
  const subtotal = (order.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);

  return (
    <div className="print-page p-6">
      <div className="print-only-receipt mx-auto max-w-md overflow-hidden rounded-xl border border-gray-300 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-green-50 to-white px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] text-gray-500">Market Adı</p>
              <p className="text-xs font-semibold tracking-widest uppercase text-gray-600">{shopName}</p>
              <h1 className="mt-1 text-xl font-bold text-gray-900">Sipariş Faturası</h1>
              <p className="mt-1 text-xs text-gray-600">Teşekkürler. Yine bekleriz.</p>
            </div>
            <div className="text-right">
              <StatusBadge status={order.status} />
              <p className="mt-2 text-[11px] text-gray-500">Yazdırmaya hazır</p>
            </div>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-700">
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-[11px] text-gray-500">Sipariş No</p>
              <p className="mt-1 break-all font-semibold text-gray-900">{order.id}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-[11px] text-gray-500">Tarih</p>
              <p className="mt-1 font-semibold text-gray-900">
                {new Date(order.createdAt).toLocaleString("tr-TR")}
              </p>
            </div>
            {order.user ? (
              <div className="col-span-2 rounded-lg border border-gray-200 bg-white p-3">
                <p className="text-[11px] text-gray-500">Müşteri</p>
                <p className="mt-1 font-semibold text-gray-900">{order.user?.name || "-"}</p>
                <p className="mt-0.5 text-[11px] text-gray-600">{order.user?.email || "-"}</p>
              </div>
            ) : null}
            {order.note ? (
              <div className="col-span-2 rounded-lg border border-dashed border-gray-200 bg-gray-50 p-3">
                <p className="text-[11px] font-semibold text-gray-700">Not</p>
                <p className="mt-1 text-xs text-gray-700">{order.note}</p>
              </div>
            ) : null}
          </div>

          <div className="mt-4 border-y border-dashed border-gray-300 py-3">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold text-gray-600">
              <span>Ürün</span>
              <span className="w-24 text-right">Tutar</span>
            </div>
            <div className="space-y-2">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{item.product?.name || "-"}</p>
                    <p className="mt-0.5 text-[11px] text-gray-600">
                      {item.quantity} x {money(item.price)} TL
                    </p>
                  </div>
                  <p className="w-24 shrink-0 text-right font-semibold text-gray-900">
                    {money(item.price * item.quantity)} TL
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between text-gray-700">
              <span>Ara toplam</span>
              <span className="font-medium">{subtotal.toFixed(2)} TL</span>
            </div>
            <div className="flex items-center justify-between text-gray-700">
              <span>Kargo</span>
              <span className="font-medium">0.00 TL</span>
            </div>
            <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-gray-900">
              <span className="text-base font-semibold">Toplam</span>
              <span className="text-base font-semibold">{money(order.totalPrice)} TL</span>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-gray-200 bg-gray-50 p-3 text-center text-[11px] text-gray-700">
            <p className="font-semibold text-gray-900">İyi günler dileriz</p>
            <p className="mt-0.5">Siparişleriniz için teşekkürler.</p>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="mt-5 w-full rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white print:hidden"
          >
            Tekrar Yazdır
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderPrintPage;
