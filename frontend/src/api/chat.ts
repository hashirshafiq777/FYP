/**
 * Chat API (Module 2). Mirrors `backend/app/schemas/chat.py`.
 *
 * The LLM round-trip is slower than any other request in the app, so `ask`
 * uses its own, longer timeout rather than the 15 s default.
 */

import { request } from "./client";

export type ChatMode = "law" | "document";
export type ChatLanguage = "en" | "ur" | "roman-ur";
export type MessageRole = "user" | "assistant";

export interface Source {
  label: string;
  title: string;
  section: string | null;
  category: string | null;
  kind: "statute" | "case" | "document";
  url: string | null;
  page: number | null;
  excerpt: string;
  score: number;
}

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  language: ChatLanguage | null;
  sources: Source[];
  provider: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  title: string;
  mode: ChatMode;
  language: ChatLanguage;
  document_id: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationList {
  items: Conversation[];
  total: number;
}

export interface ConversationDetail {
  conversation: Conversation;
  messages: ChatMessage[];
}

export interface AskResponse {
  conversation: Conversation;
  question: ChatMessage;
  answer: ChatMessage;
}

export interface ChatStatus {
  providers: string[];
  llm_model: string;
  embedding_model: string;
  law_chunks: number;
  ready: boolean;
}

export const ASK_TIMEOUT_MS = 90_000;

export function fetchChatStatus(signal?: AbortSignal): Promise<ChatStatus> {
  return request<ChatStatus>("/chat/status", { auth: true, signal });
}

export function listConversations(signal?: AbortSignal): Promise<ConversationList> {
  return request<ConversationList>("/chat/conversations?limit=50", { auth: true, signal });
}

export function fetchConversation(id: string, signal?: AbortSignal): Promise<ConversationDetail> {
  return request<ConversationDetail>(`/chat/conversations/${encodeURIComponent(id)}`, {
    auth: true,
    signal,
  });
}

export function deleteConversation(id: string): Promise<void> {
  return request<void>(`/chat/conversations/${encodeURIComponent(id)}`, {
    method: "DELETE",
    auth: true,
  });
}

export function renameConversation(id: string, title: string): Promise<Conversation> {
  return request<Conversation>(`/chat/conversations/${encodeURIComponent(id)}`, {
    method: "PATCH",
    auth: true,
    body: { title },
  });
}

export function ask(
  question: string,
  options: { conversationId?: string | null; mode?: ChatMode; signal?: AbortSignal } = {},
): Promise<AskResponse> {
  return request<AskResponse>("/chat/ask", {
    method: "POST",
    auth: true,
    body: {
      question,
      conversation_id: options.conversationId ?? null,
      mode: options.mode ?? "law",
    },
    signal: options.signal,
    timeoutMs: ASK_TIMEOUT_MS,
  });
}
