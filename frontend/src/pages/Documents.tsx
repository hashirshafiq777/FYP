import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ApiError } from "../api/client";
import {
  ACCEPTED_FILE_TYPES,
  deleteDocument,
  fetchDocument,
  formatFileSize,
  isSettled,
  listDocuments,
  reprocessDocument,
  uploadDocument,
  type DocumentDetail,
  type DocumentStatus,
  type DocumentSummary,
} from "../api/documents";
import Banner from "../components/Banner";
import Button from "../components/Button";
import Chip, { type ChipTone } from "../components/Chip";
import {
  ChatIcon,
  CheckCircleIcon,
  DocumentsIcon,
  RefreshIcon,
  SpinnerIcon,
  TrashIcon,
  UploadIcon,
  XCircleIcon,
} from "../components/icons";
import Skeleton from "../components/Skeleton";
import useDocumentTitle from "../hooks/useDocumentTitle";
import en, { type TranslationKey } from "../i18n/en";
import { useI18n } from "../i18n/useI18n";
import { apiErrorKey } from "../lib/apiErrors";
import {
  documentErrorKey,
  MAX_UPLOAD_MB,
  uploadErrorKey,
  validateFile,
} from "../lib/documentErrors";

/** How often the list is refreshed while a document is still being read. */
const POLL_INTERVAL_MS = 1500;

const STATUS_LABEL: Record<DocumentStatus, TranslationKey> = {
  queued: "documents.status.queued",
  extracting: "documents.status.extracting",
  ocr: "documents.status.ocr",
  indexing: "documents.status.indexing",
  ready: "documents.status.ready",
  failed: "documents.status.failed",
};

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function statusTone(status: DocumentStatus): ChipTone {
  if (status === "ready") return "ready";
  if (status === "failed") return "failed";
  return "processing";
}

/** A dictionary key built from server data, if the dictionary has it. */
function knownKey(candidate: string): TranslationKey | null {
  return candidate in en ? (candidate as TranslationKey) : null;
}

function StatusChip({ status }: { status: DocumentStatus }) {
  const { t } = useI18n();
  const icon =
    status === "ready" ? (
      <CheckCircleIcon size={13} />
    ) : status === "failed" ? (
      <XCircleIcon size={13} />
    ) : (
      <SpinnerIcon size={13} />
    );
  return (
    <Chip tone={statusTone(status)} icon={icon}>
      {t(STATUS_LABEL[status])}
    </Chip>
  );
}

/**
 * Documents: upload a file, watch its text being read, and see what was found.
 *
 * Two things come out of every upload. The **text**, page by page, is what the
 * chat answers from. The **details** (name, CNIC number, dates, parties…) are
 * the facts a future agreement form will pre-fill from, shown here so the user
 * can see exactly what was understood before anything relies on it.
 */
