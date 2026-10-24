import type { CSSProperties } from "react";

interface SkeletonProps {
  /** Any CSS length. Defaults to full width. */
  width?: string;
  height?: string;
  /** Pill, for avatars and chips. */
  round?: boolean;
  className?: string;
  style?: CSSProperties;
}

/**
 * Shimmering placeholder block.
 *
 * Always `aria-hidden`: the loading state is announced once by the region's
 * own `aria-busy`, not by a dozen individual placeholders.
 */
export default function Skeleton({
  width = "100%",
  height = "1rem",
  round = false,
  className,
  style,
}: SkeletonProps) {
  return (
    <span
      className={["skeleton", round ? "skeleton--round" : "", className]
        .filter(Boolean)
        .join(" ")}
      style={{ inlineSize: width, blockSize: height, ...style }}
      aria-hidden="true"
    />
  );
}
