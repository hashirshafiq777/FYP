import type { ReactNode } from "react";

export type ChipTone =
  | "neutral"
  | "high"
  | "medium"
  | "low"
  | "ready"
  | "processing"
  | "failed";

interface ChipProps {
  tone?: ChipTone;
  /** Always paired with the label — status is never colour-only. */
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Small status/severity pill. Icon + text + colour, never colour alone. */
export default function Chip({ tone = "neutral", icon, children, className }: ChipProps) {
  return (
    <span className={["chip", `chip--${tone}`, className].filter(Boolean).join(" ")}>
      {icon}
      <span>{children}</span>
    </span>
  );
}
