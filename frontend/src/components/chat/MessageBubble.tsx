import type { ChatMessage } from "../../api/chat";
import { useI18n } from "../../i18n/useI18n";
import AnswerText from "./AnswerText";
import SourceList from "./SourceList";

interface MessageBubbleProps {
  message: ChatMessage;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  const { t, formatRelativeTime } = useI18n();
  const isUser = message.role === "user";

  return (
    <li className={`msg msg--${message.role}`}>
      <div className="msg__meta">
        <span className="msg__who">{t(isUser ? "chat.you" : "chat.assistant")}</span>
        <span className="msg__time">{formatRelativeTime(message.created_at)}</span>
      </div>
      <div className="msg__bubble">
        {isUser ? (
          <p className="msg__text" dir="auto">
            {message.content}
          </p>
        ) : (
          <>
            <AnswerText text={message.content} />
            <SourceList sources={message.sources} />
          </>
        )}
      </div>
    </li>
  );
}
