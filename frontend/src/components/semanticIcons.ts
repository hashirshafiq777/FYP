import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  SpinnerIcon,
  XCircleIcon,
} from "./icons";

/**
 * Severity and status glyph maps.
 *
 * Kept out of `icons.tsx` so that file exports components only (which keeps
 * fast refresh working), and gathered here so every risk level and every
 * processing status has exactly one agreed shape across the app.
 *
 * Each level has a *distinct* glyph, not just a distinct colour: that is what
 * makes the chips readable in greyscale and for a colour-blind reader.
 */
export const RiskIcon = {
  high: AlertTriangleIcon,
  medium: AlertCircleIcon,
  low: CheckCircleIcon,
} as const;

export const StatusIcon = {
  ready: CheckCircleIcon,
  processing: SpinnerIcon,
  failed: XCircleIcon,
} as const;
