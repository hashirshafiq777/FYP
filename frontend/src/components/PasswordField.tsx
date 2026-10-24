import { useId, useState, type KeyboardEvent, type ReactNode, type Ref } from "react";

import { useI18n } from "../i18n/useI18n";
import { EyeIcon, EyeOffIcon } from "./icons";
import TextField from "./TextField";

export interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  hint?: string;
  error?: string;
  autoComplete: "new-password" | "current-password";
  required?: boolean;
  readOnly?: boolean;
  inputRef?: Ref<HTMLInputElement>;
  /** Rendered under the field's messages (the strength meter). */
  children?: ReactNode;
}

/**
 * Password input with its own show/hide toggle and a Caps Lock warning.
 *
 * Each password field owns its toggle — on the sign-up form, revealing the
 * password must not also reveal the confirmation, or the comparison the user
 * is being asked to make is no longer theirs to verify.
 */
export default function PasswordField({
  id,
  label,
  value,
  onChange,
  onBlur,
  hint,
  error,
  autoComplete,
  required,
  readOnly,
  inputRef,
  children,
}: PasswordFieldProps) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const toggleId = useId();

  // `getModifierState` is the only reliable Caps Lock signal, and it is only
  // available on keyboard events — hence both handlers.
  function trackCapsLock(event: KeyboardEvent<HTMLInputElement>) {
    try {
      setCapsLock(event.getModifierState("CapsLock"));
    } catch {
      // Unsupported in some environments; the warning simply never shows.
    }
  }

  const toggleLabel = visible ? t("field.hidePassword") : t("field.showPassword");

  return (
    <TextField
      id={id}
      label={label}
      hint={hint}
      error={error}
      warning={capsLock ? t("field.capsLock") : undefined}
      type={visible ? "text" : "password"}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => {
        setCapsLock(false);
        onBlur?.();
      }}
      onKeyDown={trackCapsLock}
      onKeyUp={trackCapsLock}
      autoComplete={autoComplete}
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      required={required}
      readOnly={readOnly}
      inputRef={inputRef}
      footer={children}
      // Passwords are Latin-entry regardless of UI language, and an RTL input
      // would put the caret and any revealed text on the wrong side.
      dir="ltr"
      trailing={
        <button
          type="button"
          id={toggleId}
          className="field__toggle"
          onClick={() => setVisible((shown) => !shown)}
          aria-label={toggleLabel}
          aria-pressed={visible}
          aria-controls={id}
          title={toggleLabel}
        >
          {visible ? <EyeOffIcon size={19} /> : <EyeIcon size={19} />}
        </button>
      }
    />
  );
}
