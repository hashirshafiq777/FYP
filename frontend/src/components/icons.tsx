/**
 * Inline SVG icons.
 *
 * One consistent drawing style throughout: 24px grid, 1.6 stroke, round caps
 * and joins, `currentColor` so every icon inherits its context. No icon
 * library, and never an emoji standing in for an icon.
 *
 * Icons are decorative by default (`aria-hidden`), because in this app every
 * icon sits beside a text label — status and risk are never colour- or
 * icon-only. Pass `title` on the rare icon that must carry meaning alone.
 */

import type { SVGProps } from "react";

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, "children"> {
  /** Width and height in px. Defaults to 20. */
  size?: number;
  /** Accessible name. Omit for decorative icons (the default). */
  title?: string;
}

/** Shared wrapper: handles sizing, stroke defaults and the a11y decision. */
function base({ size = 20, title, className, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: className,
    role: title ? ("img" as const) : undefined,
    "aria-hidden": title ? undefined : (true as const),
    focusable: false as const,
    ...rest,
  };
}

/* ------------------------------------------------------------------- brand */

/**
 * Logomark: a document whose lower half becomes a balance beam.
 * Reads as "legal" and "document" at once, and stays legible at 16px.
 */
export function LogoMark({ size = 28, title, ...rest }: IconProps) {
  return (
    <svg {...base({ size, title, ...rest })} strokeWidth={1.5}>
      {title ? <title>{title}</title> : null}
      <path d="M7 3.75h6.5L17.5 8v5" />
      <path d="M13 3.75V8h4.5" />
      <path d="M7 3.75A1.25 1.25 0 0 0 5.75 5v14A1.25 1.25 0 0 0 7 20.25h10a1.25 1.25 0 0 0 1.25-1.25" />
      <path d="M12 11.5v7" strokeWidth={1.7} />
      <path d="M8.5 13.25h7" strokeWidth={1.7} />
      <path d="M8.5 13.25 7 16.5h3l-1.5-3.25Z" fill="currentColor" fillOpacity={0.18} />
      <path d="M15.5 13.25 14 16.5h3l-1.5-3.25Z" fill="currentColor" fillOpacity={0.18} />
    </svg>
  );
}

/* --------------------------------------------------------------- navigation */

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.4" />
      <rect x="13.5" y="3.5" width="7" height="4.5" rx="1.4" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.4" />
      <rect x="13.5" y="11" width="7" height="9.5" rx="1.4" />
    </svg>
  );
}

export function DocumentsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="M13.5 3.5H7A1.5 1.5 0 0 0 5.5 5v14A1.5 1.5 0 0 0 7 20.5h10a1.5 1.5 0 0 0 1.5-1.5V8.5Z" />
      <path d="M13.5 3.5v5h5" />
      <path d="M8.75 12.5h6.5M8.75 16h4.5" />
    </svg>
  );
}

export function ChatIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="M20.5 12.2c0 4-3.8 7.2-8.5 7.2a9.8 9.8 0 0 1-2.6-.35L4.5 20.5l1.2-3.5A6.9 6.9 0 0 1 3.5 12.2C3.5 8.2 7.3 5 12 5s8.5 3.2 8.5 7.2Z" />
      <path d="M9 11.5h6M9 14.5h3.5" />
    </svg>
  );
}

export function AgreementsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="M18.5 10.5V19A1.5 1.5 0 0 1 17 20.5H7A1.5 1.5 0 0 1 5.5 19V5A1.5 1.5 0 0 1 7 3.5h6" />
      <path d="M8.75 15.5h4" />
      <path d="M19.8 4.2a1.7 1.7 0 0 1 0 2.4l-5.9 5.9-3 .7.7-3 5.9-5.9a1.7 1.7 0 0 1 2.3 0Z" />
    </svg>
  );
}

export function HistoryIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="M3.8 12a8.2 8.2 0 1 0 2.6-6" />
      <path d="M3.5 3.5V8h4.5" />
      <path d="M12 7.75V12l3 1.75" />
    </svg>
  );
}

/* ------------------------------------------------------------- form & state */

export function EyeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3.1" />
    </svg>
  );
}

export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="M9.9 5.76A7.9 7.9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16.4 16.4 0 0 1-2.9 3.75" />
      <path d="M6.4 6.55A16.3 16.3 0 0 0 2.5 12S6 18.5 12 18.5a8.9 8.9 0 0 0 3.8-.85" />
      <path d="M9.9 9.98a3.1 3.1 0 0 0 4.3 4.3" />
      <path d="m3.5 3.5 17 17" />
    </svg>
  );
}

export function AlertTriangleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="M10.7 4.2 2.9 17.5a1.5 1.5 0 0 0 1.3 2.3h15.6a1.5 1.5 0 0 0 1.3-2.3L13.3 4.2a1.5 1.5 0 0 0-2.6 0Z" />
      <path d="M12 9.5v4" />
      <path d="M12 16.75h.01" strokeWidth={2} />
    </svg>
  );
}

export function AlertCircleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.5" />
      <path d="M12 15.75h.01" strokeWidth={2} />
    </svg>
  );
}

export function CheckCircleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <circle cx="12" cy="12" r="8.5" />
      <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
    </svg>
  );
}

export function XCircleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9.5 9.5 5 5M14.5 9.5l-5 5" />
    </svg>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11.25v4.5" />
      <path d="M12 8.25h.01" strokeWidth={2} />
    </svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="m5.5 5.5 13 13M18.5 5.5l-13 13" />
    </svg>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />
    </svg>
  );
}

/** Directional — give it `className="icon-directional"` so RTL mirrors it. */
export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="M4.5 12h15" />
      <path d="m13.5 6 6 6-6 6" />
    </svg>
  );
}

/** Directional — give it `className="icon-directional"` so RTL mirrors it. */
export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="M19.5 12h-15" />
      <path d="m10.5 6-6 6 6 6" />
    </svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="M4.5 15.5V19A1.5 1.5 0 0 0 6 20.5h12a1.5 1.5 0 0 0 1.5-1.5v-3.5" />
      <path d="M12 3.75v11" />
      <path d="m7.75 8 4.25-4.25L16.25 8" />
    </svg>
  );
}

export function DraftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="M4.5 19.5h15" />
      <path d="M6.5 15.8V13l8.3-8.3a1.6 1.6 0 0 1 2.3 0l1 1a1.6 1.6 0 0 1 0 2.3L9.3 16.3Z" />
      <path d="m13.2 6.3 2.8 2.8" />
    </svg>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      {props.title ? <title>{props.title}</title> : null}
      <path d="M12 3.2 5 6v5.2c0 4.2 2.9 7.6 7 9.1 4.1-1.5 7-4.9 7-9.1V6Z" />
      <path d="m9.3 11.9 1.9 1.9 3.6-3.8" />
    </svg>
  );
}

export function SpinnerIcon({ size = 20, title, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={["spinner", className].filter(Boolean).join(" ")}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      focusable={false}
      {...rest}
    >
      {title ? <title>{title}</title> : null}
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth={2} opacity={0.22} />
      <path
        d="M20.5 12A8.5 8.5 0 0 0 12 3.5"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </svg>
  );
}
