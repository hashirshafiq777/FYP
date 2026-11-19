/**
 * Documents API (Module 3). Mirrors `backend/app/schemas/document.py`.
 *
 * An upload returns at once with `status: "queued"`; the text is extracted in
 * the background, so the caller polls with `waitForDocument` until the record
 * settles on `ready` or `failed`.
 */

import { request } from "./client";

export type DocumentStatus = "queued" | "extracting" | "ocr" | "indexing" | "ready" | "failed";
export type DocumentError = "unreadable" | "no_text" | "ocr_unavailable" | "internal";
export type DocumentType = "contract" | "policy" | "scan" | "agreement" | "identity" | "other";

export interface DocumentSummary {
  id: string;
  title: string;
  language: "en" | "ur";
  doc_type: DocumentType;
  status: DocumentStatus;
  error: DocumentError | null;
  filename: string | null;
  content_type: string | null;
  size_bytes: number | null;
  page_count: number;
  /** Pages with no text at all: blank, or a scan that could not be read. */
  pages_unread?: number;
  char_count: number;
  ocr_used: boolean;
  /** Specific kind read from the text: "cnic", "rent_agreement", … */
  detected_kind: string | null;
  summary: string | null;
  field_count: number;
  created_at: string;
  updated_at: string;
}

export interface DocumentPage {
  page: number;
  text: string;
  method: "text" | "ocr";
}

export interface DocumentField {
  key: string;
  label: string;
  value: string;
}

export interface DocumentDetail extends DocumentSummary {
  pages: DocumentPage[];
  fields: DocumentField[];
}

export interface DocumentList {
  items: DocumentSummary[];
  total: number;
}

/** Kept in step with the backend's MAX_UPLOAD_MB default, to refuse early with a clear message. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png,.webp,.docx,.txt";

/** A large scan over a slow link takes a while to send. */
export const UPLOAD_TIMEOUT_MS = 120_000;
const POLL_INTERVAL_MS = 1500;
/** OCR of a many-page scan is the slow case; give up waiting (not processing) after this. */
const POLL_LIMIT_MS = 5 * 60_000;

export function isSettled(status: DocumentStatus): boolean {
  return status === "ready" || status === "failed";
}

export function listDocuments(signal?: AbortSignal): Promise<DocumentList> {
  return request<DocumentList>("/documents?limit=100", { auth: true, signal });
}

export function fetchDocument(id: string, signal?: AbortSignal): Promise<DocumentDetail> {
  return request<DocumentDetail>(`/documents/${encodeURIComponent(id)}`, { auth: true, signal });
}

export function uploadDocument(file: File, signal?: AbortSignal): Promise<DocumentSummary> {
  const form = new FormData();
  form.append("file", file, file.name);
  return request<DocumentSummary>("/documents/upload", {
    method: "POST",
    auth: true,
    form,
    signal,
    timeoutMs: UPLOAD_TIMEOUT_MS,
  });
}

export function reprocessDocument(id: string): Promise<DocumentSummary> {
  return request<DocumentSummary>(`/documents/${encodeURIComponent(id)}/reprocess`, {
    method: "POST",
    auth: true,
  });
}

export function deleteDocument(id: string): Promise<void> {
  return request<void>(`/documents/${encodeURIComponent(id)}`, { method: "DELETE", auth: true });
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Poll one document until its text is ready (or it failed).
 *
 * `onUpdate` fires on every poll so the UI can show the stage it is in
 * ("reading the scan…"). Rejects with an AbortError when `signal` aborts.
 */
export async function waitForDocument(
  id: string,
  options: {
    signal?: AbortSignal;
    onUpdate?: (document: DocumentDetail) => void;
    intervalMs?: number;
  } = {},
): Promise<DocumentDetail> {
  const { signal, onUpdate, intervalMs = POLL_INTERVAL_MS } = options;
  const deadline = Date.now() + POLL_LIMIT_MS;
  for (;;) {
    const document = await fetchDocument(id, signal);
    onUpdate?.(document);
    if (isSettled(document.status) || Date.now() > deadline) return document;
    await delay(intervalMs, signal);
  }
}

/** "1.4 MB", "320 KB". */
export function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
