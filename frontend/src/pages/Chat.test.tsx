import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { setAccessToken } from "../api/client";
import en from "../i18n/en";
import { renderWithProviders } from "../test/renderWithProviders";
import Chat from "./Chat";

/** Same route shape as App.tsx: a sent question navigates to /chat/:id without remounting. */
function renderChat() {
  return renderWithProviders(
    <Routes>
      <Route path="/chat/:conversationId?" element={<Chat />} />
    </Routes>,
    { route: "/chat" },
  );
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const STATUS_READY = {
  providers: ["groq"],
  llm_model: "llama-3.3-70b-versatile",
  embedding_model: "x",
  law_chunks: 100,
  ready: true,
};

const CONVERSATION = {
  id: "c1",
  title: "Punishment for theft",
  mode: "law",
  language: "en",
  document_id: null,
  message_count: 2,
  created_at: "2026-11-05T10:00:00Z",
  updated_at: "2026-11-05T10:00:00Z",
};

const ANSWER = {
  conversation: CONVERSATION,
  question: {
    id: "m1",
    conversation_id: "c1",
    role: "user",
    content: "What is the punishment for theft?",
    language: "en",
    sources: [],
    provider: null,
    created_at: "2026-11-05T10:00:00Z",
  },
  answer: {
    id: "m2",
    conversation_id: "c1",
    role: "assistant",
    content:
      "Theft is punished with imprisonment up to three years [Pakistan Penal Code s. 379].\n\n- Fine may also apply.",
    language: "en",
    sources: [
      {
        label: "Pakistan Penal Code s. 379",
        title: "Pakistan Penal Code (PPC),1860",
        section: "379",
        category: "criminal",
        kind: "statute",
        url: "https://pakistancode.gov.pk/x",
        page: null,
        excerpt: "379. Punishment for theft. Whoever commits theft shall be punished...",
        score: 0.8,
      },
    ],
    provider: "groq",
    created_at: "2026-11-05T10:00:01Z",
  },
};

/** Route the fetch mock by URL and method. */
function mockApi(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const spy = vi.fn(async (input: unknown, init?: RequestInit) => handler(String(input), init));
  vi.stubGlobal("fetch", spy);
  return spy;
}

function defaultHandler(url: string, init?: RequestInit): Response {
  if (url.endsWith("/chat/status")) return jsonResponse(200, STATUS_READY);
  if (url.includes("/chat/conversations?")) return jsonResponse(200, { items: [], total: 0 });
  if (url.endsWith("/chat/ask") && init?.method === "POST") return jsonResponse(200, ANSWER);
  return jsonResponse(404, { error: { code: "not_found", message: "Not found." } });
}

describe("Chat page", () => {
  it("shows the welcome state with suggested questions", async () => {
    setAccessToken("token");
    mockApi(defaultHandler);
    renderChat();

    expect(await screen.findByText(en["chat.welcome.title"])).toBeTruthy();
    expect(screen.getByText(en["chat.suggest.1"])).toBeTruthy();
    expect(await screen.findByText(en["chat.list.empty"])).toBeTruthy();
  });

  it("sends a question and renders the answer with citations and sources", async () => {
    setAccessToken("token");
    const user = userEvent.setup();
    const spy = mockApi(defaultHandler);
    renderChat();

    await screen.findByText(en["chat.welcome.title"]);
    await user.type(screen.getByLabelText(en["chat.composer.label"]), "What is the punishment for theft?");
    await user.click(screen.getByRole("button", { name: en["chat.composer.send"] }));

    // The answer text (split across text nodes by the citation chip), the
    // citation chip itself and a collapsed source list.
    expect(
      await screen.findByText(
        (_, element) =>
          element?.tagName === "P" &&
          (element.textContent ?? "").includes("imprisonment up to three years"),
      ),
    ).toBeTruthy();
    expect(screen.getAllByText("Pakistan Penal Code s. 379").length).toBeGreaterThan(0);
    expect(screen.getByText("Fine may also apply.")).toBeTruthy();

    const toggle = screen.getByRole("button", { name: "Sources (1)" });
    await user.click(toggle);
    expect(await screen.findByText(/Whoever commits theft/)).toBeTruthy();

    // The conversation appears in the list and the box is cleared.
    expect(screen.getAllByText("Punishment for theft").length).toBeGreaterThan(0);
    expect((screen.getByLabelText(en["chat.composer.label"]) as HTMLTextAreaElement).value).toBe("");

    const askCall = spy.mock.calls.find((call) => String(call[0]).endsWith("/chat/ask"));
    expect(askCall).toBeTruthy();
    const init = askCall?.[1] as RequestInit | undefined;
    const body = JSON.parse(String(init?.body));
    expect(body).toEqual({
      question: "What is the punishment for theft?",
      conversation_id: null,
      mode: "law",
    });
  });

  it("keeps the question in the box and shows a banner when the assistant is down", async () => {
    setAccessToken("token");
    const user = userEvent.setup();
    mockApi((url, init) => {
      if (url.endsWith("/chat/ask") && init?.method === "POST") {
        return jsonResponse(503, {
          error: { code: "ai_unavailable", message: "The assistant is unavailable right now." },
        });
      }
      return defaultHandler(url, init);
    });
    renderChat();

    await screen.findByText(en["chat.welcome.title"]);
    await user.type(screen.getByLabelText(en["chat.composer.label"]), "Khula kaise lein?");
    await user.click(screen.getByRole("button", { name: en["chat.composer.send"] }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(en["chat.error.unavailable"]);
    await waitFor(() =>
      expect((screen.getByLabelText(en["chat.composer.label"]) as HTMLTextAreaElement).value).toBe(
        "Khula kaise lein?",
      ),
    );
  });

  it("warns when no language-model key is configured on the server", async () => {
    setAccessToken("token");
    mockApi((url, init) => {
      if (url.endsWith("/chat/status")) {
        return jsonResponse(200, { ...STATUS_READY, providers: [], ready: false });
      }
      return defaultHandler(url, init);
    });
    renderChat();

    expect(await screen.findByText(en["chat.notReady.noKey"])).toBeTruthy();
  });
});
