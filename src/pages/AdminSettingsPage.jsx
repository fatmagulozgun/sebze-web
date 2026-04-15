import { useMemo, useRef, useState } from "react";
import { Camera } from "lucide-react";
import { FaRegUserCircle } from "react-icons/fa";
import api from "../lib/api";
import { useAuthStore } from "../stores/authStore";
import { useUiStore } from "../stores/uiStore";
import { useSettingsStore } from "../stores/settingsStore";

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white p-4 transition hover:shadow-sm">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="mt-0.5 text-xs text-gray-600">{description}</p>
      </div>
      <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full border transition ${
          checked ? "border-green-500 bg-green-500" : "border-gray-300 bg-gray-200"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function AdminSettingsPage() {
  const fileInputRef = useRef(null);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const setAuth = useAuthStore((s) => s.setAuth);
  const setToast = useUiStore((state) => state.setToast);
  const storedProfileImageDataUrl = useSettingsStore((s) => s.profileImageDataUrl);
  const storedNotifyNewOrder = useSettingsStore((s) => s.notifyNewOrder);
  const storedNotifyLowStock = useSettingsStore((s) => s.notifyLowStock);
  const storedNotifyNewCustomer = useSettingsStore((s) => s.notifyNewCustomer);
  const profileImagesByUser = useSettingsStore((s) => s.profileImagesByUser || {});
  const setSettings = useSettingsStore((s) => s.setSettings);
  const setProfileImageForUser = useSettingsStore((s) => s.setProfileImageForUser);
  const isAdmin = user?.role === "ADMIN";
  const customerKey = useMemo(() => user?.id || user?.email || null, [user?.email, user?.id]);
  const customerStoredImage = customerKey ? profileImagesByUser[customerKey] : null;

  const [profileImageDataUrl, setProfileImageDataUrl] = useState(
    isAdmin ? storedProfileImageDataUrl : customerStoredImage || user?.image || user?.avatarUrl || user?.photoUrl || null
  );
  const [notifyNewOrder, setNotifyNewOrder] = useState(storedNotifyNewOrder);
  const [notifyLowStock, setNotifyLowStock] = useState(storedNotifyLowStock);
  const [notifyNewCustomer, setNotifyNewCustomer] = useState(storedNotifyNewCustomer);
  const [phone, setPhone] = useState(user?.phone || "");

  const handleSaveAll = async () => {
    if (isAdmin) {
      setSettings({
        profileImageDataUrl: profileImageDataUrl || null,
        notifyNewOrder,
        notifyLowStock,
        notifyNewCustomer,
      });
    } else {
      setSettings({
        notifyNewOrder,
        notifyLowStock,
        notifyNewCustomer,
      });
      setProfileImageForUser(customerKey, profileImageDataUrl || null);

      try {
        const { data } = await api.patch("/auth/me", { phone });
        const updatedUser = data?.data;
        if (updatedUser && token) {
          setAuth({
            token,
            user: {
              ...user,
              ...updatedUser,
            },
          });
        }
      } catch (error) {
        const message = error?.response?.data?.message || "Telefon numarası kaydedilemedi";
        setToast(message, "error");
        return;
      }
    }
    setToast("Ayarlar kaydedildi");
  };

  const handlePickPhoto = () => fileInputRef.current?.click();

  const optimizeImageDataUrl = (dataUrl) =>
    new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 512;
        const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast("Lutfen gecerli bir gorsel secin", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : null;
      if (dataUrl) {
        const optimized = await optimizeImageDataUrl(dataUrl);
        setProfileImageDataUrl(optimized);
      }
    };
    reader.readAsDataURL(file);
  };

  const displayName = user?.role === "ADMIN" ? "Hasan" : user?.name || "Hasan";
  const displayEmail = user?.email || "admin@manav.com";
  const displayedImage = profileImageDataUrl || null;
  const displayRole = user?.role === "ADMIN" ? "Mağaza Sahibi" : "Müşteri";

  return (
    <section className="flex h-full min-h-0 w-full items-start justify-center py-2">
      <div className="flex h-full min-h-0 w-full max-w-4xl flex-col">
        <div className="min-h-0 flex-1 space-y-4 overflow-auto pr-1">
          <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <h2 className="text-center text-base font-semibold text-gray-900">Profil Bilgileri</h2>
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:justify-center sm:items-center">
              <div className="relative">
                <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-green-100 bg-white shadow-sm">
                  {displayedImage ? (
                    <img src={displayedImage} alt="Profil" className="h-full w-full object-cover" />
                  ) : (
                    <FaRegUserCircle className="h-16 w-16 text-gray-400" aria-hidden="true" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={handlePickPhoto}
                  className="absolute bottom-0 right-0 rounded-full border border-gray-200 bg-white p-1.5 shadow-sm hover:bg-gray-50"
                >
                  <Camera className="h-3.5 w-3.5 text-gray-700" />
                </button>
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <p className="truncate text-lg font-semibold text-gray-900">{displayName}</p>
                <p className="truncate text-sm text-gray-600">{displayEmail}</p>
                <p className="mt-1 text-xs text-gray-500">Rol: {displayRole}</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={handlePickPhoto}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-800 shadow-sm transition hover:bg-gray-50"
              >
                Fotograf Değiştir
              </button>
              <button
                type="button"
                onClick={() => setProfileImageDataUrl(null)}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
              >
                Fotografi Kaldır
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoChange}
              />
            </div>
            {!isAdmin ? (
              <div className="mx-auto mt-4 max-w-sm">
                <label className="mb-1 block text-xs font-medium text-gray-600">Telefon Numarası</label>
                <input
                  type="tel"
                  placeholder="05xx xxx xx xx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
            ) : null}
          </article>

          <article className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
            <h2 className="text-base font-semibold text-gray-900">Bildirim Ayarlari</h2>
            <div className="mt-4 space-y-3">
              <ToggleRow
                label="Yeni sipariş geldiginde bildir"
                description="Yeni bir siparis geldiginde ust bardan bildirim goster."
                checked={notifyNewOrder}
                onChange={() => setNotifyNewOrder((v) => !v)}
              />
              <ToggleRow
                label="Stok bitince bildir"
                description="Stok kritik seviyeye dustugunde bildirim olustur."
                checked={notifyLowStock}
                onChange={() => setNotifyLowStock((v) => !v)}
              />
              <ToggleRow
                label="Yeni musteri kaydolunca bildir"
                description="Yeni kayit olan musterileri bildir."
                checked={notifyNewCustomer}
                onChange={() => setNotifyNewCustomer((v) => !v)}
              />
            </div>
          </article>
        </div>
        <div className="mt-2 shrink-0 pb-20">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={handleSaveAll}
              className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-green-800"
            >
              Değişiklikleri Kaydet
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AdminSettingsPage;
