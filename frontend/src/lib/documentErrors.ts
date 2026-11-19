import { ApiError } from "../api/client";
import { MAX_UPLOAD_BYTES, type DocumentError } from "../api/documents";
import type { TranslationKey } from "../i18n/en";
import { apiErrorKey } from "./apiErrors";

/** Upload limit in whole megabytes, for the `{size}` placeholder in messages. */
export const MAX_UPLOAD_MB = Math.round(MAX_UPLOAD_BYTES / (1024 * 1024));

const PROCESSING_ERROR: Record<DocumentError, TranslationKey> = {
  unreadable: "documents.error.unreadable",
  no_text: "documents.error.no_text",
  ocr_unavailable: "documents.error.ocr_unavailable",
  internal: "documents.error.internal",
};

/** Why a document ended up `failed`, as a message key. */
export function documentErrorKey(error: DocumentError | null): TranslationKey {
  return (error && PROCESSING_ERROR[error]) || "documents.error.internal";
}

/**
 * Problems that can be told from the file alone, before any bytes are sent.
 * The server checks again (and by content, not by size alone).
 */
export function validateFile(file: File): TranslationKey | null {
  if (file.size === 0) return "documents.error.empty";
  if (file.size > MAX_UPLOAD_BYTES) return "documents.error.tooLarge";
  return null;
}

/** A failed upload request, as a message key. */
export function uploadErrorKey(error: unknown): TranslationKey {
  if (error instanceof ApiError) {
    if (error.code === "file_too_large" || error.status === 413) return "documents.error.tooLarge";
    if (error.code === "unsupported_file_type" || error.status === 415) {
      return "documents.error.unsupported";
    }
    if (error.code === "empty_file") return "documents.error.empty";
  }
  return apiErrorKey(error);
}
