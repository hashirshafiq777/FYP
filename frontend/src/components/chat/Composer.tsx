import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";

import { useI18n } from "../../i18n/useI18n";
import Button from "../Button";
import { ArrowRightIcon } from "../icons";

interface ComposerProps {
  disabled?: boolean;
  sending: boolean;
  onSend: (question: string) => void;
  /** Pre-fills the box (suggested questions). */
  draft?: string;
}

const MAX_LENGTH = 4000;

/**
 * The question box.
 *
 * Enter sends, Shift+Enter inserts a newline — the convention every chat app
 * has trained people on. The textarea grows with its content up to a cap so a
 * long Urdu question never has to be edited through a one-line slit.
 */
export default function Composer({ disabled = false, sending, onSend, draft }: ComposerProps) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // A new draft from the parent (suggested question, or the text handed back
  // after a failed send) replaces the box. Adjusted during render rather than
  // in an effect so there is no extra commit with the old text.
  const [lastDraft, setLastDraft] = useState(draft);
  if (draft !== lastDraft) {
    setLastDraft(draft);
    if (draft !== undefined) setValue(draft);
  }

  useEffect(() => {
    if (draft !== undefined) textareaRef.current?.focus();
  }, [draft]);

  // Auto-grow.
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.blockSize = "auto";
    element.style.blockSize = `${Math.min(element.scrollHeight, 220)}px`;
  }, [value]);

  const submit = useCallback(() => {
    const question = value.trim();
    if (!question || sending || disabled) return;
    onSend(question);
    setValue("");
  }, [value, sending, disabled, onSend]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  return (
    <form className="composer" onSubmit={onSubmit}>
      <label className="visually-hidden" htmlFor="chat-question">
        {t("chat.composer.label")}
      </label>
      <textarea
        id="chat-question"
        ref={textareaRef}
        className="composer__input"
        rows={1}
        maxLength={MAX_LENGTH}
        placeholder={t("chat.composer.placeholder")}
        value={value}
        disabled={disabled}
        dir="auto"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <Button
        type="submit"
        size="sm"
        loading={sending}
        loadingLabel={t("chat.composer.sending")}
        disabled={disabled || value.trim().length === 0}
        icon={<ArrowRightIcon size={16} className="icon-directional" />}
      >
        {t("chat.composer.send")}
      </Button>
      <p className="composer__hint">{t("chat.composer.hint")}</p>
    </form>
  );
}
