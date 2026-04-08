import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { ThemeProvider } from "./hooks/useTheme";
import { ThemeColorProvider } from "./hooks/useThemeColor";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { FinanceProvider } from "./hooks/useFinanceStore";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import { UpdatePrompt } from "./components/layout/UpdatePrompt";

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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <BrowserRouter>
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
