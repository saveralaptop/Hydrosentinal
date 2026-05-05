import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { lazy, Suspense, useEffect, useState } from "react";
// import Loader from "./components/Loader.tsx";
import NotFound from "./pages/NotFound.tsx";
import HydroBackground from "./components/HydroBackground";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { Skeleton } from "@/components/ui/skeleton";

const Login = lazy(() => import("./pages/Login.tsx"));
const Index = lazy(() => import("./pages/Index.tsx"));
const UserDashboard = lazy(() => import("./pages/UserDashboard.tsx"));
const AdminPanel = lazy(() => import("./pages/AdminPanel.tsx"));

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute = ({
  children,
  requiredRole,
}: {
  children: React.ReactNode;
  requiredRole?: "user" | "admin";
}) => {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="w-full max-w-3xl space-y-4 px-4">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="h-64 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/" />;
  }

  return children;
};

const AppRoutes = () => {
  const { loading } = useAuth();
  // const [showLoader, setShowLoader] = useState(true);
  //   useEffect(() => {
  //   if (!loading) {
  //     setTimeout(() => {
  //       setShowLoader(false);
  //     }, 800); // minimum display time
  //   }
  // }, [loading]);
  // if (loading || showLoader) {
  //   return <Loader />;
  // }

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-transparent flex items-center justify-center px-4">
          <div className="w-full max-w-3xl space-y-4">
            <Skeleton className="h-8 w-48 rounded-lg" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-24 rounded-2xl" />
              <Skeleton className="h-24 rounded-2xl" />
            </div>
            <Skeleton className="h-64 rounded-3xl" />
          </div>
        </div>
      }
    >
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Index />} />

        {/* User routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="user">
              <UserDashboard />
            </ProtectedRoute>
          }
        />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminPanel />
            </ProtectedRoute>
          }
        />

        {/* Catch all */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
};

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <HydroBackground />
      <div className="app-content-layer">
        <AppErrorBoundary>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AuthProvider>
                <AppRoutes />
              </AuthProvider>
            </BrowserRouter>
          </TooltipProvider>
        </AppErrorBoundary>
      </div>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
