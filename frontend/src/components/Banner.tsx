import type { ReactNode } from "react";

import { AlertTriangleIcon, CheckCircleIcon, InfoIcon } from "./icons";

export type BannerTone = "error" | "success" | "info";

interface BannerProps {
  tone: BannerTone;
  children: ReactNode;
  /** Optional action rendered at the end (e.g. a Retry button). */
  action?: ReactNode;
  className?: string;
}

const ICONS = {
  error: AlertTriangleIcon,
  success: CheckCircleIcon,
  info: InfoIcon,
} as const;

/**
 * Form- and page-level message.
 *
 * Errors use `role="alert"` so they are announced immediately — a failed
 * submit is exactly the case where a screen reader user must not have to go
 * looking. Success and info use `role="status"`, which waits for a pause.
 * Tone is carried by an icon and wording as well as colour.
 */
export default function Banner({ tone, children, action, className }: BannerProps) {
  const Icon = ICONS[tone];

  return (
    <div
      className={["banner", `banner--${tone}`, className].filter(Boolean).join(" ")}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon size={19} className="banner__icon" />
      <div className="banner__body">{children}</div>
      {action ? <div className="banner__action">{action}</div> : null}
    </div>
  );
}
