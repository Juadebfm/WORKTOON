import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./auth/AuthProvider";
import { CustomerRequestPage } from "./pages/CustomerRequestPage";
import { SupportDashboardPage } from "./pages/SupportDashboardPage";
import { SupportLoginPage } from "./pages/SupportLoginPage";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<CustomerRequestPage />} />
          <Route path="/support/login" element={<SupportLoginPage />} />
          <Route path="/support" element={<SupportDashboardPage />} />
          <Route path="*" element={<CustomerRequestPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
