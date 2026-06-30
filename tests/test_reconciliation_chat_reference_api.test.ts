import { describe, expect, it } from "vitest";
import { handleChatRoute } from "../apps/control-app/src/chat-routes.js";
import {
  createReq23TestDb,
  insertMessage,
  insertReferenceDoc,
  insertSession,
  insertSite,
  type D1Like,
} from "./_helpers_REQ-23_db.js";

// Reconciliation UATs for story-721e8feb — the JSON HTTP API over chat sessions
// and reference docs. Each test exercises the real route entry point
// (`handleChatRoute`) against a migrated, isolated Miniflare D1 (and, where the
// behaviour touches blobs, an in-memory R2 stand-in). One UAT per acceptance
// criterion (AC-800 .. AC-810). Every assertion goes through the HTTP boundary:
// a Request in, a Response out — never an internal callable.

const ACCOUNT_ID = "acct_1stcontact_platform";
const BASE = "https://app";

// A mutable test clock: assign `nowVal` before a call to control the timestamps
// the server stamps onto sessions/messages. Shape matches chat-db's `Clock`.
type TestClock = { now: () => number };

/** In-memory R2 stand-in implementing only the `delete` surface delete-sweep uses. */
class FakeR2 {
  store = new Map<string, Uint8Array>();
  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }
}

function makeEnv(db: D1Like, bucket?: FakeR2): { SITES_DB: D1Like; ASSETS_BUCKET?: FakeR2 } {
  return bucket ? { SITES_DB: db, ASSETS_BUCKET: bucket } : { SITES_DB: db };
}

function get(path: string): Request {
  return new Request(`${BASE}${path}`);
}

