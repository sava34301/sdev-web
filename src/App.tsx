import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Launch from "./pages/Launch";
import Index from "./pages/Index";
import IDEPage from "./pages/IDE";
import Dialects from "./pages/Dialects";
import Libraries from "./pages/Libraries";
import Extensions from "./pages/Extensions";
import Auth from "./pages/Auth";
import Account from "./pages/Account";
import Gist from "./pages/Gist";
import Docs from "./pages/Docs";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import NotFound from "./pages/NotFound";
import Unsubscribe from "./pages/Unsubscribe";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* sdev has launched — the site is fully public */}
          <Route path="/" element={<Index />} />
          {/* Legacy link target from the pre-launch site */}
          <Route path="/home" element={<Index />} />
          {/* Archived countdown landing */}
          <Route path="/launch" element={<Launch />} />

          <Route path="/auth" element={<Auth />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/unsubscribe" element={<Unsubscribe />} />

          <Route path="/ide" element={<IDEPage />} />
          <Route path="/dialects" element={<Dialects />} />
          <Route path="/libraries" element={<Libraries />} />
          <Route path="/extensions" element={<Extensions />} />
          <Route path="/account" element={<Account />} />
          <Route path="/g/:slug" element={<Gist />} />
          <Route path="/docs" element={<Docs />} />
          <Route path="/docs/:section" element={<Docs />} />

          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
