import { useEffect, useId, useRef, useState } from "react";

import { useI18n } from "../i18n/useI18n";
import { initialsFor } from "../lib/initials";
import { ChevronDownIcon } from "./icons";

interface UserMenuProps {
  fullName: string;
  email: string;
  onSignOut: () => void;
}

/**
 * Account dropdown in the top bar.
 *
 * Esc closes it and returns focus to the trigger, a click anywhere outside
 * closes it, and the first item takes focus on open — so the menu is fully
 * usable without a pointer, which a hover-revealed menu never is.
 */
export default function UserMenu({ fullName, email, onSignOut }: UserMenuProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLButtonElement>(null);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        close(true);
      }
    }

    function onPointerDown(event: MouseEvent | TouchEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        // Closing without stealing focus: the user is clicking something else.
        close(false);
      }
    }

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    firstItemRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        type="button"
        ref={triggerRef}
        className="user-menu__trigger"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={t("common.userMenu")}
      >
        <span className="avatar" aria-hidden="true">
          {initialsFor(fullName)}
        </span>
        <span className="user-menu__name" dir="auto">
          {fullName}
        </span>
        <ChevronDownIcon size={16} className={open ? "is-flipped" : undefined} />
      </button>

      {open ? (
        <div className="user-menu__panel" id={menuId} role="menu">
          <div className="user-menu__identity" role="presentation">
            <span className="user-menu__identity-name" dir="auto">
              {fullName}
            </span>
            <span className="user-menu__identity-email" dir="ltr">
              {email}
            </span>
          </div>
          <button
            type="button"
            ref={firstItemRef}
            role="menuitem"
            className="user-menu__item"
            onClick={() => {
              setOpen(false);
              onSignOut();
            }}
          >
            {t("common.signOut")}
          </button>
        </div>
      ) : null}
    </div>
  );
}
