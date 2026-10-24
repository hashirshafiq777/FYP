import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

import { AuthProvider } from "../auth/AuthContext";
import { I18nProvider } from "../i18n/I18nProvider";

interface Options {
  /** Initial history entries for MemoryRouter. */
  route?: string;
  /** Wrap in AuthProvider (needed for anything touching sign-in state). */
  withAuth?: boolean;
}

/** Renders a subtree inside the providers the real app mounts. */
export function renderWithProviders(
  ui: ReactElement,
  { route = "/", withAuth = true }: Options = {},
): RenderResult {
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nProvider>
        <MemoryRouter initialEntries={[route]}>
          {withAuth ? <AuthProvider>{children}</AuthProvider> : children}
        </MemoryRouter>
      </I18nProvider>
    );
  }

  return render(ui, { wrapper: Wrapper });
}

export default renderWithProviders;
