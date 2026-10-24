import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { ArrowRightIcon } from "./icons";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  body: string;
  /** Always offer the obvious next step — an empty box with no exit is a dead end. */
  actionLabel?: string;
  actionTo?: string;
}

export default function EmptyState({
  icon,
  title,
  body,
  actionLabel,
  actionTo,
}: EmptyStateProps) {
  return (
    <div className="empty">
      <span className="empty__icon" aria-hidden="true">
        {icon}
      </span>
      <p className="empty__title">{title}</p>
      <p className="empty__body">{body}</p>
      {actionLabel && actionTo ? (
        <Link className="empty__action" to={actionTo}>
          <span>{actionLabel}</span>
          <ArrowRightIcon size={16} className="icon-directional" />
        </Link>
      ) : null}
    </div>
  );
}
