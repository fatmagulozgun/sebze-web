import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import AdminLayout from "../components/layout/AdminLayout";
import MainLayout from "../components/layout/MainLayout";
import HomePage from "../pages/HomePage";
import ProductListPage from "../pages/ProductListPage";
import ProductDetailPage from "../pages/ProductDetailPage";
import CartPage from "../pages/CartPage";
import OrdersPage from "../pages/OrdersPage";
import OrderDetailPage from "../pages/OrderDetailPage";
import OrderPrintPage from "../pages/OrderPrintPage";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import AdminProductsPage from "../pages/AdminProductsPage";
import AdminOrdersPage from "../pages/AdminOrdersPage";
import AdminCustomersPage from "../pages/AdminCustomersPage";
import AdminSettingsPage from "../pages/AdminSettingsPage";
import SettingsPage from "../pages/AdminSettingsPage";
import { useAuthStore } from "../stores/authStore";

function ProtectedRoute() {
  const token = useAuthStore((state) => state.token);
  if (!token) {
    return <Navigate to="/" replace />;
  }
  return <Outlet />;
}

function AdminRoute() {
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.user?.role);

  if (!token) return <Navigate to="/" replace />;
  if (role !== "ADMIN") return <Navigate to="/" replace />;
  return <Outlet />;
}

function AppRouter() {
  const role = useAuthStore((state) => state.user?.role);
  const isAdmin = role === "ADMIN";

  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={isAdmin ? <Navigate to="/admin/dashboard" replace /> : <HomePage />} />
        <Route path="/urunler" element={<ProductListPage />} />
        <Route path="/urunler/:id" element={<ProductDetailPage />} />
        <Route path="/sepet" element={<CartPage />} />
        <Route path="/giris" element={<Navigate to="/" replace />} />
        <Route path="/kayit" element={<Navigate to="/" replace />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/siparislerim" element={isAdmin ? <Navigate to="/admin/siparisler" replace /> : <OrdersPage />} />
          <Route path="/siparislerim/:id" element={<OrderDetailPage />} />
          <Route path="/orders/:id/print" element={<OrderPrintPage />} />
          <Route path="/ayarlar" element={isAdmin ? <Navigate to="/admin/ayarlar" replace /> : <SettingsPage />} />
        </Route>
      </Route>

      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/urunler" element={<AdminProductsPage />} />
          <Route path="/admin/siparisler" element={<AdminOrdersPage />} />
          <Route path="/admin/siparisler/:id" element={<OrderDetailPage />} />
          <Route path="/admin/musteriler" element={<AdminCustomersPage />} />
          <Route path="/admin/ayarlar" element={<AdminSettingsPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default AppRouter;