import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import Index from "./pages/Index";
import MemberDetails from "./pages/MemberDetails";
import Analytics from "./pages/Analytics";
import Billing from "./pages/Billing";
import AuthPage from "./pages/AuthPage";
import RhitmoSync from "./pages/RhitmoSync";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import { AdminGuard } from "./components/admin/AdminGuard";
import { AdminLayout } from "./components/admin/AdminLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Rota pública - Login sem sidebar */}
          <Route path="/auth" element={<AuthPage />} />
          
          {/* Rotas autenticadas com sidebar */}
          <Route path="/" element={<AppLayout><Index /></AppLayout>} />
          <Route path="/member/:id" element={<AppLayout><MemberDetails /></AppLayout>} />
          <Route path="/analytics" element={<AppLayout><Analytics /></AppLayout>} />
          <Route path="/billing" element={<AppLayout><Billing /></AppLayout>} />
          
          {/* Rotas públicas (sem sidebar) */}
          <Route path="/sync/:memberId" element={<RhitmoSync />} />
          
          {/* Rota Admin */}
          <Route 
            path="/admin" 
            element={
              <AdminGuard>
                <AdminLayout>
                  <Admin />
                </AdminLayout>
              </AdminGuard>
            } 
          />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
