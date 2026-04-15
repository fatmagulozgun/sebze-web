import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Package, ShoppingCart, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useUiStore } from "../stores/uiStore";

const dayLabels = ["Paz", "Pzt", "Sal", "Car", "Per", "Cum", "Cmt"];

function buildWeeklyOrdersChart(orders = []) {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const map = new Map();
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    map.set(key, { key, day: dayLabels[d.getDay()], orders: 0 });
  }

  orders.forEach((o) => {
    if (!o?.createdAt) return;
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    if (map.has(key)) {
      map.get(key).orders += 1;
    }
  });

  return Array.from(map.values()).map(({ day, orders }) => ({ day, orders }));
}

function getTodayStats(orders = []) {
  const todayKey = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((o) => new Date(o.createdAt).toISOString().slice(0, 10) === todayKey);
  const todayRevenue = todayOrders.reduce((sum, o) => sum + Number(o.totalPrice || 0), 0);
  return { todayOrders: todayOrders.length, todayRevenue };
}

function formatDelta(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number === 0) return null;
  return number > 0 ? `+${number}` : `${number}`;
}

function AnimatedNumber({ value, duration = 900 }) {
  const target = Number(value || 0);
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!Number.isFinite(target)) {
      setDisplay(0);
      return;
    }
    let frameId;
    const start = performance.now();
    const from = 0;
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      const next = Math.round(from + (target - from) * eased);
      setDisplay(next);
      if (progress < 1) frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, duration]);

  return <>{display}</>;
}

function DashboardCard({ Icon, title, value, suffix, delta, gradientFrom = "from-green-100/60", accentClass = "text-emerald-700" }) {
  return (
    <article
      className={[
        "animate-[dashFadeIn_500ms_ease-out] rounded-xl border border-gray-200 bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition hover:shadow-[0_8px_18px_rgba(0,0,0,0.08)]",
        `bg-gradient-to-r ${gradientFrom} to-white`,
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">
            <AnimatedNumber value={value} />
            {suffix ? <span className="ml-2 text-base font-medium text-gray-500">{suffix}</span> : null}
          </p>
          {formatDelta(delta) ? (
            <p className="mt-2 text-sm text-gray-600">
              <span className="rounded-md bg-green-100 px-2 py-0.5 text-green-700">{formatDelta(delta)} bu hafta</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-500">Son 7 gün</p>
          )}
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm">
          {Icon ? <Icon className={`h-5 w-5 ${accentClass}`} aria-hidden="true" /> : null}
        </div>
      </div>
    </article>
  );
}

function AdminDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const setToast = useUiStore((state) => state.setToast);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const [dashboardRes, ordersRes] = await Promise.all([api.get("/admin/dashboard"), api.get("/orders")]);
        const base = dashboardRes.data?.data || {};
        const orders = ordersRes.data?.data || [];
        const weeklyOrdersChart = buildWeeklyOrdersChart(orders);
        const todayStats = getTodayStats(orders);

        setSummary({
          ...base,
          weeklyOrdersChart: base.weeklyOrdersChart?.length ? base.weeklyOrdersChart : weeklyOrdersChart,
          todayOrders: typeof base.todayOrders === "number" ? base.todayOrders : todayStats.todayOrders,
          todayRevenue: typeof base.todayRevenue === "number" ? base.todayRevenue : todayStats.todayRevenue,
        });
      } catch (_error) {
        setToast("Panel verileri alınamadı", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [setToast]);

  const skeletonCards = useMemo(() => Array.from({ length: 3 }), []);

  return (
    <section>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Hoşgeldin Hasan</h1>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {skeletonCards.map((_, index) => (
            <div
              key={index}
              className="relative h-36 overflow-hidden rounded-xl border border-gray-200 bg-gray-100 before:absolute before:inset-0 before:-translate-x-full before:animate-[dashShimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent"
            />
          ))}
        </div>
      ) : null}
      {summary && !loading ? (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <DashboardCard
              Icon={Package}
              title="Toplam Ürün"
              value={summary.totalProducts}
              suffix="ürün"
              delta={summary.weeklyProductsDelta}
              gradientFrom="from-emerald-100/60"
              accentClass="text-emerald-700"
            />
            <DashboardCard
              Icon={ShoppingCart}
              title="Yeni Sipariş"
              value={summary.pendingOrders}
              suffix="adet"
              delta={summary.weeklyOrdersDelta}
              gradientFrom="from-sky-100/60"
              accentClass="text-sky-700"
            />
            <DashboardCard
              Icon={Users}
              title="Müşteri Sayısı"
              value={summary.totalCustomers}
              suffix="müşteri"
              delta={summary.weeklyCustomersDelta}
              gradientFrom="from-violet-100/60"
              accentClass="text-violet-700"
            />
          </div>

          <div className="mt-6 grid animate-[dashFadeIn_500ms_ease-out] gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)] animate-[dashFadeIn_500ms_ease-out]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">⚠️ Stok Uyarısı</h2>
                  <p className="mt-1 text-sm text-gray-600">Stok seviyesi düşük ürünler.</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/admin/urunler")}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:bg-gray-50"
                >
                  Stoğu Güncelle
                </button>
              </div>
              <div className="mt-4 space-y-2">
                {(summary.lowStockProducts || []).length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 p-4 text-sm text-gray-600">
                    Düşük stok ürünü yok.
                  </div>
                ) : (
                  (summary.lowStockProducts || []).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl border border-gray-200 bg-gradient-to-r from-amber-50 to-white px-4 py-3 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{item.name}</p>
                        <p className="mt-0.5 text-xs text-gray-600">Kalan stok</p>
                      </div>
                      <span className="whitespace-nowrap rounded-lg bg-amber-100 px-3.5 py-1.5 text-sm font-semibold text-amber-800">
                        {item.stock} {item.unit}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.06)] animate-[dashFadeIn_500ms_ease-out]">
              <h2 className="text-lg font-semibold">Haftalık Özet</h2>
              <p className="mt-1 text-sm text-gray-600">Son 7 gün sipariş trendi.</p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Bugün sipariş</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {typeof summary.todayOrders === "number" ? <AnimatedNumber value={summary.todayOrders} /> : "-"}
                  </p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm text-gray-600">Bugün ciro</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {typeof summary.todayRevenue === "number" ? (
                      <>
                        <AnimatedNumber value={summary.todayRevenue} /> TL
                      </>
                    ) : (
                      "-"
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4 h-56 w-full rounded-xl border border-gray-200 bg-white p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={
                      summary.weeklyOrdersChart ||
                      [
                        { day: "Pzt", orders: 0 },
                        { day: "Sal", orders: 0 },
                        { day: "Çar", orders: 0 },
                        { day: "Per", orders: 0 },
                        { day: "Cum", orders: 0 },
                        { day: "Cmt", orders: 0 },
                        { day: "Paz", orders: 0 },
                      ]
                    }
                    margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={30} />
                    <Tooltip />
                    <Bar dataKey="orders" fill="#16a34a" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      ) : null}
      <style>{`
        @keyframes dashShimmer {
          100% {
            transform: translateX(100%);
          }
        }
        @keyframes dashFadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
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

export default AdminDashboardPage;
