import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import CreateLaunch from "@/pages/CreateLaunch";
import AudienceDNA from "@/pages/AudienceDNA";
import Experiments from "@/pages/Experiments";
import ExperimentDetail from "@/pages/ExperimentDetail";
import Leaderboard from "@/pages/Leaderboard";
import Analytics from "@/pages/Analytics";
import HowToUse from "@/pages/HowToUse";
import Report from "@/pages/Report";

function Loader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-border border-t-growth animate-spin" />
    </div>
  );
}

function Protected({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <Loader />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/report/:id" element={<Report />} />
      <Route path="/app" element={<Protected><Dashboard /></Protected>} />
      <Route path="/app/launch" element={<Protected><CreateLaunch /></Protected>} />
      <Route path="/app/audiences" element={<Protected><AudienceDNA /></Protected>} />
      <Route path="/app/experiments" element={<Protected><Experiments /></Protected>} />
      <Route path="/app/experiments/:id" element={<Protected><ExperimentDetail /></Protected>} />
      <Route path="/app/leaderboard" element={<Protected><Leaderboard /></Protected>} />
      <Route path="/app/analytics" element={<Protected><Analytics /></Protected>} />
      <Route path="/app/help" element={<Protected><HowToUse /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
          <Toaster position="bottom-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}
