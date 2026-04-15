import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ImageIcon, LayoutGrid, List, Pencil, Plus, Search, Trash2, X } from "lucide-react";
import api from "../lib/api";
import { useUiStore } from "../stores/uiStore";

const initialForm = {
  name: "",
  description: "",
  imageUrl: "",
  price: "",
  stock: "",
  unit: "",
  categoryName: "",
};

const MAX_IMAGE_SIZE_MB = 2;
const HIDDEN_CATEGORIES_KEY = "admin_hidden_categories_v1";

function readHiddenValues(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeHiddenValues(key, values) {
  try {
    localStorage.setItem(key, JSON.stringify(values));
  } catch {
    // ignore
  }
}

function unitForInput(product) {
  if (product?.customUnit) return product.customUnit;
  return String(product?.unit || "").toLowerCase();
}

function unitLabel(product) {
  if (product?.customUnit) return product.customUnit;
  const unit = String(product?.unit || "").toLowerCase();
  if (unit === "gram") return "gr";
  if (unit === "piece") return "adet";
  return unit || "-";
}

function toDisplayUnit(value) {
  const text = String(value || "").trim();
  if (!text) return text;
  return text.charAt(0).toLocaleUpperCase("tr-TR") + text.slice(1);
}

function optimizeImageDataUrl(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxSize = 640;
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
}

function SelectWithDelete({
  value,
  displayValue,
  placeholder,
  options,
  open,
  setOpen,
  onSelect,
  onDelete,
  anchorRef,
}) {
  return (
    <div className="relative" ref={anchorRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded border border-gray-300 bg-white px-3 py-2 text-left"
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>{displayValue || value || placeholder}</span>
        <ChevronDown className="h-4 w-4 text-gray-600" />
      </button>
      {open ? (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="max-h-64 overflow-auto py-1">
            {options.map((option) => (
              <div key={option.value} className="flex items-center gap-1 px-2 py-1 hover:bg-gray-50">
                <button
                  type="button"
                  onClick={() => {
                    onSelect(option.value);
                    setOpen(false);
                  }}
                  className={[
                    "flex-1 truncate rounded px-2 py-1 text-left text-sm",
                    option.value === value ? "bg-green-50 text-green-800" : "text-gray-800",
                  ].join(" ")}
                >
                  {option.label}
                </button>
                {option.deletable === false ? null : (
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onDelete(option.value);
                    }}
                    className="rounded p-1 text-red-600 hover:bg-red-50"
                    aria-label="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AnimatedStat({ value, duration = 800 }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Number(value || 0);
    if (!Number.isFinite(target)) {
      setDisplay(0);
      return;
    }
    let frameId;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - progress) * (1 - progress);
      setDisplay(Math.round(target * eased));
      if (progress < 1) frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [value, duration]);

  return <>{display}</>;
}

function AdminProductsPage() {
  const setToast = useUiStore((state) => state.setToast);
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState(initialForm);
  const [customCategoryEnabled, setCustomCategoryEnabled] = useState(false);
  const [customUnitEnabled, setCustomUnitEnabled] = useState(false);
  const [editCustomCategoryEnabled, setEditCustomCategoryEnabled] = useState(false);
  const [editCustomUnitEnabled, setEditCustomUnitEnabled] = useState(false);
  const [dynamicUnitOptions, setDynamicUnitOptions] = useState([]);
  const [unitOptions, setUnitOptions] = useState([]);
  const [hiddenCategories, setHiddenCategories] = useState(() => readHiddenValues(HIDDEN_CATEGORIES_KEY));
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [unitOpen, setUnitOpen] = useState(false);
  const [editCategoryOpen, setEditCategoryOpen] = useState(false);
  const [editUnitOpen, setEditUnitOpen] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [quickFilter, setQuickFilter] = useState("ALL");
  const [sortConfig, setSortConfig] = useState({ key: "name", direction: "asc" });
  const [selectedIds, setSelectedIds] = useState([]);
  const [viewMode, setViewMode] = useState("list");
  const categoryRef = useRef(null);
  const unitRef = useRef(null);
  const editCategoryRef = useRef(null);
  const editUnitRef = useRef(null);
  const listScrollRef = useRef(null);
  const gridScrollRef = useRef(null);

  useEffect(() => {
    const onDocClick = (event) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target)) setCategoryOpen(false);
      if (unitRef.current && !unitRef.current.contains(event.target)) setUnitOpen(false);
      if (editCategoryRef.current && !editCategoryRef.current.contains(event.target)) setEditCategoryOpen(false);
      if (editUnitRef.current && !editUnitRef.current.contains(event.target)) setEditUnitOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const { data } = await api.get("/products");
      const list = data.data || [];
      setProducts(list);
    } catch (_error) {
      setToast("Ürünler alınamadı", "error");
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data } = await api.get("/admin/categories");
      const categories = data?.data || [];
      const visibleCategories = categories.filter(
        (item) => !hiddenCategories.includes(String(item.name || "").trim().toLowerCase())
      );

      if (visibleCategories.length === 0 && categories.length > 0) {
        setHiddenCategories([]);
        writeHiddenValues(HIDDEN_CATEGORIES_KEY, []);
        setCategoryOptions(categories);
      } else {
        setCategoryOptions(visibleCategories);
      }
    } catch (_error) {
      setCategoryOptions([]);
    }
  };

  const fetchUnits = async () => {
    try {
      const { data } = await api.get("/admin/units");
      const rows = data?.data || [];
      const normalized = rows
        .map((item) => ({
          id: String(item?.id || "").trim(),
          name: String(item?.name || "").trim().toLowerCase(),
        }))
        .filter((item) => item.id && item.name);
      const uniqueByName = Array.from(new Map(normalized.map((item) => [item.name, item])).values());
      setUnitOptions(uniqueByName);
      setDynamicUnitOptions(uniqueByName.map((u) => u.name));
    } catch (_error) {
      setDynamicUnitOptions([]);
      setUnitOptions([]);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchUnits();
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      fetchUnits();
    }, 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const normalizedName = String(form.name || "").trim().toLowerCase();
    const hasDuplicate =
      normalizedName &&
      products.some((p) => {
        const pName = String(p.name || "").trim().toLowerCase();
        return pName === normalizedName;
      });
    if (hasDuplicate) {
      setToast("Zaten böyle bir ürün var", "error");
      return;
    }
    try {
      await api.post("/products", {
        ...form,
        imageUrl: form.imageUrl || null,
        categoryName: String(form.categoryName || "").trim(),
        unit: String(form.unit || "").trim().toLowerCase(),
        price: Number(form.price),
        stock: Number(form.stock),
      });
      setToast("✅ Ürün başarıyla eklendi");
      setForm(initialForm);
      setCustomCategoryEnabled(false);
      setCustomUnitEnabled(false);
      setCreateModalOpen(false);
      fetchProducts();
      fetchCategories();
      fetchUnits();
    } catch (error) {
      const status = error?.response?.status;
      const rawMessage = error?.response?.data?.message;
      const message =
        typeof rawMessage === "string" && rawMessage.length <= 120
          ? rawMessage
          : "Ürün eklenemedi. Lütfen tekrar dene.";
      if (status === 409) {
        setToast(message || "Zaten böyle bir ürün var", "error");
        return;
      }
      setToast(message || "Ürün eklenemedi", "error");
    }
  };

  const openEdit = (product) => {
    const nextUnit = unitForInput(product) || "kg";
    const nextCategoryName = product.category?.name || "";
    setEditingProduct(product);
    setEditForm({
      name: product.name || "",
      description: product.description || "",
      imageUrl: product.imageUrl || "",
      price: product.price,
      stock: product.stock,
      unit: nextUnit,
      categoryName: nextCategoryName,
    });
    setEditCustomUnitEnabled(!dynamicUnitOptions.includes(nextUnit.toLowerCase()));
    setEditCustomCategoryEnabled(
      Boolean(nextCategoryName) && !categoryOptions.some((cat) => cat.name === nextCategoryName)
    );
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      await api.patch(`/products/${editingProduct.id}`, {
        ...editForm,
        imageUrl: editForm.imageUrl || null,
        categoryName: String(editForm.categoryName || "").trim(),
        unit: String(editForm.unit || "").trim().toLowerCase(),
        price: Number(editForm.price),
        stock: Number(editForm.stock),
      });
      setToast("Ürün güncellendi");
      setEditingProduct(null);
      fetchProducts();
      fetchCategories();
      fetchUnits();
    } catch (_error) {
      setToast("Ürün güncellenemedi", "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/products/${id}`);
      setToast("Ürün silindi");
      fetchProducts();
      fetchCategories();
      fetchUnits();
    } catch (_error) {
      setToast("Ürün silinemedi", "error");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map((id) => api.delete(`/products/${id}`)));
      setToast("Seçilen ürünler silindi");
      setSelectedIds([]);
      fetchProducts();
      fetchCategories();
      fetchUnits();
    } catch (_error) {
      setToast("Toplu silme sırasında hata oluştu", "error");
    }
  };

  const handleImageChange = async (event, mode = "create") => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setToast("Lütfen geçerli bir görsel seçin", "error");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      setToast("Görsel boyutu en fazla 2 MB olmalı", "error");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const raw = typeof reader.result === "string" ? reader.result : "";
      const optimized = await optimizeImageDataUrl(raw);
      if (mode === "edit") {
        setEditForm((prev) => ({ ...prev, imageUrl: optimized }));
      } else {
        setForm((prev) => ({ ...prev, imageUrl: optimized }));
      }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const deleteCategoryOption = async (categoryId) => {
    const targetId = String(categoryId || "").trim();
    if (targetId === "__custom__") return;
    if (!targetId) return;

    const category = categoryOptions.find((item) => item.id === targetId);
    const targetName = String(category?.name || "").trim();
    const normalized = targetName.toLowerCase();

    try {
      await api.delete(`/admin/categories/${targetId}`);
      setToast("Kategori veritabanindan silindi");

      if (normalized) {
        setHiddenCategories((prev) => {
          const next = prev.includes(normalized) ? prev : [...prev, normalized];
          writeHiddenValues(HIDDEN_CATEGORIES_KEY, next);
          return next;
        });
      }

      setCategoryOptions((prev) => prev.filter((item) => item.id !== targetId));
      if (targetName && form.categoryName === targetName) setForm((prev) => ({ ...prev, categoryName: "" }));
      if (targetName && editForm.categoryName === targetName) setEditForm((prev) => ({ ...prev, categoryName: "" }));
      fetchCategories();
      fetchUnits();
    } catch (error) {
      if (error?.response?.status === 409) {
        setToast("Bu kategoriye bağlı ürünler var. Önce ürünleri düzenleyin.", "error");
        return;
      }
      setToast("Kategori silinemedi", "error");
    }
  };

  const deleteUnitOption = async (unitId) => {
    const targetId = String(unitId || "").trim();
    if (targetId === "__custom__") return;
    if (!targetId) return;
    const target = unitOptions.find((item) => item.id === targetId);
    const targetName = String(target?.name || "").trim().toLowerCase();

    try {
      await api.delete(`/admin/units/${targetId}`);
      setToast("Birim veritabanindan silindi");
      if (targetName && String(form.unit || "").toLowerCase() === targetName) setForm((prev) => ({ ...prev, unit: "" }));
      if (targetName && String(editForm.unit || "").toLowerCase() === targetName) setEditForm((prev) => ({ ...prev, unit: "" }));
      fetchUnits();
    } catch (error) {
      if (error?.response?.status === 409) {
        setToast("Bu birime bağlı ürünler var. Önce ürünleri düzenleyin.", "error");
        return;
      }
      setToast("Birim silinemedi", "error");
    }
  };

  const stockBadgeClass = (stock) => {
    const value = Number(stock || 0);
    if (value <= 0) return "bg-red-100 text-red-700 border-red-200";
    if (value <= 10) return "bg-red-100 text-red-700 border-red-200";
    if (value < 30) return "bg-yellow-100 text-yellow-700 border-yellow-200";
    return "bg-green-100 text-green-700 border-green-200";
  };

  const stockMeta = (stock) => {
    const value = Number(stock || 0);
    if (value <= 0) return { label: "Stok bitti", icon: "✖", textClass: "text-red-700" };
    if (value <= 10) return { label: "Stok az", icon: "⚠", textClass: "text-red-700" };
    if (value < 30) return { label: "Kritik", icon: "⚠", textClass: "text-yellow-700" };
    return { label: "Stok iyi", icon: "✓", textClass: "text-green-700" };
  };

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const bySearch = query ? String(product.name || "").toLowerCase().includes(query) : true;
      const bySearchCategory = query
        ? `${product.name || ""} ${product.category?.name || ""} ${unitLabel(product)}`.toLowerCase().includes(query)
        : true;
      const byCategory = filterCategory ? product.category?.name === filterCategory : true;
      const categoryName = String(product.category?.name || "").toLocaleLowerCase("tr-TR");
      const byQuickFilter =
        quickFilter === "ALL"
          ? true
          : quickFilter === "LOW"
            ? Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 10
            : quickFilter === "OUT"
              ? Number(product.stock || 0) <= 0
              : quickFilter === "FRUIT"
                ? categoryName.includes("meyve")
                : quickFilter === "VEGETABLE"
                  ? categoryName.includes("sebze")
                  : true;
      return bySearch && bySearchCategory && byCategory && byQuickFilter;
    });
  }, [products, searchTerm, filterCategory, quickFilter]);

  const sortedProducts = useMemo(() => {
    const next = [...filteredProducts];
    const { key, direction } = sortConfig;
    const multiplier = direction === "asc" ? 1 : -1;
    next.sort((a, b) => {
      if (key === "price" || key === "stock") return (Number(a[key] || 0) - Number(b[key] || 0)) * multiplier;
      const left = String(a.name || "").toLocaleLowerCase("tr-TR");
      const right = String(b.name || "").toLocaleLowerCase("tr-TR");
      return left.localeCompare(right, "tr") * multiplier;
    });
    return next;
  }, [filteredProducts, sortConfig]);

  useEffect(() => {
    if (viewMode === "list" && listScrollRef.current) {
      listScrollRef.current.scrollTop = 0;
    }
    if (viewMode === "grid" && gridScrollRef.current) {
      gridScrollRef.current.scrollTop = 0;
    }
  }, [viewMode, searchTerm, filterCategory, sortConfig]);

  const allCurrentPageSelected =
    sortedProducts.length > 0 && sortedProducts.every((product) => selectedIds.includes(product.id));
  const stats = useMemo(() => {
    const totalProducts = products.length;
    const outOfStock = products.filter((p) => Number(p.stock || 0) === 0).length;
    const lowStock = products.filter((p) => Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 10).length;
    const totalCategories = new Set(products.map((p) => p.category?.name).filter(Boolean)).size;
    const totalStock = products.reduce((sum, p) => sum + Number(p.stock || 0), 0);
    return { totalProducts, outOfStock, lowStock, totalCategories, totalStock };
  }, [products]);

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <h1 className="text-2xl font-semibold">Ürün Yönetimi</h1>
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <article className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-gray-500">📦 Toplam Ürün</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">
            <AnimatedStat value={stats.totalProducts} />
          </p>
        </article>
        <article className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 shadow-sm">
          <p className="text-xs text-yellow-700">⚠️ Stok Azalan</p>
          <p className="mt-1 text-xl font-semibold text-yellow-800">
            <AnimatedStat value={stats.lowStock} />
          </p>
        </article>
        <article className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 shadow-sm">
          <p className="text-xs text-red-700">❌ Stok Biten</p>
          <p className="mt-1 text-xl font-semibold text-red-800">
            <AnimatedStat value={stats.outOfStock} />
          </p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-gray-500">🏷️ Toplam Kategori</p>
          <p className="mt-1 text-xl font-semibold text-gray-900">
            <AnimatedStat value={stats.totalCategories} />
          </p>
        </article>
        <article className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 shadow-sm">
          <p className="text-xs text-green-700">📊 Toplam Stok</p>
          <p className="mt-1 text-xl font-semibold text-green-800">
            <AnimatedStat value={stats.totalStock} />
          </p>
        </article>
      </div>

      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900">Ürünler</h2>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {selectedIds.length > 0 ? (
              <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-medium text-green-800">
                {selectedIds.length} ürün seçildi
              </span>
            ) : null}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Ürün adı, kategori veya birim ile ara..."
                className="w-full sm:w-80 lg:w-96 rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              <option value="">Tümü</option>
              {categoryOptions.map((cat) => (
                <option key={cat.id || cat.name} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
            <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`rounded-md px-2 py-1 ${viewMode === "list" ? "bg-gray-100 text-gray-900" : "text-gray-500"}`}
                aria-label="Liste görünümü"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={`rounded-md px-2 py-1 ${viewMode === "grid" ? "bg-gray-100 text-gray-900" : "text-gray-500"}`}
                aria-label="Grid görünümü"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
            {selectedIds.length > 0 ? (
              <>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                >
                  Sil
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Seçimi temizle
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800"
            >
              <Plus className="h-4 w-4" />
              Yeni Ürün Ekle
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 px-5 py-2">
          {[
            { id: "ALL", label: "Tümü" },
            { id: "LOW", label: "Stok Azalan" },
            { id: "OUT", label: "Stok Biten" },
            { id: "FRUIT", label: "Meyve" },
            { id: "VEGETABLE", label: "Sebze" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setQuickFilter(item.id)}
              className={`rounded-full border px-3 py-1 text-xs transition ${
                quickFilter === item.id
                  ? "border-green-300 bg-green-100 font-medium text-green-800"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        {viewMode === "list" ? (
          <div ref={listScrollRef} className="min-h-0 flex-1 overflow-y-scroll overflow-x-auto pt-1 [scrollbar-gutter:stable]">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup>
              <col className="w-12" />
              <col />
              <col className="w-36" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="w-28" />
            </colgroup>
            <thead className="sticky top-0 z-10 bg-white text-xs font-semibold uppercase text-gray-600 shadow-sm">
              <tr>
                <th className="px-5 py-3">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={(e) => {
                      const ids = sortedProducts.map((product) => product.id);
                      if (e.target.checked) {
                        setSelectedIds((prev) => Array.from(new Set([...prev, ...ids])));
                      } else {
                        setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
                      }
                    }}
                  />
                </th>
                <th className="px-5 py-3">
                  <button
                    type="button"
                    className="font-semibold uppercase"
                    onClick={() =>
                      setSortConfig((prev) => ({
                        key: "name",
                        direction: prev.key === "name" && prev.direction === "asc" ? "desc" : "asc",
                      }))
                    }
                  >
                    Ürün
                  </button>
                </th>
                <th className="px-5 py-3">
                  <button
                    type="button"
                    className="font-semibold uppercase"
                    onClick={() =>
                      setSortConfig((prev) => ({
                        key: "price",
                        direction: prev.key === "price" && prev.direction === "asc" ? "desc" : "asc",
                      }))
                    }
                  >
                    Fiyat
                  </button>
                </th>
                <th className="px-5 py-3">
                  <button
                    type="button"
                    className="font-semibold uppercase"
                    onClick={() =>
                      setSortConfig((prev) => ({
                        key: "stock",
                        direction: prev.key === "stock" && prev.direction === "asc" ? "desc" : "asc",
                      }))
                    }
                  >
                    Stok
                  </button>
                </th>
                <th className="px-5 py-3">Birim</th>
                <th className="px-5 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loadingProducts ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={`skeleton-${index}`}>
                    <td className="px-5 py-4">
                      <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-200" />
                        <div className="space-y-2">
                          <div className="h-3.5 w-28 animate-pulse rounded bg-gray-200" />
                          <div className="h-3 w-16 animate-pulse rounded bg-gray-100" />
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3.5 w-16 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-6 w-10 animate-pulse rounded-full bg-gray-200" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-3.5 w-10 animate-pulse rounded bg-gray-200" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200" />
                        <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                sortedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-5 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds((prev) => [...prev, product.id]);
                        else setSelectedIds((prev) => prev.filter((id) => id !== product.id));
                      }}
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{product.name}</p>
                        <p className="truncate text-xs text-gray-500">{product.category?.name || "Kategori yok"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 font-medium text-gray-900">{product.price.toFixed(2)} TL</td>
                  <td className="px-5 py-4">
                    {(() => {
                      const meta = stockMeta(product.stock);
                      return (
                        <div>
                          <span
                            className={`rounded-full border px-3 py-1 text-sm font-semibold ${stockBadgeClass(product.stock)}`}
                          >
                            {product.stock}
                          </span>
                          <div className="mt-1.5 flex items-center gap-1 text-[11px]">
                            <span className={meta.textClass}>
                              {meta.icon} {meta.label}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-4 text-gray-700">{toDisplayUnit(unitLabel(product))}</td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-sm transition hover:bg-gray-50"
                        onClick={() => openEdit(product)}
                        aria-label="Güncelle"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                        onClick={() => handleDelete(product.id)}
                        aria-label="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                ))
              )}
              {!loadingProducts && sortedProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center">
                    <div className="mx-auto max-w-md rounded-xl border border-gray-200 bg-gray-50 px-6 py-6">
                      <p className="text-base font-semibold text-gray-900">📦 Henüz ürün eklenmemiş</p>
                      <p className="mt-1 text-sm text-gray-600">İlk ürününü ekleyerek başlayabilirsin.</p>
                      <button
                        type="button"
                        onClick={() => setCreateModalOpen(true)}
                        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-800"
                      >
                        <Plus className="h-4 w-4" />
                        Yeni Ürün Ekle
                      </button>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
          </div>
        ) : (
          <div ref={gridScrollRef} className="min-h-0 flex-1 overflow-auto p-4 pt-5">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {loadingProducts ? (
              Array.from({ length: 8 }).map((_, index) => (
                <article key={`grid-skeleton-${index}`} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 h-4 w-4 animate-pulse rounded bg-gray-200" />
                  <div className="h-12 w-12 animate-pulse rounded-xl bg-gray-200" />
                  <div className="mt-3 h-3.5 w-24 animate-pulse rounded bg-gray-200" />
                  <div className="mt-2 h-3 w-16 animate-pulse rounded bg-gray-100" />
                  <div className="mt-3 h-3.5 w-14 animate-pulse rounded bg-gray-200" />
                  <div className="mt-3 flex justify-end gap-2">
                    <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-200" />
                    <div className="h-8 w-8 animate-pulse rounded-lg bg-gray-100" />
                  </div>
                </article>
              ))
            ) : (
              sortedProducts.map((product) => (
              <article key={product.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:bg-gray-50 hover:shadow-md">
                <div className="mb-3 flex items-center justify-between">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(product.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds((prev) => [...prev, product.id]);
                      else setSelectedIds((prev) => prev.filter((id) => id !== product.id));
                    }}
                  />
                  <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${stockBadgeClass(product.stock)}`}>
                    {product.stock}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{product.name}</p>
                    <p className="truncate text-xs text-gray-500">{product.category?.name || "Kategori yok"}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium text-gray-900">{product.price.toFixed(2)} TL</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className={`rounded-full border px-3 py-1 text-sm font-semibold ${stockBadgeClass(product.stock)}`}>
                    Stok: {product.stock}
                  </span>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-lg border border-gray-200 bg-white p-2 text-sm shadow-sm transition hover:bg-gray-50"
                    onClick={() => openEdit(product)}
                    aria-label="Güncelle"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                    onClick={() => handleDelete(product.id)}
                    aria-label="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
              ))
            )}
            </div>
          </div>
        )}
      </div>

      {createModalOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleCreate} className="w-full max-w-2xl rounded-lg bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Yeni Ürün</h2>
              <button type="button" onClick={() => setCreateModalOpen(false)} className="rounded-md p-1 hover:bg-gray-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
        <input
          required
          placeholder="Ürün adı"
          className="rounded border border-gray-300 px-3 py-2"
          value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
        />
        <div className="space-y-2">
          <SelectWithDelete
            value={customCategoryEnabled ? "Diğer (Elle Gir)" : form.categoryName}
            placeholder="Kategori seçin"
            options={[
              ...categoryOptions.map((cat) => ({ value: cat.name, label: cat.name, deleteValue: cat.id })),
              { value: "__custom__", label: "Diğer (Elle Gir)" },
            ]}
            open={categoryOpen}
            setOpen={setCategoryOpen}
            onSelect={(selected) => {
              if (selected === "__custom__") {
                setCustomCategoryEnabled(true);
                setForm((p) => ({ ...p, categoryName: "" }));
                return;
              }
              setCustomCategoryEnabled(false);
              setForm((p) => ({ ...p, categoryName: selected }));
            }}
            onDelete={(selected) => {
              const matched = categoryOptions.find((cat) => cat.name === selected);
              if (!matched?.id) return;
              deleteCategoryOption(matched.id);
            }}
            anchorRef={categoryRef}
          />
          {customCategoryEnabled ? (
            <input
              required
              placeholder="Yeni kategori yaz"
              className="w-full rounded border border-gray-300 px-3 py-2"
              value={form.categoryName}
              onChange={(e) => setForm((p) => ({ ...p, categoryName: e.target.value }))}
            />
          ) : null}
        </div>
        <input
          placeholder="Açıklama"
          className="rounded border border-gray-300 px-3 py-2 md:col-span-2"
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
        />
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-gray-600">Ürün Görseli</label>
          <div className="flex items-center gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50">
              Görsel Seç
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageChange(e)} />
            </label>
            {form.imageUrl ? (
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, imageUrl: "" }))}
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
              >
                Kaldır
              </button>
            ) : null}
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
              {form.imageUrl ? (
                <img src={form.imageUrl} alt="Önizleme" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-4 w-4 text-gray-400" />
              )}
            </div>
          </div>
        </div>
        <input
          required
          type="number"
          step="0.01"
          placeholder="Fiyat"
          className="rounded border border-gray-300 px-3 py-2"
          value={form.price}
          onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
        />
        <input
          required
          type="number"
          placeholder="Stok"
          className="rounded border border-gray-300 px-3 py-2"
          value={form.stock}
          onChange={(e) => setForm((p) => ({ ...p, stock: e.target.value }))}
        />
        <div className="space-y-2">
          <SelectWithDelete
            value={customUnitEnabled ? "Diğer (elle gir)" : form.unit}
            displayValue={customUnitEnabled ? "Diğer (elle gir)" : toDisplayUnit(form.unit)}
            placeholder="Birim seçin"
            options={[
              ...dynamicUnitOptions.map((unit) => ({ value: unit, label: toDisplayUnit(unit) })),
              { value: "__custom__", label: "Diğer (elle gir)", deletable: false },
            ]}
            open={unitOpen}
            setOpen={setUnitOpen}
            onSelect={(selected) => {
              if (selected === "__custom__") {
                setCustomUnitEnabled(true);
                setForm((p) => ({ ...p, unit: "" }));
                return;
              }
              setCustomUnitEnabled(false);
              setForm((p) => ({ ...p, unit: selected }));
            }}
            onDelete={(selected) => {
              const matched = unitOptions.find((unit) => unit.name === selected);
              if (!matched?.id) {
                setToast("Bu birim veritabanında kayıtlı değil", "error");
                return;
              }
              deleteUnitOption(matched.id);
            }}
            anchorRef={unitRef}
          />
          {customUnitEnabled ? (
            <input
              required
              placeholder="Birim yaz"
              className="w-full rounded border border-gray-300 px-3 py-2"
              value={form.unit}
              onChange={(e) => setForm((p) => ({ ...p, unit: e.target.value }))}
            />
          ) : null}
        </div>
          </div>
            <div className="mt-4 flex justify-end gap-2">
                      <button
                        type="button"
                onClick={() => setCreateModalOpen(false)}
                className="rounded border border-gray-300 px-4 py-2"
                      >
                Vazgeç
                      </button>
              <button type="submit" className="rounded bg-green-700 px-4 py-2 text-white">
                Ürün Ekle
                      </button>
                    </div>
          </form>
        </div>
      ) : null}

      {editingProduct ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <form onSubmit={handleUpdate} className="w-full max-w-xl space-y-3 rounded-lg bg-white p-5">
            <h2 className="text-lg font-semibold">Ürün Güncelle</h2>
            <input
              required
              className="w-full rounded border border-gray-300 px-3 py-2"
              value={editForm.name}
              onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
            />
            <input
              className="w-full rounded border border-gray-300 px-3 py-2"
              value={editForm.description}
              onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
            />
            <div>
              <p className="mb-1 text-xs font-medium text-gray-600">Ürün Görseli</p>
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm hover:bg-gray-50">
                  Görsel Seç
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageChange(e, "edit")}
                  />
                </label>
                {editForm.imageUrl ? (
                  <button
                    type="button"
                    onClick={() => setEditForm((prev) => ({ ...prev, imageUrl: "" }))}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
                  >
                    Kaldır
                  </button>
                ) : null}
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                  {editForm.imageUrl ? (
                    <img src={editForm.imageUrl} alt="Önizleme" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-gray-400" />
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                type="number"
                step="0.01"
                className="rounded border border-gray-300 px-3 py-2"
                value={editForm.price}
                onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
              />
              <input
                required
                type="number"
                className="rounded border border-gray-300 px-3 py-2"
                value={editForm.stock}
                onChange={(e) => setEditForm((p) => ({ ...p, stock: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <SelectWithDelete
                  value={editCustomUnitEnabled ? "Diğer (elle gir)" : editForm.unit}
                  displayValue={editCustomUnitEnabled ? "Diğer (elle gir)" : toDisplayUnit(editForm.unit)}
                  placeholder="Birim seçin"
                  options={[
                    ...dynamicUnitOptions.map((unit) => ({ value: unit, label: toDisplayUnit(unit) })),
                    { value: "__custom__", label: "Diğer (elle gir)", deletable: false },
                  ]}
                  open={editUnitOpen}
                  setOpen={setEditUnitOpen}
                  onSelect={(selected) => {
                    if (selected === "__custom__") {
                      setEditCustomUnitEnabled(true);
                      setEditForm((p) => ({ ...p, unit: "" }));
                      return;
                    }
                    setEditCustomUnitEnabled(false);
                    setEditForm((p) => ({ ...p, unit: selected }));
                  }}
                  onDelete={(selected) => {
                    const matched = unitOptions.find((unit) => unit.name === selected);
                    if (!matched?.id) {
                      setToast("Bu birim veritabanında kayıtlı değil", "error");
                      return;
                    }
                    deleteUnitOption(matched.id);
                  }}
                  anchorRef={editUnitRef}
                />
                {editCustomUnitEnabled ? (
                  <input
                    required
                    placeholder="Birim yaz"
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    value={editForm.unit}
                    onChange={(e) => setEditForm((p) => ({ ...p, unit: e.target.value }))}
                  />
                ) : null}
              </div>
              <div className="space-y-2">
                <SelectWithDelete
                  value={editCustomCategoryEnabled ? "Diğer (elle gir)" : editForm.categoryName}
                  placeholder="Kategori seçin"
                  options={[
                    ...categoryOptions.map((cat) => ({ value: cat.name, label: cat.name, deleteValue: cat.id })),
                    { value: "__custom__", label: "Diğer (elle gir)" },
                  ]}
                  open={editCategoryOpen}
                  setOpen={setEditCategoryOpen}
                  onSelect={(selected) => {
                    if (selected === "__custom__") {
                      setEditCustomCategoryEnabled(true);
                      setEditForm((p) => ({ ...p, categoryName: "" }));
                      return;
                    }
                    setEditCustomCategoryEnabled(false);
                    setEditForm((p) => ({ ...p, categoryName: selected }));
                  }}
                  onDelete={(selected) => {
                    const matched = categoryOptions.find((cat) => cat.name === selected);
                    if (!matched?.id) return;
                    deleteCategoryOption(matched.id);
                  }}
                  anchorRef={editCategoryRef}
                />
                {editCustomCategoryEnabled ? (
                  <input
                    required
                    placeholder="Yeni kategori yaz"
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    value={editForm.categoryName}
                    onChange={(e) => setEditForm((p) => ({ ...p, categoryName: e.target.value }))}
                  />
                ) : null}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-gray-300 px-4 py-2"
                onClick={() => setEditingProduct(null)}
              >
                Vazgeç
              </button>
              <button type="submit" className="rounded bg-green-700 px-4 py-2 text-white">
                Kaydet
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </section>
  );
}

export default AdminProductsPage;
