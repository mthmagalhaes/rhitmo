import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AuthEventProvider } from "./components/AuthEventProvider";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import MemberDetails from "./pages/MemberDetails";
import Analytics from "./pages/Analytics";
import Billing from "./pages/Billing";
import AuthPage from "./pages/AuthPage";
import RhitmoSync from "./pages/RhitmoSync";
import Invite from "./pages/Invite";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import HelpCenter from "./pages/HelpCenter";
import { AdminGuard } from "./components/admin/AdminGuard";
import { AdminLayout } from "./components/admin/AdminLayout";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthEventProvider>
        <BrowserRouter>
          <Routes>
            {/* Landing Page pública com redirect inteligente */}
            <Route path="/" element={<Landing />} />
            
            {/* Auth */}
            <Route path="/auth" element={<AuthPage />} />
            
            {/* Dashboard (antigo Index) - autenticado */}
            <Route path="/dashboard" element={<AppLayout><Index /></AppLayout>} />
            <Route path="/member/:id" element={<AppLayout><MemberDetails /></AppLayout>} />
            <Route path="/analytics" element={<AppLayout><Analytics /></AppLayout>} />
            <Route path="/billing" element={<AppLayout><Billing /></AppLayout>} />
            <Route path="/help" element={<AppLayout><HelpCenter /></AppLayout>} />
            
            {/* Rotas públicas (sem sidebar) */}
            <Route path="/sync/:memberId" element={<RhitmoSync />} />
            <Route path="/invite" element={<Invite />} />
            
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
      </AuthEventProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