export default function Documents() {
  const { t, formatDate } = useI18n();
  const navigate = useNavigate();
  const { documentId } = useParams<{ documentId: string }>();
  useDocumentTitle(t("documents.documentTitle"));

  const [documents, setDocuments] = useState<DocumentSummary[] | null>(null);
  const [listError, setListError] = useState<TranslationKey | null>(null);
  const [uploadingName, setUploadingName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<TranslationKey | null>(null);
  const [dragging, setDragging] = useState(false);
  // The loaded detail remembers which document it is for, so a stale one is
  // never shown under another document's heading while the next one loads.
  const [detail, setDetail] = useState<DocumentDetail | null>(null);
  const [detailError, setDetailError] = useState<TranslationKey | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [busyAction, setBusyAction] = useState<"delete" | "retry" | null>(null);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ------------------------------------------------------------------ list
  useEffect(() => {
    const controller = new AbortController();
    listDocuments(controller.signal)
      .then((result) => setDocuments(result.items))
      .catch((err: unknown) => {
        if (isAbort(err)) return;
        setDocuments([]);
        setListError(apiErrorKey(err));
      });
    return () => controller.abort();
  }, []);

  // While anything is still being read, keep the list fresh so its status
  // moves on its own. Stops as soon as every document has settled.
  const anyInProgress = (documents ?? []).some((item) => !isSettled(item.status));
  useEffect(() => {
    if (!anyInProgress) return;
    const controller = new AbortController();
    const timer = setInterval(() => {
      listDocuments(controller.signal)
        .then((result) => setDocuments(result.items))
        .catch(() => undefined); // A missed poll is retried by the next tick.
    }, POLL_INTERVAL_MS);
    return () => {
      clearInterval(timer);
      controller.abort();
    };
  }, [anyInProgress]);

  // ---------------------------------------------------------------- detail
  const selected = (documents ?? []).find((item) => item.id === documentId) ?? null;
  // Refetch when the selected record changes underneath us (status moved on).
  const selectedVersion = selected ? `${selected.status}:${selected.updated_at}` : "";

  useEffect(() => {
    if (!documentId) return;
    const controller = new AbortController();
    fetchDocument(documentId, controller.signal)
      .then((result) => {
        setDetail(result);
        setDetailError(null);
      })
      .catch((err: unknown) => {
        if (isAbort(err)) return;
        if (err instanceof ApiError && err.kind === "not_found") {
          navigate("/documents", { replace: true });
          return;
        }
        setDetailError(apiErrorKey(err));
      });
    return () => controller.abort();
  }, [documentId, selectedVersion, navigate]);

  // Leaving a document resets the things that belonged to it.
  const [lastDocumentId, setLastDocumentId] = useState(documentId);
  if (lastDocumentId !== documentId) {
    setLastDocumentId(documentId);
    setConfirmingDelete(false);
    setCopied(false);
    setDetailError(null);
  }

  const shownDetail = detail !== null && detail.id === documentId ? detail : null;

  // ---------------------------------------------------------------- upload
  const handleFile = useCallback(
    async (file: File) => {
      setUploadError(null);
      const invalid = validateFile(file);
      if (invalid) {
        setUploadError(invalid);
        return;
      }
      setUploadingName(file.name);
      try {
        const uploaded = await uploadDocument(file);
        setDocuments((current) => [uploaded, ...(current ?? [])]);
        navigate(`/documents/${uploaded.id}`);
      } catch (err: unknown) {
        setUploadError(uploadErrorKey(err));
      } finally {
        setUploadingName(null);
      }
    },
    [navigate],
  );

  const onFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = ""; // So the same file can be chosen again.
    if (file) void handleFile(file);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file && uploadingName === null) void handleFile(file);
  };

  // --------------------------------------------------------------- actions
  const handleDelete = useCallback(async () => {
    if (!documentId) return;
    setBusyAction("delete");
    try {
      await deleteDocument(documentId);
      setDocuments((current) => (current ?? []).filter((item) => item.id !== documentId));
      navigate("/documents", { replace: true });
    } catch (err: unknown) {
      setDetailError(apiErrorKey(err));
    } finally {
      setBusyAction(null);
      setConfirmingDelete(false);
    }
  }, [documentId, navigate]);

  const handleRetry = useCallback(async () => {
    if (!documentId) return;
    setBusyAction("retry");
    try {
      const requeued = await reprocessDocument(documentId);
      setDocuments((current) =>
        (current ?? []).map((item) => (item.id === requeued.id ? requeued : item)),
      );
    } catch (err: unknown) {
      setDetailError(apiErrorKey(err));
    } finally {
      setBusyAction(null);
    }
  }, [documentId]);

  const handleCopy = useCallback(async () => {
    if (!shownDetail) return;
    const text = shownDetail.pages.map((page) => page.text).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false); // Clipboard blocked: the text is still on screen to select.
    }
  }, [shownDetail]);

  const kindLabel = (kind: string | null): string | null => {
    if (!kind) return null;
    return t(knownKey(`documents.kind.${kind}`) ?? "documents.kind.other");
  };

  // The freshest status wins: the list is polled, the detail is fetched on change.
  const current = shownDetail ?? selected;
  const currentStatus = selected?.status ?? shownDetail?.status ?? null;
  const inProgress = currentStatus !== null && !isSettled(currentStatus);

  return (
    <div className="docs">
      <header className="docs__header">
        <h2 className="docs__title">{t("documents.title")}</h2>
        <p className="docs__subtitle">{t("documents.subtitle")}</p>
      </header>

      {/* ------------------------------------------------------------ upload */}
      <section className="card docs__upload" aria-labelledby="docs-upload-title">
        <div
          className={`dropzone${dragging ? " is-dragging" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <span className="dropzone__icon" aria-hidden="true">
            <UploadIcon size={22} />
          </span>
          <div className="dropzone__text">
            <h3 className="dropzone__title" id="docs-upload-title">
              {t("documents.upload.title")}
            </h3>
            <p className="dropzone__hint">{t("documents.upload.hint", { size: MAX_UPLOAD_MB })}</p>
            <p className="dropzone__privacy">{t("documents.upload.privacy")}</p>
          </div>
          <div className="dropzone__action">
            <span className="dropzone__or">{t("documents.upload.drop")}</span>
            <Button
              icon={<UploadIcon size={17} />}
              loading={uploadingName !== null}
              loadingLabel={t("documents.upload.uploading", { name: uploadingName ?? "" })}
              onClick={() => fileInputRef.current?.click()}
            >
              {t("documents.upload.choose")}
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="visually-hidden"
            accept={ACCEPTED_FILE_TYPES}
            aria-hidden="true"
            data-testid="documents-file-input"
            tabIndex={-1}
            onChange={onFileChange}
          />
        </div>
        {uploadError ? (
          <Banner tone="error" className="docs__notice">
            {t(uploadError, { size: MAX_UPLOAD_MB })}
          </Banner>
        ) : null}
      </section>

      <div className="docs__grid">
        {/* ---------------------------------------------------------- list */}
        <section className="card docs__list" aria-labelledby="docs-list-title">
          <header className="card__head">
            <h3 className="card__title" id="docs-list-title">
              {t("documents.list.title")}
            </h3>
            {documents && documents.length > 0 ? (
              <span className="card__count">{documents.length}</span>
            ) : null}
          </header>

          {listError ? <Banner tone="error">{t(listError)}</Banner> : null}

          {documents === null ? (
            <ul className="doc-list" aria-busy="true">
              {Array.from({ length: 3 }, (_, index) => (
                <li className="doc-list__item" key={index}>
                  <Skeleton width="65%" height="0.95rem" />
                  <Skeleton width="40%" height="0.75rem" style={{ marginBlockStart: "0.45rem" }} />
                </li>
              ))}
            </ul>
          ) : documents.length === 0 ? (
            listError ? null : (
              <div className="empty">
                <span className="empty__icon" aria-hidden="true">
                  <DocumentsIcon size={22} />
                </span>
                <p className="empty__title">{t("documents.list.empty.title")}</p>
                <p className="empty__body">{t("documents.list.empty.body")}</p>
              </div>
            )
          ) : (
            <ul className="doc-list">
              {documents.map((item) => {
                const active = item.id === documentId;
                return (
                  <li className="doc-list__item" key={item.id}>
                    <button
                      type="button"
                      className={`doc-list__open${active ? " is-active" : ""}`}
                      aria-current={active ? "true" : undefined}
                      onClick={() => navigate(`/documents/${item.id}`)}
                    >
                      <span className="doc-list__title" dir="auto">
                        {item.title}
                      </span>
                      <span className="doc-list__meta">
                        <StatusChip status={item.status} />
                        {kindLabel(item.detected_kind) ? (
                          <Chip>{kindLabel(item.detected_kind)}</Chip>
                        ) : null}
                        <span className="doc-list__date">{formatDate(item.created_at)}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* -------------------------------------------------------- detail */}
        <section className="card docs__detail" aria-live="polite">
          {!documentId ? (
            <div className="empty">
              <span className="empty__icon" aria-hidden="true">
                <DocumentsIcon size={22} />
              </span>
              <p className="empty__body">{t("documents.detail.pick")}</p>
            </div>
          ) : current === null ? (
            detailError ? (
              <Banner tone="error">{t(detailError)}</Banner>
            ) : (
              <div aria-busy="true">
                <Skeleton width="55%" height="1.3rem" />
                <Skeleton width="35%" height="0.8rem" style={{ marginBlockStart: "0.6rem" }} />
                <Skeleton width="100%" height="6rem" style={{ marginBlockStart: "1.2rem" }} />
              </div>
            )
          ) : (
            <>
              <header className="doc-detail__head">
                <div className="doc-detail__heading">
                  <h3 className="doc-detail__title" dir="auto">
                    {current.title}
                  </h3>
                  <p className="doc-detail__meta">
                    {currentStatus ? <StatusChip status={currentStatus} /> : null}
                    {kindLabel(current.detected_kind) ? (
                      <Chip>{kindLabel(current.detected_kind)}</Chip>
                    ) : null}
                    {current.ocr_used ? <Chip>{t("documents.detail.ocr")}</Chip> : null}
                    {current.page_count > 0 ? (
                      <span>{t("documents.pages", { count: current.page_count })}</span>
                    ) : null}
                    {current.filename ? (
                      <span className="doc-detail__file" dir="ltr">
                        {current.filename}
                        {current.size_bytes !== null
                          ? ` · ${formatFileSize(current.size_bytes)}`
                          : ""}
                      </span>
                    ) : null}
                  </p>
                </div>
                <div className="doc-detail__actions">
                  {currentStatus === "ready" ? (
                    <Button
                      size="sm"
                      icon={<ChatIcon size={16} />}
                      onClick={() =>
                        navigate("/chat", {
                          state: { attachDocument: { id: current.id, title: current.title } },
                        })
                      }
                    >
                      {t("documents.detail.ask")}
                    </Button>
                  ) : null}
                  {confirmingDelete ? (
                    <>
                      <Button
                        size="sm"
                        variant="danger"
                        loading={busyAction === "delete"}
                        onClick={() => void handleDelete()}
                      >
                        {t("documents.detail.confirmDelete")}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                        {t("documents.detail.cancel")}
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={<TrashIcon size={16} />}
                      onClick={() => setConfirmingDelete(true)}
                    >
                      {t("documents.detail.delete")}
                    </Button>
                  )}
                </div>
              </header>

              {detailError ? <Banner tone="error">{t(detailError)}</Banner> : null}

              {inProgress && currentStatus ? (
                <div className="doc-detail__progress" role="status">
                  <SpinnerIcon size={20} />
                  <div>
                    <p className="doc-detail__progress-stage">{t(STATUS_LABEL[currentStatus])}…</p>
                    <p className="doc-detail__progress-hint">{t("documents.detail.working")}</p>
                  </div>
                </div>
              ) : currentStatus === "failed" ? (
                <Banner
                  tone="error"
                  action={
                    current.filename ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={<RefreshIcon size={16} />}
                        loading={busyAction === "retry"}
                        onClick={() => void handleRetry()}
                      >
                        {t("documents.detail.retry")}
                      </Button>
                    ) : undefined
                  }
                >
                  {t(documentErrorKey(current.error))}
                </Banner>
              ) : shownDetail ? (
                <>
                  {shownDetail.summary ? (
                    <p className="doc-detail__summary" dir="auto">
                      {shownDetail.summary}
                    </p>
                  ) : null}

                  {(shownDetail.pages_unread ?? 0) > 0 ? (
                    <Banner
                      tone="info"
                      action={
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<RefreshIcon size={16} />}
                          loading={busyAction === "retry"}
                          onClick={() => void handleRetry()}
                        >
                          {t("documents.detail.retry")}
                        </Button>
                      }
                    >
                      {t("documents.detail.unread", { count: shownDetail.pages_unread ?? 0 })}
                    </Banner>
                  ) : null}

                  <section className="doc-detail__section" aria-labelledby="doc-fields-title">
                    <h4 className="doc-detail__subtitle" id="doc-fields-title">
                      {t("documents.detail.fields")}
                    </h4>
                    {shownDetail.fields.length === 0 ? (
                      <p className="doc-detail__muted">{t("documents.detail.noFields")}</p>
                    ) : (
                      <>
                        <dl className="fields">
                          {shownDetail.fields.map((field) => {
                            const labelKey = knownKey(`documents.field.${field.key}`);
                            return (
                              <div className="fields__row" key={field.key}>
                                <dt className="fields__label">
                                  {labelKey ? t(labelKey) : field.label}
                                </dt>
                                <dd className="fields__value" dir="auto">
                                  {field.value}
                                </dd>
                              </div>
                            );
                          })}
                        </dl>
                        <p className="doc-detail__muted">{t("documents.detail.fieldsHint")}</p>
                      </>
                    )}
                  </section>

                  <section className="doc-detail__section" aria-labelledby="doc-text-title">
                    <div className="doc-detail__section-head">
                      <h4 className="doc-detail__subtitle" id="doc-text-title">
                        {t("documents.detail.text")}
                      </h4>
                      <Button size="sm" variant="ghost" onClick={() => void handleCopy()}>
                        {t(copied ? "documents.detail.copied" : "documents.detail.copy")}
                      </Button>
                    </div>
                    <ol className="doc-pages">
                      {shownDetail.pages.map((page) => (
                        <li className="doc-pages__page" key={page.page}>
                          <p className="doc-pages__label">
                            <span>{t("documents.detail.page", { page: page.page })}</span>
                            {page.method === "ocr" ? (
                              <Chip>{t("documents.detail.ocr")}</Chip>
                            ) : null}
                          </p>
                          <p className="doc-pages__text" dir="auto">
                            {page.text}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </section>
                </>
              ) : (
                <div aria-busy="true">
                  <Skeleton width="100%" height="6rem" />
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}
