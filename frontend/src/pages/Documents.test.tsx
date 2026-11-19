import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { setAccessToken } from "../api/client";
import en from "../i18n/en";
import { renderWithProviders } from "../test/renderWithProviders";
import Documents from "./Documents";

/** Stands in for the chat page and shows what it was handed. */
function ChatProbe() {
  const location = useLocation();
  return <p data-testid="chat-state">{JSON.stringify(location.state)}</p>;
}

/** Same route shape as App.tsx. */
function renderDocuments(route = "/documents") {
  return renderWithProviders(
    <Routes>
      <Route path="/documents/:documentId?" element={<Documents />} />
      <Route path="/chat" element={<ChatProbe />} />
    </Routes>,
    { route },
  );
}

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const CNIC = {
  id: "d1",
  title: "CNIC - Muhammad Ali",
  language: "en",
  doc_type: "identity",
  status: "ready",
  error: null,
  filename: "card.jpg",
  content_type: "image/jpeg",
  size_bytes: 345_000,
  page_count: 1,
  char_count: 180,
  ocr_used: true,
  detected_kind: "cnic",
  summary: "A Pakistani national identity card.",
  field_count: 3,
  created_at: "2026-11-19T10:00:00Z",
  updated_at: "2026-11-19T10:00:05Z",
};

const CNIC_DETAIL = {
  ...CNIC,
  pages: [{ page: 1, text: "Name: Muhammad Ali\nIdentity Number: 42101-1234567-1", method: "ocr" }],
  fields: [
    { key: "full_name", label: "Name", value: "Muhammad Ali" },
    { key: "cnic_number", label: "Identity Number", value: "42101-1234567-1" },
    { key: "blood_group", label: "Blood group", value: "B+" },
  ],
};

function mockApi(handler: (url: string, init?: RequestInit) => Response | Promise<Response>) {
  const spy = vi.fn(async (input: unknown, init?: RequestInit) => handler(String(input), init));
  vi.stubGlobal("fetch", spy);
  return spy;
}