function postJson(path: string, body: unknown): Request {
  return new Request(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patchJson(path: string, body: unknown): Request {
  return new Request(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function del(path: string): Request {
  return new Request(`${BASE}${path}`, { method: "DELETE" });
}

interface SessionShape {
  id: string;
  site_id: string;
  user_id: string | null;
  title: string | null;
  created_at: number;
  updated_at: number;
  last_message_at: number | null;
  message_count: number;
}

interface MessageShape {
  id: string;
  session_id: string;
  ord: number;
  role: string;
  content: string;
  ts: number;
}

describe("Reconciliation: chat-session & reference-doc HTTP API (story-721e8feb)", () => {
  it("test_UAT_AC800_create_session_returns_record_and_appears_in_listing", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    try {
      const siteId = "site_800";
      await insertSite(db, { id: siteId, account_id: ACCOUNT_ID, slug: "site-800" });

      // With a title.
      const titledRes = await handleChatRoute(
        postJson(`/api/sites/${siteId}/chats`, { title: "Redesign the hero" }),
        makeEnv(db),
      );
      expect(titledRes.status).toBe(201);
      const titled = (await titledRes.json()) as SessionShape;
      expect(titled.id).toMatch(/^sess_/);
      expect(titled.site_id).toBe(siteId);
      expect(titled.message_count).toBe(0);
      expect(titled.title).toBe("Redesign the hero");

      // Without a title — the created session has no title.
      const bareRes = await handleChatRoute(
        postJson(`/api/sites/${siteId}/chats`, {}),
        makeEnv(db),
      );
      expect(bareRes.status).toBe(201);
      const bare = (await bareRes.json()) as SessionShape;
      expect(bare.id).toMatch(/^sess_/);
      expect(bare.site_id).toBe(siteId);
      expect(bare.message_count).toBe(0);
      expect(bare.title).toBeNull();

      // Both created sessions are subsequently returned by the site listing.
      const listRes = await handleChatRoute(get(`/api/sites/${siteId}/chats`), makeEnv(db));
      expect(listRes.status).toBe(200);
      const { sessions } = (await listRes.json()) as { sessions: SessionShape[] };
      const ids = sessions.map((s) => s.id);
      expect(ids).toContain(titled.id);
      expect(ids).toContain(bare.id);
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC801_session_listing_scoped_newest_first_with_limit_and_before", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    let nowVal = 0;
    const clock: TestClock = { now: () => nowVal };
    try {
      await insertSite(db, { id: "site_a", account_id: ACCOUNT_ID, slug: "site-a" });
      await insertSite(db, { id: "site_b", account_id: ACCOUNT_ID, slug: "site-b" });
      await insertSession(db, { id: "a1", site_id: "site_a" });
      await insertSession(db, { id: "a2", site_id: "site_a" });
      await insertSession(db, { id: "a3", site_id: "site_a" });
      await insertSession(db, { id: "b1", site_id: "site_b" });

      // Give each session a distinct last-activity time via an append.
      const touch = async (sessionId: string, at: number): Promise<void> => {
        nowVal = at;
        const r = await handleChatRoute(
          postJson(`/api/chats/${sessionId}/messages`, { role: "user", content: "x" }),
          makeEnv(db),
          { clock },
        );
        expect(r.status).toBe(201);
      };
      await touch("a1", 10);
      await touch("a2", 20);
      await touch("a3", 30);
      await touch("b1", 25);

      // Site A listing: only A's sessions, newest-activity-first, no B sessions.
      const aRes = await handleChatRoute(get(`/api/sites/site_a/chats`), makeEnv(db));
      const aList = (await aRes.json()) as { sessions: SessionShape[] };
      expect(aList.sessions.map((s) => s.id)).toEqual(["a3", "a2", "a1"]);
      expect(aList.sessions.some((s) => s.id === "b1")).toBe(false);

      // limit bounds the count.
      const limitRes = await handleChatRoute(get(`/api/sites/site_a/chats?limit=2`), makeEnv(db));
      const limitList = (await limitRes.json()) as { sessions: SessionShape[] };
      expect(limitList.sessions.map((s) => s.id)).toEqual(["a3", "a2"]);

      // before-cursor returns the next older page (activity strictly before 30).
      const beforeRes = await handleChatRoute(get(`/api/sites/site_a/chats?before=30`), makeEnv(db));
      const beforeList = (await beforeRes.json()) as { sessions: SessionShape[] };
      expect(beforeList.sessions.map((s) => s.id)).toEqual(["a2", "a1"]);

      // Site B listing contains only B's session.
      const bRes = await handleChatRoute(get(`/api/sites/site_b/chats`), makeEnv(db));
      const bList = (await bRes.json()) as { sessions: SessionShape[] };
      expect(bList.sessions.map((s) => s.id)).toEqual(["b1"]);
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC802_append_allocates_gapfree_ordinal_and_updates_denormals_atomically", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    let nowVal = 1000;
    const clock: TestClock = { now: () => nowVal };
    try {
      const siteId = "site_802";
      await insertSite(db, { id: siteId, account_id: ACCOUNT_ID, slug: "site-802" });
      const createRes = await handleChatRoute(
        postJson(`/api/sites/${siteId}/chats`, { title: "ord test" }),
        makeEnv(db),
        { clock },
      );
      const created = (await createRes.json()) as SessionShape;
      const sessionId = created.id;
      const createdAt = created.created_at;

      // Append several messages; ordinals must be 0,1,2,3 contiguous, no gaps.
      const ords: number[] = [];
      for (let i = 0; i < 4; i++) {
        nowVal = 2000 + i * 100;
        const r = await handleChatRoute(
          postJson(`/api/chats/${sessionId}/messages`, { role: "user", content: `m${i}` }),
          makeEnv(db),
          { clock },
        );
        expect(r.status).toBe(201);
        const m = (await r.json()) as MessageShape;
        ords.push(m.ord);
      }
      expect(ords).toEqual([0, 1, 2, 3]);

      // Denormals: message_count reflects the total and last-activity advanced.
      const listRes = await handleChatRoute(get(`/api/sites/${siteId}/chats`), makeEnv(db));
      const { sessions } = (await listRes.json()) as { sessions: SessionShape[] };
      const seen = sessions.find((s) => s.id === sessionId);
      expect(seen).toBeDefined();
      expect(seen?.message_count).toBe(4);
      expect(seen?.last_message_at).not.toBeNull();
      expect(seen?.last_message_at as number).toBeGreaterThan(createdAt);
      expect(seen?.last_message_at).toBe(2300);
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC803_read_messages_no_cursor_returns_recent_page_chronological", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    try {
      // Long session: 55 messages, more than the default page size (50).
      await insertSite(db, { id: "site_803", account_id: ACCOUNT_ID, slug: "site-803" });
      await insertSession(db, { id: "sess_803", site_id: "site_803" });
      for (let i = 0; i < 55; i++) {
        await insertMessage(db, {
          id: `m803_${i}`,
          session_id: "sess_803",
          ord: i,
          role: "user",
          content: `m${i}`,
        });
      }
      const longRes = await handleChatRoute(get(`/api/chats/sess_803/messages`), makeEnv(db));
      expect(longRes.status).toBe(200);
      const longBody = (await longRes.json()) as { messages: MessageShape[] };
      // Newest page (last 50), ascending ordinal: 5..54.
      expect(longBody.messages.length).toBe(50);
      expect(longBody.messages[0].ord).toBe(5);
      expect(longBody.messages[longBody.messages.length - 1].ord).toBe(54);
      const ords = longBody.messages.map((m) => m.ord);
      expect(ords).toEqual([...ords].sort((a, b) => a - b));

      // Short session: fewer messages than a page; all returned ascending.
      await insertSession(db, { id: "sess_803s", site_id: "site_803" });
      for (let i = 0; i < 3; i++) {
        await insertMessage(db, {
          id: `m803s_${i}`,
          session_id: "sess_803s",
          ord: i,
          role: "user",
          content: `s${i}`,
        });
      }
      const shortRes = await handleChatRoute(get(`/api/chats/sess_803s/messages`), makeEnv(db));
      const shortBody = (await shortRes.json()) as { messages: MessageShape[] };
      expect(shortBody.messages.map((m) => m.ord)).toEqual([0, 1, 2]);
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC804_read_messages_before_cursor_returns_older_page_chronological", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    try {
      await insertSite(db, { id: "site_804", account_id: ACCOUNT_ID, slug: "site-804" });
      await insertSession(db, { id: "sess_804", site_id: "site_804" });
      for (let i = 0; i < 10; i++) {
        await insertMessage(db, {
          id: `m804_${i}`,
          session_id: "sess_804",
          ord: i,
          role: "user",
          content: `m${i}`,
        });
      }

      // First older page: ord < 10, limit 3 → [7,8,9] ascending.
      const page1Res = await handleChatRoute(
        get(`/api/chats/sess_804/messages?before=10&limit=3`),
        makeEnv(db),
      );
      const page1 = (await page1Res.json()) as { messages: MessageShape[] };
      const ords1 = page1.messages.map((m) => m.ord);
      expect(ords1.length).toBe(3);
      expect(ords1.every((o) => o < 10)).toBe(true);
      expect(ords1).toEqual([7, 8, 9]);

      // Page again using the oldest-returned ordinal (7) as the next cursor.
      const oldest = Math.min(...ords1);
      const page2Res = await handleChatRoute(
        get(`/api/chats/sess_804/messages?before=${oldest}&limit=3`),
        makeEnv(db),
      );
      const page2 = (await page2Res.json()) as { messages: MessageShape[] };
      const ords2 = page2.messages.map((m) => m.ord);
      expect(ords2.every((o) => o < oldest)).toBe(true);
      expect(ords2).toEqual([4, 5, 6]);

      // The two pages are contiguous and non-overlapping.
      expect(Math.max(...ords2) + 1).toBe(Math.min(...ords1));
      expect(ords1.filter((o) => ords2.includes(o))).toEqual([]);
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC805_edit_title_updates_and_rejects_empty_or_unknown", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    try {
      const siteId = "site_805";
      await insertSite(db, { id: siteId, account_id: ACCOUNT_ID, slug: "site-805" });
      await insertSession(db, { id: "sess_805", site_id: siteId, title: "Original" });

      // Non-empty title succeeds and returns the updated session.
      const okRes = await handleChatRoute(
        patchJson(`/api/chats/sess_805`, { title: "Renamed" }),
        makeEnv(db),
      );
      expect(okRes.status).toBe(200);
      const updated = (await okRes.json()) as SessionShape;
      expect(updated.title).toBe("Renamed");

      // Re-read via the listing confirms persistence.
      const listRes = await handleChatRoute(get(`/api/sites/${siteId}/chats`), makeEnv(db));
      const { sessions } = (await listRes.json()) as { sessions: SessionShape[] };
      expect(sessions.find((s) => s.id === "sess_805")?.title).toBe("Renamed");

      // Empty title is rejected; title unchanged.
      const emptyRes = await handleChatRoute(
        patchJson(`/api/chats/sess_805`, { title: "" }),
        makeEnv(db),
      );
      expect(emptyRes.status).toBe(400);
      const afterEmpty = await handleChatRoute(get(`/api/sites/${siteId}/chats`), makeEnv(db));
      const afterEmptyList = (await afterEmpty.json()) as { sessions: SessionShape[] };
      expect(afterEmptyList.sessions.find((s) => s.id === "sess_805")?.title).toBe("Renamed");

      // Non-string title is rejected.
      const nonStringRes = await handleChatRoute(
        patchJson(`/api/chats/sess_805`, { title: 123 }),
        makeEnv(db),
      );
      expect(nonStringRes.status).toBe(400);

      // Title-edit on a non-existent session is not-found.
      const missingRes = await handleChatRoute(
        patchJson(`/api/chats/sess_missing`, { title: "Whatever" }),
        makeEnv(db),
      );
      expect(missingRes.status).toBe(404);
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC806_delete_session_cascades_sweeps_attachments_and_reports_keys", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    const bucket = new FakeR2();
    try {
      const siteId = "site_806";
      await insertSite(db, { id: siteId, account_id: ACCOUNT_ID, slug: "site-806" });
      await insertSession(db, { id: "sess_806", site_id: siteId });

      const attachmentKey = "assets/sites/site_806/hero.png";
      const unrelatedKey = "assets/sites/other/keep.png";
      bucket.store.set(attachmentKey, new Uint8Array([1, 2, 3]));
      bucket.store.set(unrelatedKey, new Uint8Array([4, 5, 6]));

      // A message whose tool-call data references the attachment key.
      const appendRes = await handleChatRoute(
        postJson(`/api/chats/sess_806/messages`, {
          role: "assistant",
          content: "uploaded a hero image",
          toolCalls: [{ name: "upload_asset", input: { key: attachmentKey } }],
        }),
        makeEnv(db),
      );
      expect(appendRes.status).toBe(201);

      // Delete the session.
      const deleteRes = await handleChatRoute(del(`/api/chats/sess_806`), makeEnv(db, bucket));
      expect(deleteRes.status).toBe(200);
      const deleteBody = (await deleteRes.json()) as { deleted: boolean; sweptKeys: string[] };
      expect(deleteBody.deleted).toBe(true);
      expect(deleteBody.sweptKeys).toContain(attachmentKey);

      // The referenced attachment is gone; the unrelated object survives.
      expect(bucket.store.has(attachmentKey)).toBe(false);
      expect(bucket.store.has(unrelatedKey)).toBe(true);

      // Session and its messages are no longer findable.
      const readAfter = await handleChatRoute(get(`/api/chats/sess_806/messages`), makeEnv(db));
      expect(readAfter.status).toBe(404);
      const listAfter = await handleChatRoute(get(`/api/sites/${siteId}/chats`), makeEnv(db));
      const listBody = (await listAfter.json()) as { sessions: SessionShape[] };
      expect(listBody.sessions.some((s) => s.id === "sess_806")).toBe(false);

      // Deleting a non-existent session is not-found.
      const missingRes = await handleChatRoute(del(`/api/chats/sess_missing`), makeEnv(db, bucket));
      expect(missingRes.status).toBe(404);
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC807_list_reference_docs_returns_slug_title_summary_kind", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    try {
      // No docs present → successful empty list (not an error).
      const emptyRes = await handleChatRoute(get(`/api/reference-docs`), makeEnv(db));
      expect(emptyRes.status).toBe(200);
      const emptyBody = (await emptyRes.json()) as { docs: unknown[] };
      expect(emptyBody.docs).toEqual([]);

      // Seed two docs and list them.
      await insertReferenceDoc(db, {
        slug: "hero-module",
        title: "Cinematic Hero Module",
        summary: "Controls layout responsiveness",
        body: "body a",
        kind: "module",
      });
      await insertReferenceDoc(db, {
        slug: "framework-principles",
        title: "Framework Principles",
        summary: "Composition overview",
        body: "body b",
        kind: "architecture",
      });

      const listRes = await handleChatRoute(get(`/api/reference-docs`), makeEnv(db));
      expect(listRes.status).toBe(200);
      const { docs } = (await listRes.json()) as {
        docs: Array<{ slug: string; title: string; summary: string; kind: string }>;
      };
      expect(docs.length).toBe(2);
      const bySlug = new Map(docs.map((d) => [d.slug, d]));
      expect(bySlug.get("hero-module")).toEqual({
        slug: "hero-module",
        title: "Cinematic Hero Module",
        summary: "Controls layout responsiveness",
        kind: "module",
      });
      expect(bySlug.get("framework-principles")).toEqual({
        slug: "framework-principles",
        title: "Framework Principles",
        summary: "Composition overview",
        kind: "architecture",
      });
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC808_read_reference_doc_full_content_and_unknown_is_not_found", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    try {
      const toc = JSON.stringify([{ section_slug: "variants", description: "Allowed variants" }]);
      await insertReferenceDoc(db, {
        slug: "hero-module",
        title: "Cinematic Hero Module",
        summary: "Controls layout responsiveness",
        toc_json: toc,
        body: "## Intro\nintro body\n\n## Variants\nvariant body",
        kind: "module",
      });

      const docRes = await handleChatRoute(get(`/api/reference-docs/hero-module`), makeEnv(db));
      expect(docRes.status).toBe(200);
      const doc = (await docRes.json()) as {
        slug: string;
        title: string;
        summary: string;
        toc: Array<{ section_slug: string; description: string }>;
        body: string;
      };
      expect(doc.slug).toBe("hero-module");
      expect(doc.title).toBe("Cinematic Hero Module");
      expect(doc.summary).toBe("Controls layout responsiveness");
      expect(doc.toc).toEqual([{ section_slug: "variants", description: "Allowed variants" }]);
      expect(doc.body).toBe("## Intro\nintro body\n\n## Variants\nvariant body");

      // Unknown slug is not-found.
      const missingRes = await handleChatRoute(get(`/api/reference-docs/does-not-exist`), makeEnv(db));
      expect(missingRes.status).toBe(404);
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC809_read_reference_doc_section_narrows_body_with_fallback", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    try {
      await insertReferenceDoc(db, {
        slug: "hero-module",
        title: "Cinematic Hero Module",
        summary: "Controls layout responsiveness",
        body: "## Intro\nintro body\n\n## Variants\nvariant body\n\n## Usage\nusage body",
        kind: "module",
      });

      // A valid section narrows the body to just that section's content.
      const sectionRes = await handleChatRoute(
        get(`/api/reference-docs/hero-module?section=variants`),
        makeEnv(db),
      );
      expect(sectionRes.status).toBe(200);
      const sectioned = (await sectionRes.json()) as { body: string };
      expect(sectioned.body).toContain("Variants");
      expect(sectioned.body).toContain("variant body");
      expect(sectioned.body).not.toContain("intro body");
      expect(sectioned.body).not.toContain("usage body");

      // An unknown section falls back to the full body; the request still succeeds.
      const fallbackRes = await handleChatRoute(
        get(`/api/reference-docs/hero-module?section=nonexistent`),
        makeEnv(db),
      );
      expect(fallbackRes.status).toBe(200);
      const fallback = (await fallbackRes.json()) as { body: string };
      expect(fallback.body).toContain("intro body");
      expect(fallback.body).toContain("variant body");
      expect(fallback.body).toContain("usage body");
    } finally {
      await test.cleanup();
    }
  });

  it("test_UAT_AC810_append_validates_role_and_content_and_rejects_unknown_session", async () => {
    const test = await createReq23TestDb();
    const db = test.db as unknown as D1Like;
    try {
      const siteId = "site_810";
      await insertSite(db, { id: siteId, account_id: ACCOUNT_ID, slug: "site-810" });
      await insertSession(db, { id: "sess_810", site_id: siteId });

      // Each recognised role is accepted.
      const validRoles = ["user", "assistant", "system", "tool_result"];
      for (const role of validRoles) {
        const r = await handleChatRoute(
          postJson(`/api/chats/sess_810/messages`, { role, content: `c-${role}` }),
          makeEnv(db),
        );
        expect(r.status).toBe(201);
      }

      const countOf = async (): Promise<number> => {
        const listRes = await handleChatRoute(get(`/api/sites/${siteId}/chats`), makeEnv(db));
        const { sessions } = (await listRes.json()) as { sessions: SessionShape[] };
        return sessions.find((s) => s.id === "sess_810")?.message_count ?? -1;
      };
      expect(await countOf()).toBe(4);

      // Unrecognised role → client error, no message appended.
      const badRole = await handleChatRoute(
        postJson(`/api/chats/sess_810/messages`, { role: "wizard", content: "x" }),
        makeEnv(db),
      );
      expect(badRole.status).toBe(400);
      expect(await countOf()).toBe(4);

      // Non-string content → client error, no message appended.
      const badContent = await handleChatRoute(
        postJson(`/api/chats/sess_810/messages`, { role: "user", content: 123 }),
        makeEnv(db),
      );
      expect(badContent.status).toBe(400);
      expect(await countOf()).toBe(4);

      // Append targeting a non-existent session → not-found.
      const missing = await handleChatRoute(
        postJson(`/api/chats/sess_missing/messages`, { role: "user", content: "x" }),
        makeEnv(db),
      );
      expect(missing.status).toBe(404);
    } finally {
      await test.cleanup();
    }
  });
});
