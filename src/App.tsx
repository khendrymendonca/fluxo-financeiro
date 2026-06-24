import { lazy, Suspense, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { ThemeProvider } from "./hooks/useTheme";
import { ThemeColorProvider } from "./hooks/useThemeColor";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { FinanceProvider } from "./hooks/useFinanceStore";
import { supabase } from "@/lib/supabase";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import EmailConfirmedPage from "./pages/EmailConfirmedPage";
import EmailResetPasswordPage from "./pages/EmailResetPasswordPage";
import InviteUserPage from "./pages/InviteUserPage";
import MagicLinkAccessPage from "./pages/MagicLinkAccessPage";
import EmailChangedPage from "./pages/EmailChangedPage";
import ReauthenticationPage from "./pages/ReauthenticationPage";
import SuperPage from "./pages/SuperPage";
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

const enableQueryDevtools =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_QUERY_DEVTOOLS === "true";

const ReactQueryDevtools = enableQueryDevtools
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((module) => ({
        default: module.ReactQueryDevtools,
      }))
    )
  : null;

const AppRoutes = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Escuta o evento PASSWORD_RECOVERY do Supabase para redirecionar para a tela de redefinição
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        navigate('/auth/redefinir-senha', { replace: true });
      }
    });

    // Fallback: se o usuário já cair com o hash na URL
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('type%3Drecovery')) {
      navigate('/auth/redefinir-senha', { replace: true });
    }

    return () => subscription.unsubscribe();
  }, [navigate]);

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
    {enableQueryDevtools && ReactQueryDevtools ? (
      <Suspense fallback={null}>
        <ReactQueryDevtools initialIsOpen={false} />
      </Suspense>
    ) : null}
  </QueryClientProvider>
);

export default App;
