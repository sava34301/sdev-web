import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";

const Launch = lazy(() => import("./pages/Launch"));
const IDEPage = lazy(() => import("./pages/IDE"));
const Dialects = lazy(() => import("./pages/Dialects"));
const Libraries = lazy(() => import("./pages/Libraries"));
const Extensions = lazy(() => import("./pages/Extensions"));
const Explore = lazy(() => import("./pages/Explore"));
const MySdev = lazy(() => import("./pages/MySdev"));
const Auth = lazy(() => import("./pages/Auth"));
const Account = lazy(() => import("./pages/Account"));
const Gist = lazy(() => import("./pages/Gist"));
const Docs = lazy(() => import("./pages/Docs"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
const OAuthConsent = lazy(() => import("./pages/OAuthConsent"));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
    Loading…
  </div>
);

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* sdev has launched — the site is fully public */}
            <Route path="/" element={<Index />} />
            {/* Legacy link target from the pre-launch site */}
            <Route path="/home" element={<Index />} />
            {/* Archived countdown landing */}
            <Route path="/launch" element={<Launch />} />

            <Route path="/auth" element={<Auth />} />
            <Route path="/.lovable/oauth/consent" element={<OAuthConsent />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />

            <Route path="/ide" element={<IDEPage />} />
            <Route path="/dialects" element={<Dialects />} />
            <Route path="/libraries" element={<Libraries />} />
            <Route path="/extensions" element={<Extensions />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/my" element={<MySdev />} />
            <Route path="/account" element={<Account />} />
            <Route path="/g/:slug" element={<Gist />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="/docs/:section" element={<Docs />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
