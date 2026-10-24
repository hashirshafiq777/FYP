import type { ButtonHTMLAttributes, ReactNode } from "react";

import { SpinnerIcon } from "./icons";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "md" | "sm";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  /** Shows a spinner, sets `aria-busy` and blocks repeat submits. */
  loading?: boolean;
  /** Text shown while `loading`. Falls back to `children`. */
  loadingLabel?: ReactNode;
  fullWidth?: boolean;
  /** Icon rendered before the label (after it in RTL — it is a flex child). */
  icon?: ReactNode;
}

export default function Button({
  variant = "primary",
  size = "md",
  loading = false,
  loadingLabel,
  fullWidth = false,
  icon,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    "btn",
    `btn--${variant}`,
    size === "sm" ? "btn--sm" : "",
    fullWidth ? "btn--block" : "",
    loading ? "btn--loading" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      // `aria-busy` tells assistive tech the control is working; `disabled`
      // stops the second click that a slow network invites.
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <SpinnerIcon size={18} /> : icon}
      <span>{loading ? (loadingLabel ?? children) : children}</span>
    </button>
  );
}
