import { useCallback, useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import LanguageToggle from "../components/LanguageToggle";
import Logo from "../components/Logo";
import UserMenu from "../components/UserMenu";
import {
  AgreementsIcon,
  ChatIcon,
  CloseIcon,
  DashboardIcon,
  DocumentsIcon,
  HistoryIcon,
  MenuIcon,
  type IconProps,
} from "../components/icons";
import { useAuth } from "../auth/useAuth";
import { initialsFor } from "../lib/initials";
import type { TranslationKey } from "../i18n/en";
import { useI18n } from "../i18n/useI18n";

interface NavItem {
  to: string;
  labelKey: TranslationKey;
  icon: (props: IconProps) => React.JSX.Element;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: DashboardIcon },
  { to: "/documents", labelKey: "nav.documents", icon: DocumentsIcon },
  { to: "/chat", labelKey: "nav.chat", icon: ChatIcon },
  { to: "/agreements", labelKey: "nav.agreements", icon: AgreementsIcon },
  { to: "/history", labelKey: "nav.history", icon: HistoryIcon },
];

const TITLE_BY_PATH: Record<string, TranslationKey> = {
  "/dashboard": "nav.dashboard",
  "/documents": "nav.documents",
  "/chat": "nav.chat",
  "/agreements": "nav.agreements",
  "/history": "nav.history",
};

/** Breakpoint at which the sidebar stops being permanent. Matches shell.css. */
const DRAWER_BREAKPOINT = "(max-width: 63.99rem)";

export default function AppShell() {
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const drawerCloseRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = useCallback((returnFocus = true) => {
    setDrawerOpen(false);
    if (returnFocus) hamburgerRef.current?.focus();
  }, []);

  // Route change closes the drawer — tapping a link should not leave it open
  // over the page it just navigated to. Adjusting state during render (React's
  // documented pattern for "derive from a prop change") avoids the extra
  // commit an effect would cause.
  const [lastPath, setLastPath] = useState(location.pathname);
  if (lastPath !== location.pathname) {
    setLastPath(location.pathname);
    setDrawerOpen(false);
  }

  // If the viewport grows past the breakpoint the sidebar is permanent again,
  // so a drawer left "open" in state would lock scrolling for no reason.
  useEffect(() => {
    const query = window.matchMedia(DRAWER_BREAKPOINT);
    const onChange = (event: MediaQueryListEvent) => {
      if (!event.matches) setDrawerOpen(false);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  // Esc to close, and lock background scroll while the drawer covers the page.
  useEffect(() => {
    if (!drawerOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeDrawer(true);
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    drawerCloseRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen, closeDrawer]);

  const handleSignOut = useCallback(async () => {
    await signOut();
    navigate("/login", { replace: true });
  }, [signOut, navigate]);

  const pageTitleKey = TITLE_BY_PATH[location.pathname];
  const fullName = user?.full_name ?? "";
  const email = user?.email ?? "";

  const navigation = (
    <nav className="shell__nav" aria-label={t("nav.primary")}>
      <ul>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `shell__nav-link${isActive ? " is-active" : ""}`
                }
                aria-current={location.pathname === item.to ? "page" : undefined}
              >
                <Icon size={19} />
                <span>{t(item.labelKey)}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  const userCard = (
    <div className="shell__user">
      <span className="avatar avatar--sm" aria-hidden="true">
        {initialsFor(fullName)}
      </span>
      <span className="shell__user-text">
        <span className="shell__user-name" dir="auto">
          {fullName}
        </span>
        <span className="shell__user-email" dir="ltr">
          {email}
        </span>
      </span>
      <button type="button" className="shell__signout" onClick={handleSignOut}>
        {t("common.signOut")}
      </button>
    </div>
  );

  return (
    <div className="shell">
      <a className="skip-link" href="#main-content">
        {t("common.skipToContent")}
      </a>

      {/* Permanent sidebar — mirrors to the inline-end side in RTL. */}
      <aside className="shell__sidebar on-ink" aria-label={t("nav.primary")}>
        <div className="shell__brand">
          <Logo size={26} inverse />
        </div>
        {navigation}
        <div className="shell__sidebar-foot">{userCard}</div>
      </aside>

      {/* Drawer for narrow viewports. */}
      {drawerOpen ? (
        <div className="shell__backdrop" onClick={() => closeDrawer(false)} aria-hidden="true" />
      ) : null}

      <div
        className={`shell__drawer on-ink${drawerOpen ? " is-open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={t("nav.primary")}
        hidden={!drawerOpen}
      >
        <div className="shell__drawer-head">
          <Logo size={24} inverse />
          <button
            type="button"
            ref={drawerCloseRef}
            className="shell__icon-btn"
            onClick={() => closeDrawer(true)}
            aria-label={t("common.closeNavigation")}
          >
            <CloseIcon size={20} />
          </button>
        </div>
        {navigation}
        <div className="shell__sidebar-foot">{userCard}</div>
      </div>

      <div className="shell__body">
        <header className="shell__topbar">
          <button
            type="button"
            ref={hamburgerRef}
            className="shell__icon-btn shell__hamburger"
            onClick={() => setDrawerOpen(true)}
            aria-label={t("common.openNavigation")}
            aria-expanded={drawerOpen}
          >
            <MenuIcon size={21} />
          </button>

          <h1 className="shell__page-title">
            {pageTitleKey ? t(pageTitleKey) : t("app.name")}
          </h1>

          <div className="shell__topbar-actions">
            <LanguageToggle />
            <UserMenu fullName={fullName} email={email} onSignOut={handleSignOut} />
          </div>
        </header>

        <main className="shell__main" id="main-content">
          <Outlet />
        </main>

        <footer className="shell__footer">
          <p className="muted">{t("app.disclaimer")}</p>
        </footer>
      </div>
    </div>
  );
}
