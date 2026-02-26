import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
const RootLayout = lazy(() => import("@/layouts/RootLayout"));
const Home = lazy(() => import("@/pages/Home"));
const StockDetail = lazy(() => import("@/pages/StockDetail"));
const Congress = lazy(() => import("@/pages/Congress"));
const PoliticianDetail = lazy(() => import("@/pages/PoliticianDetail"));
const Market = lazy(() => import("@/pages/Market"));
const Gold = lazy(() => import("@/pages/Gold"));
const News = lazy(() => import("@/pages/News"));
const Insider = lazy(() => import("@/pages/Insider"));
const AI = lazy(() => import("@/pages/AI"));

// Auth pages
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Profile = lazy(() => import("@/pages/Profile"));

// Admin pages (only users management)
const AdminUsers = lazy(() => import("@/pages/admin/Users"));

// Auth components
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";

const ENABLE_AI = (import.meta.env.VITE_ENABLE_AI ?? "true") !== "false";

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Loading...</div>}>
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
            {ENABLE_AI && <Route path="ai" element={<AI />} />}

            {/* Auth routes */}
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="forgot-password" element={<ForgotPassword />} />
            <Route path="reset-password" element={<ResetPassword />} />
            <Route path="verify-email" element={<Login />} />

            {/* Protected routes */}
            <Route path="profile" element={
              <ProtectedRoute>
                <Profile />
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
      </Suspense>
    </BrowserRouter>
  );
}
