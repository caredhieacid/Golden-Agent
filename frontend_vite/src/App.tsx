
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

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
