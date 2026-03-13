import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
// ✅ FIX: todos os imports no topo
import { ThemeProvider } from "./hooks/useTheme";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { FinanceProvider } from "./hooks/useFinanceStore";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";

// ✅ FIX: CardsDashboard e ReportsDashboard removidos como rotas diretas —
// a navegação real acontece dentro do Index via currentView.
// Se no futuro migrar para rotas por URL, adicionar de volta aqui.

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

// ✅ FIX: BrowserRouter movido para fora — envolve tudo
// ✅ FIX: QueryClientProvider removido — react-query não é usado no projeto
const App = () => (
  <BrowserRouter>
    <ThemeProvider>
      <TooltipProvider>
        <AuthProvider>
          <FinanceProvider>
            <Toaster />
            <Sonner />
            <AppRoutes />
          </FinanceProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </BrowserRouter>
);

export default App;
