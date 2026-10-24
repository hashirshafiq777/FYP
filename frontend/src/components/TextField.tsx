import type { InputHTMLAttributes, ReactNode, Ref } from "react";

import { AlertCircleIcon } from "./icons";

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "className"> {
  /** Stable id — also used to focus the first invalid field on submit. */
  id: string;
  label: string;
  /** Guidance shown under the field while it is valid. */
  hint?: string;
  /** Translated error text. Presence switches the field into its error state. */
  error?: string;
  /** Extra control rendered inside the field box (e.g. the password eye). */
  trailing?: ReactNode;
  /** Warning strip under the field (Caps Lock), shown alongside any hint. */
  warning?: string;
  /** Advisory content below the messages (e.g. the password strength meter). */
  footer?: ReactNode;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}

/**
 * One labelled text input.
 *
 * Every field has a real visible `<label>`: placeholder-only fields lose their
 * name the moment the user types, and fail for screen readers and translation
 * alike. `aria-describedby` points at whichever of hint / warning / error is
 * currently rendered, so assistive tech reads the same thing the eye sees.
 */
export default function TextField({
  id,
  label,
  hint,
  error,
  trailing,
  warning,
  footer,
  inputRef,
  className,
  required,
  ...inputProps
}: TextFieldProps) {
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const warningId = `${id}-warning`;

  const describedBy =
    [error ? errorId : null, warning ? warningId : null, hint && !error ? hintId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  return (
    <div className={["field", error ? "field--invalid" : "", className].filter(Boolean).join(" ")}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>

      <div className="field__control">
        <input
          id={id}
          ref={inputRef}
          className="field__input"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          aria-required={required || undefined}
          required={required}
          {...inputProps}
        />
        {trailing ? <span className="field__trailing">{trailing}</span> : null}
      </div>

      {warning ? (
        <p className="field__warning" id={warningId}>
          <AlertCircleIcon size={15} />
          <span>{warning}</span>
        </p>
      ) : null}

      {error ? (
        <p className="field__error" id={errorId}>
          <AlertCircleIcon size={15} />
          <span>{error}</span>
        </p>
      ) : hint ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}

      {footer}
    </div>
  );
}
