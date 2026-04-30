import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { UserProvider } from "@/lib/store";
import Index from "./pages/Index.tsx";
import AuthCallback from "./pages/AuthCallback.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter>
        <AuthProvider>
          <UserProvider>
            <Toaster />
            <Sonner />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </UserProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
