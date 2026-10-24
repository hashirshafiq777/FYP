import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

// Self-hosted fonts: the app must work offline, so nothing is fetched from a
// CDN. Each package sets `font-display: swap` and ships unicode-range subsets,
// so a browser only downloads the scripts it actually renders.
import "@fontsource-variable/fraunces";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource/noto-naskh-arabic/400.css";
import "@fontsource/noto-naskh-arabic/500.css";
import "@fontsource/noto-naskh-arabic/600.css";
import "@fontsource/noto-nastaliq-urdu/400.css";
import "@fontsource/noto-nastaliq-urdu/600.css";

import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { I18nProvider } from "./i18n/I18nProvider";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/auth.css";
import "./styles/shell.css";
import "./styles/dashboard.css";

const container = document.getElementById("root");
if (!container) throw new Error('Root element "#root" was not found.');

createRoot(container).render(
  <StrictMode>
    <I18nProvider>
      <BrowserRouter>
        {/* AuthProvider needs the router: an expired token redirects to login. */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </I18nProvider>
  </StrictMode>,
);
