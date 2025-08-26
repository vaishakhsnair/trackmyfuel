import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import AddEntry from "./pages/AddEntry";
import History from "./pages/History";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { initGoogleAuth, onAuthStateChanged } from "@/lib/googleAuth";
import { syncPendingToDrive } from "@/lib/drive";
import Profile from "./pages/Profile";
import Bikes from "./pages/Bikes";

const queryClient = new QueryClient();

const AppInner = () => {
  useEffect(() => {
    initGoogleAuth().catch(() => {})
    const unsub = onAuthStateChanged(() => {
      if (navigator.onLine) syncPendingToDrive().catch(() => {})
    })
    const onOnline = () => syncPendingToDrive().catch(() => {})
    const onVis = () => { if (document.visibilityState === 'visible' && navigator.onLine) syncPendingToDrive().catch(() => {}) }
    const interval = setInterval(() => { if (navigator.onLine) syncPendingToDrive().catch(() => {}) }, 5 * 60_000)
    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVis)
    return () => { unsub(); clearInterval(interval); window.removeEventListener('online', onOnline); document.removeEventListener('visibilitychange', onVis) }
  }, [])
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/add-entry" element={<AddEntry />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/bikes" element={<Bikes />} />
        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppInner />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
