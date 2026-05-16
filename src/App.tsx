import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./hooks/useTheme";
import { ThemeColorProvider } from "./hooks/useThemeColor";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { FinanceProvider } from "./hooks/useFinanceStore";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import EmailConfirmedPage from "./pages/EmailConfirmedPage";
import EmailResetPasswordPage from "./pages/EmailResetPasswordPage";
import InviteUserPage from "./pages/InviteUserPage";
import MagicLinkAccessPage from "./pages/MagicLinkAccessPage";
import EmailChangedPage from "./pages/EmailChangedPage";
import ReauthenticationPage from "./pages/ReauthenticationPage";
import SuperPage from "./pages/SuperPage";
import ProjectionPage from "./pages/ProjectionPage";
import NotFound from "./pages/NotFound";
import { UpdatePrompt } from "./components/layout/UpdatePrompt";
import { ProtectedRoute } from "./components/layout/ProtectedRoute";
import { AppBootGate } from "./components/layout/AppBootGate";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 30,
      refetchOnWindowFocus: false,
    },
  },
});

const AppRoutes = () => {
  const { user, loading } = useAuth();

  return (
    <AppBootGate user={user} authLoading={loading}>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <Routes>
          <Route path="/" element={user ? <Index /> : <AuthPage />} />
          <Route path="/auth/confirmado" element={<EmailConfirmedPage />} />
          <Route path="/auth/redefinir-senha" element={<EmailResetPasswordPage />} />
          <Route path="/auth/convite" element={<InviteUserPage />} />
          <Route path="/auth/acesso" element={<MagicLinkAccessPage />} />
          <Route path="/auth/email-alterado" element={<EmailChangedPage />} />
          <Route path="/auth/reautenticacao" element={<ReauthenticationPage />} />
          <Route
            path="/projection"
            element={
              user ? (
                <ProtectedRoute featureKey="debt_strategy" redirectTo="/?view=dashboard">
                  <ProjectionPage />
                </ProtectedRoute>
              ) : (
                <AuthPage />
              )
            }
          />
          <Route path="/super" element={user ? <SuperPage /> : <AuthPage />} />
          <Route path="*" element={user ? <NotFound /> : <AuthPage />} />
        </Routes>
      </div>
    </AppBootGate>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <AuthProvider>
        <ThemeProvider>
          <ThemeColorProvider>
            <TooltipProvider>
              <FinanceProvider>
                <UpdatePrompt />
                <Toaster />
                <Sonner position="bottom-right" closeButton richColors expand={false} />
                <AppRoutes />
              </FinanceProvider>
            </TooltipProvider>
          </ThemeColorProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
    {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
  </QueryClientProvider>
);

export default App;
