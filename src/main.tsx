import React from "react";
import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { supabase } from "@/integrations/supabase/client";

// Expose supabase client on window for ad-hoc debugging in DevTools console.
// Safe: uses the public anon key + current user session (same as the app).
if (typeof window !== "undefined") {
  (window as unknown as { supabase: typeof supabase }).supabase = supabase;
}

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);
