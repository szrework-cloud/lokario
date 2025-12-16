import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Tarif from "./pages/Tarif";
import CommentCaMarche from "./pages/CommentCaMarche";
import Fonctionnalites from "./pages/Fonctionnalites";
import FAQPage from "./pages/FAQ";
import APropos from "./pages/APropos";
import Blog from "./pages/Blog";
import Contact from "./pages/Contact";
import Confidentialite from "./pages/Confidentialite";
import CGU from "./pages/CGU";
import CGV from "./pages/CGV";
import MentionsLegales from "./pages/MentionsLegales";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/tarif" element={<Tarif />} />
          <Route path="/comment-ca-marche" element={<CommentCaMarche />} />
          <Route path="/fonctionnalites" element={<Fonctionnalites />} />
          <Route path="/faq" element={<FAQPage />} />
          <Route path="/a-propos" element={<APropos />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
          <Route path="/cgu" element={<CGU />} />
          <Route path="/cgv" element={<CGV />} />
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
