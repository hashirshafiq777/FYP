import type { ConversationSummary } from "../../data/dashboardData";
import { useI18n } from "../../i18n/useI18n";
import EmptyState from "../EmptyState";
import SectionCard from "../SectionCard";
import Skeleton from "../Skeleton";
import { ChatIcon } from "../icons";

interface ConversationsListProps {
  conversations: ConversationSummary[] | null;
}

/**
 * Recent questions.
 *
 * Titles and snippets are user content, so they carry `dir="auto"`: an Urdu
 * question renders right-to-left even while the UI is in English, and vice
 * versa. Forcing them to the UI direction would scramble the punctuation.
 */
export default function ConversationsList({ conversations }: ConversationsListProps) {
  const { t, formatRelativeTime } = useI18n();
  const loading = conversations === null;

  return (
    <SectionCard
      title={t("dashboard.chats.title")}
      subtitle={t("dashboard.chats.subtitle")}
      headingId="chats-heading"
      busy={loading}
    >
      {loading ? (
        <ul className="feed">
          {Array.from({ length: 4 }, (_, index) => (
            <li className="feed__item" key={index}>
              <Skeleton width="55%" height="1rem" />
              <Skeleton width="80%" height="0.8rem" style={{ marginBlockStart: "0.45rem" }} />
            </li>
          ))}
        </ul>
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={<ChatIcon size={22} />}
          title={t("dashboard.chats.empty.title")}
          body={t("dashboard.chats.empty.body")}
          actionLabel={t("dashboard.chats.empty.action")}
          actionTo="/chat"
        />
      ) : (
        <ul className="feed">
          {conversations.map((conversation) => (
            <li className="feed__item" key={conversation.id}>
              <div className="feed__head">
                <p className="feed__title" dir="auto">
                  {conversation.title}
                </p>
                <span className="feed__time">{formatRelativeTime(conversation.updatedAt)}</span>
              </div>
              <p className="feed__snippet" dir="auto">
                {conversation.snippet}
              </p>
              <span className="lang-badge lang-badge--sm">
                <span aria-hidden="true">
                  {t(conversation.language === "ur" ? "lang.ur" : "lang.en")}
                </span>
                <span className="visually-hidden">
                  {t(conversation.language === "ur" ? "lang.urFull" : "lang.enFull")}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