describe("Documents page", () => {
  it("shows the empty state and the upload box", async () => {
    setAccessToken("token");
    mockApi((url) =>
      url.includes("/documents?") ? jsonResponse(200, { items: [], total: 0 }) : jsonResponse(404, {}),
    );
    renderDocuments();

    expect(await screen.findByText(en["documents.list.empty.title"])).toBeTruthy();
    expect(screen.getByRole("button", { name: en["documents.upload.choose"] })).toBeTruthy();
    // The user is told the image leaves the server before they upload one.
    expect(screen.getByText(en["documents.upload.privacy"])).toBeTruthy();
    expect(screen.getByText(en["documents.detail.pick"])).toBeTruthy();
  });

  it("shows the extracted details and text of a selected document", async () => {
    setAccessToken("token");
    mockApi((url) => {
      if (url.includes("/documents?")) return jsonResponse(200, { items: [CNIC], total: 1 });
      if (url.endsWith("/documents/d1")) return jsonResponse(200, CNIC_DETAIL);
      return jsonResponse(404, {});
    });
    renderDocuments("/documents/d1");

    // Fields: known keys get the app's own label, unknown ones keep the model's.
    expect(await screen.findByText("42101-1234567-1")).toBeTruthy();
    expect(screen.getByText(en["documents.field.cnic_number"])).toBeTruthy();
    expect(screen.getByText(en["documents.field.full_name"])).toBeTruthy();
    expect(screen.getByText("Blood group")).toBeTruthy();
    expect(screen.getByText("B+")).toBeTruthy();

    // The raw text, marked as read by OCR, and the detected kind.
    expect(screen.getByText(/Name: Muhammad Ali/)).toBeTruthy();
    expect(screen.getAllByText(en["documents.detail.ocr"]).length).toBeGreaterThan(0);
    expect(screen.getAllByText(en["documents.kind.cnic"]).length).toBeGreaterThan(0);
    expect(screen.getByText("A Pakistani national identity card.")).toBeTruthy();
  });

  it("uploads a file, follows it while it is read, then shows the result", async () => {
    setAccessToken("token");
    const queued = { ...CNIC, status: "queued", page_count: 0, char_count: 0, field_count: 0 };
    let listCalls = 0;
    const spy = mockApi((url, init) => {
      if (url.endsWith("/documents/upload") && init?.method === "POST") {
        return jsonResponse(201, queued);
      }
      if (url.includes("/documents?")) {
        listCalls += 1;
        if (listCalls === 1) return jsonResponse(200, { items: [], total: 0 });
        // The first poll after the upload already finds it finished.
        return jsonResponse(200, { items: [CNIC], total: 1 });
      }
      if (url.endsWith("/documents/d1")) {
        return jsonResponse(200, listCalls > 1 ? CNIC_DETAIL : { ...queued, pages: [], fields: [] });
      }
      return jsonResponse(404, {});
    });
    renderDocuments();
    await screen.findByText(en["documents.list.empty.title"]);

    const file = new File(["fake image bytes"], "card.jpg", { type: "image/jpeg" });
    fireEvent.change(screen.getByTestId("documents-file-input"), { target: { files: [file] } });

    // It appears at once, still being read...
    expect(await screen.findByText(en["documents.detail.working"])).toBeTruthy();
    // ...and the page updates by itself when the text is ready.
    expect(await screen.findByText("42101-1234567-1", undefined, { timeout: 5000 })).toBeTruthy();

    const uploadCall = spy.mock.calls.find((call) => String(call[0]).endsWith("/documents/upload"));
    const init = uploadCall?.[1] as RequestInit;
    expect(init.body).toBeInstanceOf(FormData);
    expect(((init.body as FormData).get("file") as File).name).toBe("card.jpg");
    // The browser must set the multipart boundary itself.
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer token");
  });

  it("refuses an oversized file before sending it, and explains a rejected type", async () => {
    setAccessToken("token");
    const spy = mockApi((url, init) => {
      if (url.endsWith("/documents/upload") && init?.method === "POST") {
        return jsonResponse(415, {
          error: { code: "unsupported_file_type", message: "This file type is not supported." },
        });
      }
      if (url.includes("/documents?")) return jsonResponse(200, { items: [], total: 0 });
      return jsonResponse(404, {});
    });
    renderDocuments();
    await screen.findByText(en["documents.list.empty.title"]);
    const input = screen.getByTestId("documents-file-input");

    const huge = new File(["x"], "huge.pdf", { type: "application/pdf" });
    Object.defineProperty(huge, "size", { value: 16 * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [huge] } });
    expect((await screen.findByRole("alert")).textContent).toContain("larger than 15 MB");
    expect(spy.mock.calls.some((call) => String(call[0]).endsWith("/documents/upload"))).toBe(false);

    fireEvent.change(input, { target: { files: [new File(["GIF89a"], "anim.gif")] } });
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(en["documents.error.unsupported"]),
    );
  });

  it("explains a failed read and lets the user try again", async () => {
    setAccessToken("token");
    const user = userEvent.setup();
    const failed = { ...CNIC, status: "failed", error: "ocr_unavailable", field_count: 0 };
    let reprocessed = false;
    mockApi((url, init) => {
      if (url.endsWith("/documents/d1/reprocess") && init?.method === "POST") {
        reprocessed = true;
        return jsonResponse(200, { ...failed, status: "queued", error: null });
      }
      if (url.includes("/documents?")) {
        return jsonResponse(200, { items: [reprocessed ? CNIC : failed], total: 1 });
      }
      if (url.endsWith("/documents/d1")) {
        return jsonResponse(200, reprocessed ? CNIC_DETAIL : { ...failed, pages: [], fields: [] });
      }
      return jsonResponse(404, {});
    });
    renderDocuments("/documents/d1");

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain(en["documents.error.ocr_unavailable"]);

    await user.click(screen.getByRole("button", { name: en["documents.detail.retry"] }));
    expect(await screen.findByText("42101-1234567-1", undefined, { timeout: 5000 })).toBeTruthy();
  });

  it("asks for confirmation before deleting, then removes the document", async () => {
    setAccessToken("token");
    const user = userEvent.setup();
    let deleted = false;
    mockApi((url, init) => {
      if (url.endsWith("/documents/d1") && init?.method === "DELETE") {
        deleted = true;
        return new Response(null, { status: 204 });
      }
      if (url.includes("/documents?")) return jsonResponse(200, { items: [CNIC], total: 1 });
      if (url.endsWith("/documents/d1")) return jsonResponse(200, CNIC_DETAIL);
      return jsonResponse(404, {});
    });
    renderDocuments("/documents/d1");
    await screen.findByText("42101-1234567-1");

    // First click only arms the delete.
    await user.click(screen.getByRole("button", { name: en["documents.detail.delete"] }));
    expect(deleted).toBe(false);
    await user.click(screen.getByRole("button", { name: en["documents.detail.confirmDelete"] }));

    expect(await screen.findByText(en["documents.list.empty.title"])).toBeTruthy();
    expect(deleted).toBe(true);
    expect(screen.queryByText("42101-1234567-1")).toBeNull();
  });

  it("hands the document to the chat from 'Ask about this document'", async () => {
    setAccessToken("token");
    const user = userEvent.setup();
    mockApi((url) => {
      if (url.includes("/documents?")) return jsonResponse(200, { items: [CNIC], total: 1 });
      if (url.endsWith("/documents/d1")) return jsonResponse(200, CNIC_DETAIL);
      return jsonResponse(404, {});
    });
    renderDocuments("/documents/d1");
    await screen.findByText("42101-1234567-1");

    await user.click(screen.getByRole("button", { name: en["documents.detail.ask"] }));
    const state = JSON.parse((await screen.findByTestId("chat-state")).textContent ?? "null");
    expect(state).toEqual({ attachDocument: { id: "d1", title: "CNIC - Muhammad Ali" } });
  });
});
