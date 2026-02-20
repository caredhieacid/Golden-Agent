
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import RootLayout from "@/layouts/RootLayout";
import Home from "@/pages/Home";
import StockDetail from "@/pages/StockDetail";
import Congress from "@/pages/Congress";
import PoliticianDetail from "@/pages/PoliticianDetail";
import Market from "@/pages/Market";
import Gold from "@/pages/Gold";
import News from "@/pages/News";
import Insider from "@/pages/Insider";
// AI page removed - will be open-sourced separately for academic research

// Auth pages
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";

// Admin pages (only users management)
import AdminUsers from "@/pages/admin/Users";

// Auth components
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootLayout />}>
          <Route index element={<Home />} />
          <Route path="stock/:ticker" element={<StockDetail />} />
          <Route path="congress">
            <Route index element={<Congress />} />
            <Route path="politician/:name" element={<PoliticianDetail />} />
          </Route>
          <Route path="insider" element={<Insider />} />
          <Route path="cn-market" element={<Market />} />
          <Route path="gold" element={<Gold />} />
          <Route path="news" element={<News />} />
          {/* AI route removed - feature paused for compliance */}

          {/* Auth routes */}
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="verify-email" element={<Login />} />

          {/* Protected routes */}
          <Route path="profile" element={
            <ProtectedRoute>
              <div className="container py-8">
                <h1 className="text-3xl font-bold">个人中心</h1>
                <p className="text-muted-foreground">功能开发中...</p>
              </div>
            </ProtectedRoute>
          } />

          {/* Admin routes - only users management */}
          <Route path="admin/users" element={
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          } />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
