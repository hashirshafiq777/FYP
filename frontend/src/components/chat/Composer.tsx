import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import { ACCEPTED_FILE_TYPES } from "../../api/documents";
import type { TranslationKey } from "../../i18n/en";
import { useI18n } from "../../i18n/useI18n";
import { MAX_UPLOAD_MB } from "../../lib/documentErrors";
import Button from "../Button";
import {
  AlertTriangleIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  CloseIcon,
  DocumentsIcon,
  PaperclipIcon,
  SpinnerIcon,
} from "../icons";

/** A file the user attached to the question box, and how far along it is. */
export interface Attachment {
  name: string;
  stage: "uploading" | "reading" | "ready" | "failed";
  /** Set once the upload has been accepted. */
  documentId?: string;
  /** Why it failed, when `stage` is "failed". */
  errorKey?: TranslationKey;
}

interface ComposerProps {
  disabled?: boolean;
  sending: boolean;
  onSend: (question: string) => void;
  /** Pre-fills the box (suggested questions). */
  draft?: string;
  attachment?: Attachment | null;
  onAttach?: (file: File) => void;
  onRemoveAttachment?: () => void;
  /** The thread answers from a document: changes the placeholder only. */
  documentMode?: boolean;
}

const MAX_LENGTH = 4000;

const STAGE_LABEL: Record<Exclude<Attachment["stage"], "failed">, TranslationKey> = {
  uploading: "chat.attach.uploading",
  reading: "chat.attach.reading",
  ready: "chat.attach.ready",
};

/**
 * The question box.
 *
 * Enter sends, Shift+Enter inserts a newline — the convention every chat app
 * has trained people on. The textarea grows with its content up to a cap so a
 * long Urdu question never has to be edited through a one-line slit.
 *
 * The paperclip attaches one document or image. The file is uploaded and read
 * by the parent; this component only shows where that has got to, and holds
 * the Send button back until the file's text is actually available.
 */
export default function Composer({
  disabled = false,
  sending,
  onSend,
  draft,
  attachment = null,
  onAttach,
  onRemoveAttachment,
  documentMode = false,
}: ComposerProps) {
  const { t } = useI18n();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Once the attached file is readable, put the cursor back in the box.
  const attachmentStage = attachment?.stage;
  useEffect(() => {
    if (attachmentStage === "ready") textareaRef.current?.focus();
  }, [attachmentStage]);

  const attachmentBusy = attachmentStage === "uploading" || attachmentStage === "reading";

  const submit = useCallback(() => {
    const question = value.trim();
    if (!question || sending || disabled || attachmentBusy) return;
    onSend(question);
    setValue("");
  }, [value, sending, disabled, attachmentBusy, onSend]);

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

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset so picking the same file again (after removing it) still fires.
    event.target.value = "";
    if (file) onAttach?.(file);
  };

  return (
    <form className="composer" onSubmit={onSubmit}>
      {attachment ? (
        <div
          className={`composer__attachment composer__attachment--${attachment.stage}`}
          role={attachment.stage === "failed" ? "alert" : "status"}
        >
          <span className="composer__attachment-icon" aria-hidden="true">
            {attachmentBusy ? (
              <SpinnerIcon size={16} />
            ) : attachment.stage === "failed" ? (
              <AlertTriangleIcon size={16} />
            ) : (
              <DocumentsIcon size={16} />
            )}
          </span>
          <span className="composer__attachment-text">
            <span className="composer__attachment-name" dir="auto">
              {attachment.name}
            </span>
            <span className="composer__attachment-state">
              {attachment.stage === "ready" ? <CheckCircleIcon size={13} /> : null}
              <span>
                {attachment.stage === "failed"
                  ? t(attachment.errorKey ?? "documents.error.internal", { size: MAX_UPLOAD_MB })
                  : t(STAGE_LABEL[attachment.stage])}
              </span>
            </span>
          </span>
          <button
            type="button"
            className="composer__attachment-remove"
            aria-label={t("chat.attach.remove")}
            title={t("chat.attach.remove")}
            onClick={onRemoveAttachment}
          >
            <CloseIcon size={14} />
          </button>
        </div>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        className="visually-hidden"
        accept={ACCEPTED_FILE_TYPES}
        // The visible paperclip button is the control; this input is its mechanism.
        aria-hidden="true"
        data-testid="chat-file-input"
        tabIndex={-1}
        onChange={onFileChange}
      />
      <button
        type="button"
        className="composer__attach"
        aria-label={t("chat.attach")}
        title={t("chat.attach")}
        disabled={disabled || sending || attachmentBusy || !onAttach}
        onClick={() => fileInputRef.current?.click()}
      >
        <PaperclipIcon size={19} />
      </button>

      <label className="visually-hidden" htmlFor="chat-question">
        {t("chat.composer.label")}
      </label>
      <textarea
        id="chat-question"
        ref={textareaRef}
        className="composer__input"
        rows={1}
        maxLength={MAX_LENGTH}
        placeholder={t(
          documentMode || attachment?.stage === "ready"
            ? "chat.composer.placeholderDocument"
            : "chat.composer.placeholder",
        )}
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
        disabled={disabled || attachmentBusy || value.trim().length === 0}
        icon={<ArrowRightIcon size={16} className="icon-directional" />}
      >
        {t("chat.composer.send")}
      </Button>
      <p className="composer__hint">{t("chat.composer.hint")}</p>
    </form>
  );
}
