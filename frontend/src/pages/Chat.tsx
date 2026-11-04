import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import {
  ask,
  deleteConversation,
  fetchChatStatus,
  fetchConversation,
  listConversations,
  type ChatMessage,
  type ChatStatus,
  type Conversation,
} from "../api/chat";
import { ApiError } from "../api/client";
import Banner from "../components/Banner";
import Button from "../components/Button";
import Composer from "../components/chat/Composer";
import MessageBubble from "../components/chat/MessageBubble";
import { ChatIcon, CloseIcon, DraftIcon, MenuIcon, ShieldIcon } from "../components/icons";
import Skeleton from "../components/Skeleton";
import useDocumentTitle from "../hooks/useDocumentTitle";
import type { TranslationKey } from "../i18n/en";
import { useI18n } from "../i18n/useI18n";
import { apiErrorKey } from "../lib/apiErrors";

/** Starter questions, one per supported input language, so the demo shows all three. */
const SUGGESTIONS: TranslationKey[] = [
  "chat.suggest.1",
  "chat.suggest.2",
  "chat.suggest.3",
  "chat.suggest.4",
];

function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export default function Chat() {
  const { t, formatRelativeTime } = useI18n();
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  useDocumentTitle(t("chat.documentTitle"));

  const [status, setStatus] = useState<ChatStatus | null>(null);
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  // The loaded thread carries the conversation it belongs to, so `messages`
  // is derived: a thread for another id (or a not-yet-fetched one) reads as
  // "loading" instead of flashing stale messages while the fetch is in flight.
  const threadKey = conversationId ?? "new";
  const [thread, setThread] = useState<{ key: string; messages: ChatMessage[] }>({
    key: "new",
    messages: [],
  });
  // A blank conversation has nothing to fetch, so it never reads as loading.
  // The stale thread is left in state on purpose: router navigation lands in
  // a transition after the state update from a send, and resetting here would
  // wipe the answer that navigation is about to show.
  const messages: ChatMessage[] | null =
    thread.key === threadKey ? thread.messages : threadKey === "new" ? [] : null;
  const [sending, setSending] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [error, setError] = useState<TranslationKey | null>(null);
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const [listOpen, setListOpen] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);

  // --- status + conversation list, once per mount
  useEffect(() => {
    const controller = new AbortController();
    fetchChatStatus(controller.signal)
      .then(setStatus)
      .catch(() => undefined); // The status strip is advisory; failing it must not block chat.
    listConversations(controller.signal)
      .then((result) => setConversations(result.items))
      .catch((err: unknown) => {
        if (!isAbort(err)) setConversations([]);
      });
    return () => controller.abort();
  }, []);

  // --- messages for the selected conversation (skipped when a send just
  // created this thread locally, so the first answer is not fetched twice)
  const loadedKey = thread.key;
  useEffect(() => {
    if (!conversationId || loadedKey === conversationId) return;
    const controller = new AbortController();
    fetchConversation(conversationId, controller.signal)
      .then((detail) => setThread({ key: conversationId, messages: detail.messages }))
      .catch((err: unknown) => {
        if (isAbort(err)) return;
        if (err instanceof ApiError && err.kind === "not_found") {
          navigate("/chat", { replace: true });
          return;
        }
        setThread({ key: conversationId, messages: [] });
        setError(apiErrorKey(err));
      });
    return () => controller.abort();
  }, [conversationId, loadedKey, navigate]);

  // Keep the newest message in view.
  useEffect(() => {
    // Optional call: jsdom (tests) does not implement scrollIntoView.
    threadEndRef.current?.scrollIntoView?.({ block: "end" });
  }, [messages?.length, pendingQuestion]);

  const upsertConversation = useCallback((conversation: Conversation) => {
    setConversations((current) => {
      const rest = (current ?? []).filter((item) => item.id !== conversation.id);
      return [conversation, ...rest];
    });
  }, []);

  const handleSend = useCallback(
    async (question: string) => {
      setSending(true);
      setError(null);
      setPendingQuestion(question);
      try {
        const result = await ask(question, { conversationId: conversationId ?? null });
        setPendingQuestion(null);
        setThread((current) => ({
          key: result.conversation.id,
          messages: [
            ...(current.key === threadKey ? current.messages : []),
            result.question,
            result.answer,
          ],
        }));
        upsertConversation(result.conversation);
        if (!conversationId) {
          navigate(`/chat/${result.conversation.id}`, { replace: true });
        }
      } catch (err: unknown) {
        setPendingQuestion(null);
        setDraft(question); // Give the text back so a retry is one click.
        setError(
          err instanceof ApiError && err.code === "ai_unavailable"
            ? "chat.error.unavailable"
            : apiErrorKey(err),
        );
      } finally {
        setSending(false);
      }
    },
    [conversationId, threadKey, navigate, upsertConversation],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteConversation(id);
        setConversations((current) => (current ?? []).filter((item) => item.id !== id));
        if (id === conversationId) navigate("/chat");
      } catch (err: unknown) {
        setError(apiErrorKey(err));
      }
    },
    [conversationId, navigate],
  );

  const notReady = status !== null && !status.ready;
  const loadingThread = messages === null;
  const emptyThread = messages !== null && messages.length === 0 && pendingQuestion === null;

  const conversationList = (
    <aside className={`chat__list${listOpen ? " is-open" : ""}`} aria-label={t("chat.list.label")}>
      <div className="chat__list-head">
        <Button
          size="sm"
          variant="secondary"
          icon={<DraftIcon size={16} />}
          onClick={() => {
            setListOpen(false);
            setDraft(undefined);
            navigate("/chat");
          }}
        >
          {t("chat.new")}
        </Button>
        <button
          type="button"
          className="chat__list-close"
          aria-label={t("common.closeMenu")}
          onClick={() => setListOpen(false)}
        >
          <CloseIcon size={18} />
        </button>
      </div>

      {conversations === null ? (
        <ul className="chat__threads">
          {Array.from({ length: 4 }, (_, index) => (
            <li className="chat__thread" key={index}>
              <Skeleton width="70%" height="0.9rem" />
              <Skeleton width="40%" height="0.7rem" style={{ marginBlockStart: "0.4rem" }} />
            </li>
          ))}
        </ul>
      ) : conversations.length === 0 ? (
        <p className="chat__threads-empty">{t("chat.list.empty")}</p>
      ) : (
        <ul className="chat__threads">
          {conversations.map((conversation) => {
            const active = conversation.id === conversationId;
            return (
              <li className={`chat__thread${active ? " is-active" : ""}`} key={conversation.id}>
                <button
                  type="button"
                  className="chat__thread-open"
                  aria-current={active ? "page" : undefined}
                  onClick={() => {
                    setListOpen(false);
                    navigate(`/chat/${conversation.id}`);
                  }}
                >
                  <span className="chat__thread-title" dir="auto">
                    {conversation.title}
                  </span>
                  <span className="chat__thread-time">
                    {formatRelativeTime(conversation.updated_at)}
                  </span>
                </button>
                <button
                  type="button"
                  className="chat__thread-delete"
                  aria-label={t("chat.delete")}
                  title={t("chat.delete")}
                  onClick={() => void handleDelete(conversation.id)}
                >
                  <CloseIcon size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </aside>
  );

  return (
    <div className="chat">
      {listOpen ? (
        <button
          type="button"
          className="chat__backdrop"
          aria-label={t("common.closeMenu")}
          onClick={() => setListOpen(false)}
        />
      ) : null}
      {conversationList}

      <section className="chat__main" aria-label={t("nav.chat")}>
        <header className="chat__head">
          <button
            type="button"
            className="chat__list-toggle"
            aria-label={t("chat.list.label")}
            onClick={() => setListOpen(true)}
          >
            <MenuIcon size={20} />
          </button>
          <div className="chat__head-text">
            <h2 className="chat__title">{t("chat.title")}</h2>
            <p className="chat__sub">{t("chat.subtitle")}</p>
          </div>
          <span className="chat__mode" title={t("chat.mode.lawTitle")}>
            <ShieldIcon size={14} />
            <span>{t("chat.mode.law")}</span>
          </span>
        </header>

        {notReady ? (
          <Banner tone="info" className="chat__notice">
            {status?.providers.length === 0 ? t("chat.notReady.noKey") : t("chat.notReady.noIndex")}
          </Banner>
        ) : null}

        <div className="chat__thread-wrap">
          {loadingThread ? (
            <ul className="chat__messages" aria-busy="true">
              {Array.from({ length: 3 }, (_, index) => (
                <li className={`msg msg--${index % 2 ? "assistant" : "user"}`} key={index}>
                  <div className="msg__bubble">
                    <Skeleton width={index % 2 ? "90%" : "55%"} height="0.9rem" />
                    {index % 2 ? (
                      <Skeleton width="75%" height="0.9rem" style={{ marginBlockStart: "0.5rem" }} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : emptyThread ? (
            <div className="chat__welcome reveal">
              <span className="chat__welcome-icon" aria-hidden="true">
                <ChatIcon size={24} />
              </span>
              <h3 className="chat__welcome-title">{t("chat.welcome.title")}</h3>
              <p className="chat__welcome-body">{t("chat.welcome.body")}</p>
              <ul className="chat__suggestions">
                {SUGGESTIONS.map((key) => (
                  <li key={key}>
                    <button
                      type="button"
                      className="chat__suggestion"
                      dir="auto"
                      onClick={() => setDraft(t(key))}
                    >
                      {t(key)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <ul className="chat__messages">
              {(messages ?? []).map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
              {pendingQuestion !== null ? (
                <>
                  <li className="msg msg--user">
                    <div className="msg__meta">
                      <span className="msg__who">{t("chat.you")}</span>
                    </div>
                    <div className="msg__bubble">
                      <p className="msg__text" dir="auto">
                        {pendingQuestion}
                      </p>
                    </div>
                  </li>
                  <li className="msg msg--assistant msg--thinking" aria-live="polite">
                    <div className="msg__meta">
                      <span className="msg__who">{t("chat.assistant")}</span>
                    </div>
                    <div className="msg__bubble">
                      <span className="msg__dots" aria-hidden="true">
                        <i />
                        <i />
                        <i />
                      </span>
                      <span className="visually-hidden">{t("chat.thinking")}</span>
                    </div>
                  </li>
                </>
              ) : null}
            </ul>
          )}
          <div ref={threadEndRef} />
        </div>

        {error ? (
          <Banner tone="error" className="chat__notice">
            {t(error)}
          </Banner>
        ) : null}

        <Composer disabled={loadingThread} sending={sending} onSend={handleSend} draft={draft} />
        <p className="chat__disclaimer">{t("app.disclaimer")}</p>
      </section>
    </div>
  );
}
