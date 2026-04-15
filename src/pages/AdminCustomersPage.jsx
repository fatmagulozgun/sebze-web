import { useEffect, useMemo, useRef, useState } from "react";
import api from "../lib/api";
import { useSettingsStore } from "../stores/settingsStore";
import { useUiStore } from "../stores/uiStore";

function AdminCustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const requestIdRef = useRef(0);
  const setToast = useUiStore((state) => state.setToast);
  const profileImagesByUser = useSettingsStore((s) => s.profileImagesByUser || {});

  const fetchCustomers = async (keyword) => {
    const currentId = ++requestIdRef.current;
    setLoading(true);
    try {
      const { data } = await api.get("/admin/customers", {
        params: keyword ? { search: keyword } : {},
      });
      if (currentId !== requestIdRef.current) return;
      setCustomers(data.data || []);
    } catch (_error) {
      if (currentId !== requestIdRef.current) return;
      setToast("Müşteriler alınamadı", "error");
    } finally {
      if (currentId !== requestIdRef.current) return;
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers("");
  }, []);

  const filtered = useMemo(() => {
    if (!search) return customers;
    const q = search.toLowerCase();
    return customers.filter((c) => {
      const name = (c.name || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      const phone = (c.phone || "").toLowerCase();
      return name.includes(q) || email.includes(q) || phone.includes(q);
    });
  }, [customers, search]);

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
          <h1 className="text-2xl font-semibold">Müşteriler</h1>
          <p className="mt-1 text-sm text-gray-600">Kayıtlı müşterileri ve sipariş sayılarını görüntüle.</p>
        </div>
        <button
          type="button"
          onClick={() => fetchCustomers(search)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm transition hover:bg-gray-50"
        >
          Yenile
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="İsim, e-posta veya telefon ile ara..."
          className="w-full max-w-sm rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <p className="text-xs text-gray-500">Toplam müşteri: {customers.length}</p>
      </div>

      <div className="mt-5 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-sm font-semibold text-gray-900">Müşteri Listesi</h2>
        </div>
        <div className="space-y-3 p-3 md:hidden">
          {loading
            ? Array.from({ length: 4 }).map((_, idx) => (
                <article key={`mobile-skeleton-${idx}`} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 w-28 animate-pulse rounded bg-gray-200" />
                      <div className="h-3 w-36 animate-pulse rounded bg-gray-100" />
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
                    <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
                    <div className="col-span-2 h-12 animate-pulse rounded-lg bg-gray-100" />
                  </div>
                </article>
              ))
            : null}
          {filtered.map((customer) => (
            <article key={customer.id} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-50 to-white text-sm font-semibold text-green-700">
                  {customerImageSrc(customer) ? (
                    <img
                      src={customerImageSrc(customer)}
                      alt={customer.name || "Müşteri"}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    (customer.name || customer.email || "?").slice(0, 1).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{customer.name || "İsimsiz"}</p>
                  <p className="truncate text-sm text-gray-700">{customer.email || "-"}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
                  <p className="text-gray-500">Telefon</p>
                  <p className="mt-0.5 font-medium text-gray-800">{customer.phone || "-"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5">
                  <p className="text-gray-500">Toplam Sipariş</p>
                  <p className="mt-0.5 font-medium text-gray-800">{customer.totalOrders ?? "-"}</p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 col-span-2">
                  <p className="text-gray-500">Toplam Harcama</p>
                  <p className="mt-0.5 font-medium text-gray-900">
                    {typeof customer.totalSpent === "number" ? `${customer.totalSpent.toFixed(2)} TL` : "-"}
                  </p>
                </div>
              </div>
              {customer.createdAt ? (
                <p className="mt-2 text-xs text-gray-500">
                  Kayıt: {new Date(customer.createdAt).toLocaleDateString("tr-TR")}
                </p>
              ) : null}
            </article>
          ))}
          {!loading && filtered.length === 0 ? (
            <p className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-6 text-center text-sm text-gray-600">
              Henüz müşteri bulunmuyor.
            </p>
          ) : null}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-600">
              <tr>
                <th className="px-5 py-3">Müşteri</th>
                <th className="px-5 py-3">E-posta</th>
                <th className="px-5 py-3">Telefon</th>
                <th className="px-5 py-3">Toplam Sipariş</th>
                <th className="px-5 py-3">Toplam Harcama</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading
                ? Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={`table-skeleton-${idx}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
                          <div className="space-y-2">
                            <div className="h-3.5 w-24 animate-pulse rounded bg-gray-200" />
                            <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="h-3.5 w-36 animate-pulse rounded bg-gray-200" />
                      </td>
                      <td className="px-5 py-3">
                        <div className="h-3.5 w-20 animate-pulse rounded bg-gray-200" />
                      </td>
                      <td className="px-5 py-3">
                        <div className="h-3.5 w-10 animate-pulse rounded bg-gray-200" />
                      </td>
                      <td className="px-5 py-3">
                        <div className="h-3.5 w-20 animate-pulse rounded bg-gray-200" />
                      </td>
                    </tr>
                  ))
                : null}
              {filtered.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-green-50 to-white text-sm font-semibold text-green-700">
                        {customerImageSrc(customer) ? (
                          <img
                            src={customerImageSrc(customer)}
                            alt={customer.name || "Müşteri"}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          (customer.name || customer.email || "?").slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{customer.name || "İsimsiz"}</p>
                        {customer.createdAt ? (
                          <p className="truncate text-xs text-gray-500">
                            Kayıt: {new Date(customer.createdAt).toLocaleDateString("tr-TR")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-700">{customer.email || "-"}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{customer.phone || "-"}</td>
                  <td className="px-5 py-3 text-sm text-gray-700">{customer.totalOrders ?? "-"}</td>
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">
                    {typeof customer.totalSpent === "number" ? `${customer.totalSpent.toFixed(2)} TL` : "-"}
                  </td>
                </tr>
              ))}
              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-gray-600">
                    Henüz müşteri bulunmuyor.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default AdminCustomersPage;

