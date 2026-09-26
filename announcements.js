/* ================================================================
 * SQL MIGRATION (endesha hii mara moja kwenye Supabase SQL editor,
 * SIYO sehemu ya kanuni ya JS inayotekelezwa hapa chini — imewekwa
 * hapa kwa ajili tu ya kumbukumbu ili faili moja liwe na kila kitu
 * kinachohusiana na feature hii):
 *
 * -- ============================================================
 * -- Announcement & Notification Center — Supabase migration
 * -- Salama kwa kuendesha mara nyingi (idempotent): IF NOT EXISTS kila mahali.
 * -- Kagua kwanza kama fields hizi tayari zipo kwenye "posts" kabla ya kuendesha.
 * -- ============================================================
 * 
 * -- 1) Fields mpya kwenye jedwali lililopo "posts" (halibadilishwi jina)
 * alter table public.posts add column if not exists excerpt text;
 * alter table public.posts add column if not exists category text;
 * alter table public.posts add column if not exists priority text default 'normal'
 *   check (priority in ('critical', 'important', 'normal', 'info'));
 * alter table public.posts add column if not exists is_pinned boolean not null default false;
 * alter table public.posts add column if not exists expires_at timestamptz;
 * alter table public.posts add column if not exists attachment_url text;
 * alter table public.posts add column if not exists external_url text;
 * alter table public.posts add column if not exists author_id text;
 * alter table public.posts add column if not exists updated_at timestamptz not null default now();
 * 
 * create index if not exists idx_posts_status_published on public.posts (status, published_at desc);
 * create index if not exists idx_posts_expires_at on public.posts (expires_at);
 * 
 * -- 2) Jedwali jipya la read-tracking (per-user, si per-announcement)
 * create table if not exists public.announcement_reads (
 *   id uuid primary key default gen_random_uuid(),
 *   announcement_id uuid not null references public.posts(id) on delete cascade,
 *   user_id text not null,
 *   read_at timestamptz not null default now(),
 *   unique (announcement_id, user_id)
 * );
 * 
 * create index if not exists idx_announcement_reads_user on public.announcement_reads (user_id);
 * create index if not exists idx_announcement_reads_announcement on public.announcement_reads (announcement_id);
 * 
 * -- ============================================================
 * -- Row Level Security
 * -- MUHIMU: App hii kwa sasa haina Supabase Auth iliyounganishwa —
 * -- "user_id" ni kitambulisho cha kifaa kinachotengenezwa na
 * -- announcements.js, si auth.uid() ya kweli. Kwa hiyo RLS chini
 * -- inaruhusu "anon" (publishable key) kusoma/kuandika read-receipts
 * -- zake bila kuthibitisha ni nani hasa kwa 100% — hii ni kikwazo
 * -- cha kiusalama kinachokubalika kwa crew app ya ndani, lakini
 * -- SI salama kwa data nyeti za kila mtumiaji. Kwa usalama kamili,
 * -- unganisha Supabase Auth halisi baadaye na badilisha policy hizi
 * -- kutumia auth.uid() = user_id.
 * -- ============================================================
 * 
 * alter table public.posts enable row level security;
 * 
 * drop policy if exists "Published posts readable by anyone" on public.posts;
 * create policy "Published posts readable by anyone"
 *   on public.posts for select
 *   using (status = 'published');
 * 
 * -- Endelea kuruhusu admin/service-role pekee kuandika/kubadilisha "posts"
 * -- (usiweke policy ya insert/update/delete kwa role ya "anon" hapa).
 * 
 * alter table public.announcement_reads enable row level security;
 * 
 * drop policy if exists "Anyone can read read-receipts" on public.announcement_reads;
 * create policy "Anyone can read read-receipts"
 *   on public.announcement_reads for select
 *   using (true);
 * 
 * drop policy if exists "Anyone can insert own read-receipt" on public.announcement_reads;
 * create policy "Anyone can insert own read-receipt"
 *   on public.announcement_reads for insert
 *   with check (true);
 * 
 * drop policy if exists "Anyone can update own read-receipt" on public.announcement_reads;
 * create policy "Anyone can update own read-receipt"
 *   on public.announcement_reads for update
 *   using (true);
 * ================================================================ */

"use strict";
/* ================================================================
 * announcements.combined.js — "📢 New" Tab (JS + CSS + SQL katika faili moja)
 * Professional Crew Announcement & Notification Center
 *
 * HAIGUZI core.js / script.js / index.html / RescueDB schema kabisa.
 * Inaongeza kitufe chake cha nav + overlay yake yenyewe kwenye DOM,
 * CSS yake imepachikwa (inline) ndani ya JS hii — hakuna
 * faili la nje la announcements.css linalohitajika tena.
 *
 * Data source: Supabase table "posts" (published only), + jedwali
 * jipya "announcement_reads" kwa read-tracking ya kila mtumiaji.
 * Offline cache: RescueDB/IndexedDB (settings store) — hakuna
 * IndexedDB nyingine iliyotengenezwa.
 *
 * MUHIMU (soma): App hii haina mfumo wa Supabase Auth. Kwa hiyo
 * "user_id" ya read-tracking ni kitambulisho cha kifaa (local id),
 * kimewekwa kwenye RescueDB settings, si akaunti ya kweli. Hii
 * inaruhusu "umesoma / haujasoma" kufanya kazi per-device, lakini
 * si per-crew-member 100% salama kwa multi-device mtu mmoja. Kwa
 * usalama kamili wa baadaye, unganisha Supabase Auth halisi.
 * ================================================================ */
(function () {
  /* ---------------- Config ---------------- */
  const SUPABASE_URL = "https://c--7f6fe176-f458-46d1-add7-d90bba190bf5-prod.lovable.cloud";
  const SUPABASE_ANON_KEY = "sb_publishable_6nwtjI7yQSuQF5DLJ6Nmbw_EtLzZVqo";
  const TABLE = "posts";
  const READS_TABLE = "announcement_reads";
  const PAGE_SIZE = 20;

  const CACHE_KEY = "cachedAnnouncements";        // array ya posts (backward-compatible key)
  const CACHE_META_KEY = "cachedAnnouncementsMeta"; // { lastSync }
  const READ_IDS_KEY = "annReadIds";              // array ya id zilizosomwa (local)
  const PENDING_READS_KEY = "annPendingReads";    // queue ya reads bado hazijafika Supabase
  const USER_ID_KEY = "annLocalUserId";

  const CATEGORIES = [
    { key: "Yote", label: "Yote", ic: "" },
    { key: "Dharura", label: "Dharura", ic: "\uD83D\uDEA8" },
    { key: "General", label: "General", ic: "\uD83D\uDCCC" },
    { key: "Mafunzo", label: "Mafunzo", ic: "\uD83D\uDCDA" },
    { key: "Operations", label: "Operations", ic: "\uD83D\uDE92" },
    { key: "Maelekezo", label: "Maelekezo", ic: "\uD83E\uDDED" },
    { key: "Tahadhari", label: "Tahadhari", ic: "\u26A0\uFE0F" },
    { key: "Matukio", label: "Matukio", ic: "\uD83D\uDCC5" },
  ];

  const PRIORITY_META = {
    critical: { label: "CRITICAL", ic: "\uD83D\uDEA8", rank: 0, cls: "crit" },
    important: { label: "IMPORTANT", ic: "\uD83D\uDD34", rank: 1, cls: "imp" },
    normal: { label: "NORMAL", ic: "\uD83D\uDFE1", rank: 2, cls: "norm" },
    info: { label: "INFO", ic: "\uD83D\uDD35", rank: 3, cls: "info" },
  };
  function priorityMeta(p) { return PRIORITY_META[p] || PRIORITY_META.normal; }

  /* ---------------- Small helpers ---------------- */
  function esc(s) {
    return s == null ? "" : String(s).replace(/[&<>"']/g, (c) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
  }
  function fmt(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleString();
  }
  function fmtShort(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d) ? "" : d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "ann-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }
  // Inazuia javascript: na protocols hatari; inaruhusu http(s) tu kwa links/attachments.
  function safeLinkUrl(u) {
    if (!u) return null;
    const s = String(u).trim();
    return /^https?:\/\//i.test(s) ? s : null;
  }
  // Kwa <img src>: zuia javascript: pekee (https/relative/data zinaruhusiwa).
  function safeImgSrc(u) {
    if (!u) return null;
    const s = String(u).trim();
    return /^javascript:/i.test(s) ? null : s;
  }
  function isExpired(p) {
    if (!p.expires_at) return false;
    const d = new Date(p.expires_at);
    return !isNaN(d) && d.getTime() < Date.now();
  }
  function getBody(p) { return p.content || p.body || p.excerpt || ""; }
  function getExcerpt(p) {
    const src = p.excerpt || getBody(p);
    return src.length > 140 ? src.slice(0, 140).trim() + "\u2026" : src;
  }
  function getImage(p) { return p.image || p.image_url || p.cover_image || ""; }
  function getWhen(p) { return p.published_at || p.publication_date || p.created_at; }

  function sortAnnouncements(list) {
    return list.slice().sort((a, b) => {
      const pinA = a.is_pinned ? 0 : 1, pinB = b.is_pinned ? 0 : 1;
      if (pinA !== pinB) return pinA - pinB;
      const rA = priorityMeta(a.priority).rank, rB = priorityMeta(b.priority).rank;
      if (rA !== rB) return rA - rB;
      return String(getWhen(b) || "").localeCompare(String(getWhen(a) || ""));
    });
  }

  /* ---------------- RescueDB-backed local storage ---------------- */
  const db = () => window.RescueDB;
  async function dbGet(key, fallback) { return db() ? db().getSetting(key, fallback) : fallback; }
  async function dbSet(key, value) { if (db()) await db().setSetting(key, value); }

  async function ensureUserId() {
    let id = await dbGet(USER_ID_KEY, null);
    if (!id) { id = uuid(); await dbSet(USER_ID_KEY, id); }
    return id;
  }

  /* ---------------- Stylesheet auto-inject (CSS imewekwa ndani ya JS hii) ---------------- */
  const ANN_CSS = `/* announcements.css — Professional Crew Announcement & Notification Center
 * Inatumia CSS variables zilizopo kwenye style.css (--bg, --bg-raised, n.k.)
 * ili kulingana na theme ya app iliyopo. Created by Herman Sade. */

.ann-overlay {
  position: fixed;
  inset: 0;
  background: var(--bg, #0e1420);
  z-index: 600;
  display: flex;
  flex-direction: column;
}
.ann-overlay-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--line, #232b3e);
  flex-shrink: 0;
}
.ann-overlay-head h2 { margin: 0; color: var(--text, #eef2f8); font-size: 17px; }
.ann-back {
  background: none;
  border: none;
  color: var(--text, #eef2f8);
  font-size: 15px;
  cursor: pointer;
  padding: 6px 4px;
  border-radius: 6px;
}
.ann-back:focus-visible { outline: 2px solid var(--accent, #e05a2f); }

.ann-body { flex: 1; overflow-y: auto; padding: 14px; -webkit-overflow-scrolling: touch; }

/* ---------- Top controls ---------- */
.ann-topline {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.ann-status { font-size: 12px; color: var(--text-dim, #9fb0c9); font-weight: 600; }
.ann-sync { font-size: 11px; color: var(--text-faint, #6b7a94); flex: 1; }
.ann-refresh-btn {
  background: var(--bg-raised-2, #1c283d);
  border: 1px solid var(--line, #232b3e);
  color: var(--text, #eef2f8);
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 12px;
  cursor: pointer;
}
.ann-refresh-btn:active { transform: translateY(1px); }

.ann-error-banner {
  background: var(--danger-bg, #3a1a16);
  color: var(--warn, #e0a930);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12.5px;
  margin-bottom: 10px;
}

.ann-search {
  width: 100%;
  background: var(--bg-raised-2, #1c283d);
  border: 1px solid var(--line, #232b3e);
  color: var(--text, #eef2f8);
  border-radius: 8px;
  padding: 11px 12px;
  font-size: 15px;
  margin-bottom: 10px;
}
.ann-search:focus-visible { outline: 2px solid var(--accent, #e05a2f); outline-offset: -1px; }

.ann-chips {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 4px;
  margin-bottom: 10px;
}
.ann-chip {
  flex-shrink: 0;
  border: 1px solid var(--line, #232b3e);
  background: var(--bg-raised-2, #1c283d);
  color: var(--text-dim, #9fb0c9);
  border-radius: 999px;
  padding: 8px 13px;
  font-size: 12.5px;
  cursor: pointer;
  white-space: nowrap;
}
.ann-chip.active { background: var(--accent, #e05a2f); border-color: var(--accent, #e05a2f); color: var(--accent-text, #fff3ec); font-weight: 600; }
.ann-chip:focus-visible { outline: 2px solid var(--accent, #e05a2f); }

.ann-tabs { display: flex; gap: 6px; margin-bottom: 12px; border-bottom: 1px solid var(--line, #232b3e); }
.ann-tab {
  background: none;
  border: none;
  color: var(--text-faint, #6b7a94);
  padding: 8px 4px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-right: 14px;
}
.ann-tab.active { color: var(--accent, #e05a2f); border-bottom-color: var(--accent, #e05a2f); }

/* ---------- List / cards ---------- */
.ann-list { display: flex; flex-direction: column; gap: 10px; }
.ann-card {
  background: var(--bg-raised, #161c2b);
  border: 1px solid var(--line, #232b3e);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  text-align: left;
}
.ann-card:focus-visible { outline: 2px solid var(--accent, #e05a2f); }
.ann-card.unread { border-color: color-mix(in srgb, var(--accent, #e05a2f) 45%, var(--line, #232b3e)); }
.ann-card-img { width: 100%; max-height: 150px; object-fit: cover; display: block; }
.ann-card-body { padding: 12px 14px; }

.ann-card-flags { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 6px; }
.ann-flag {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: .03em;
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--bg-raised-2, #1c283d);
  color: var(--text-dim, #9fb0c9);
}
.ann-flag.pin { background: color-mix(in srgb, var(--accent, #e05a2f) 22%, var(--bg-raised-2, #1c283d)); color: var(--accent, #e05a2f); }
.ann-flag.prio.crit { background: #3a1a16; color: #ff5c46; }
.ann-flag.prio.imp { background: #3a2116; color: #ff9a4d; }
.ann-flag.prio.norm { background: #3a3320; color: #e0c04a; }
.ann-flag.prio.info { background: #16283a; color: #5aa9e6; }

.ann-card-title { display: flex; align-items: center; gap: 7px; color: var(--text, #eef2f8); font-size: 15px; font-weight: 700; margin-bottom: 4px; }
.ann-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--danger, #e0492f); flex-shrink: 0; }
.ann-card-excerpt { color: var(--text-dim, #9fb0c9); font-size: 13px; line-height: 1.45; margin-bottom: 8px; }
.ann-card-meta { display: flex; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--text-faint, #6b7a94); }
.ann-read-state { white-space: nowrap; }

.ann-loadmore-btn {
  background: var(--bg-raised-2, #1c283d);
  border: 1px solid var(--line, #232b3e);
  color: var(--text, #eef2f8);
  border-radius: 10px;
  padding: 12px;
  font-size: 14px;
  cursor: pointer;
  margin-top: 4px;
}

.ann-skeleton, .ann-empty {
  text-align: center;
  padding: 40px 16px;
  color: var(--text-faint, #6b7a94);
  font-size: 14px;
  line-height: 1.7;
}

/* ---------- Detail view ---------- */
.ann-detail { padding-bottom: 20px; }
.ann-detail-title { color: var(--text, #eef2f8); font-size: 19px; margin: 10px 0 6px; }
.ann-detail-meta { display: flex; gap: 6px; flex-wrap: wrap; color: var(--text-faint, #6b7a94); font-size: 12px; margin-bottom: 12px; }
.ann-detail-img { width: 100%; border-radius: 10px; margin-bottom: 12px; cursor: zoom-in; display: block; }
.ann-detail-content { color: var(--text, #eef2f8); font-size: 14.5px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; margin-bottom: 16px; }

.ann-attachment {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  background: var(--bg-raised-2, #1c283d);
  border: 1px solid var(--line, #232b3e);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 10px;
  font-size: 13px;
  color: var(--text-dim, #9fb0c9);
}
.ann-attachment-btn, .ann-external-btn {
  display: inline-block;
  background: var(--bg-raised, #161c2b);
  border: 1px solid var(--line, #232b3e);
  color: var(--accent, #e05a2f);
  border-radius: 8px;
  padding: 6px 11px;
  font-size: 12.5px;
  text-decoration: none;
}
.ann-external-btn { margin-bottom: 14px; font-weight: 600; }

.ann-detail-actions { display: flex; gap: 10px; margin-top: 6px; }
.ann-action-btn {
  flex: 1;
  background: var(--bg-raised-2, #1c283d);
  border: 1px solid var(--line, #232b3e);
  color: var(--text, #eef2f8);
  border-radius: 10px;
  padding: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.ann-action-btn:active { transform: translateY(1px); }

/* ---------- Fullscreen image viewer ---------- */
.ann-viewer {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.9);
  z-index: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ann-viewer img { max-width: 94vw; max-height: 88vh; object-fit: contain; border-radius: 6px; }
.ann-viewer-close {
  position: absolute;
  top: 16px; right: 16px;
  background: rgba(255,255,255,.12);
  border: none;
  color: #fff;
  width: 38px; height: 38px;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
}

/* ---------- Toast ---------- */
.ann-toast {
  position: absolute;
  bottom: 18px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-raised-2, #1c283d);
  border: 1px solid var(--line, #232b3e);
  color: var(--text, #eef2f8);
  padding: 9px 16px;
  border-radius: 999px;
  font-size: 13px;
  box-shadow: 0 4px 14px rgba(0,0,0,.35);
  z-index: 650;
}

/* ---------- Nav badge (sidebar + bottom nav) ---------- */
.ann-nav-btn { position: relative; }
.ann-badge {
  font-size: 10px;
  font-weight: 800;
  background: var(--danger-bg, #3a1a16);
  color: var(--danger, #e0492f);
  border-radius: 999px;
  padding: 2px 6px;
  margin-left: 4px;
  white-space: nowrap;
}
.bottom-nav .ann-badge {
  position: absolute;
  top: 2px;
  right: 8px;
  padding: 1px 5px;
  font-size: 9px;
}

/* ---------- Responsive ---------- */
@media (min-width: 600px) {
  .ann-body { max-width: 640px; margin: 0 auto; }
}
@media (prefers-reduced-motion: reduce) {
  .ann-card, .ann-refresh-btn, .ann-action-btn { transition: none; }
}
`;
  function ensureStylesheet() {
    if (document.querySelector(`style[data-ann-css]`)) return;
    const style = document.createElement("style");
    style.setAttribute("data-ann-css", "1");
    style.textContent = ANN_CSS;
    document.head.appendChild(style);
  }

  /* ---------------- Supabase REST ---------------- */
  function authHeaders(extra) {
    return Object.assign({
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    }, extra || {});
  }
  async function fetchPage(offset, limit) {
    const url = `${SUPABASE_URL}/rest/v1/${TABLE}?select=*&status=eq.published&deleted_at=is.null&order=published_at.desc&offset=${offset}&limit=${limit}`;
    const res = await fetch(url, { headers: authHeaders() });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error("HTTP " + res.status + " " + t.slice(0, 120));
    }
    return res.json();
  }
  async function fetchRemoteReadIds(userId) {
    try {
      const url = `${SUPABASE_URL}/rest/v1/${READS_TABLE}?select=announcement_id&user_id=eq.${encodeURIComponent(userId)}`;
      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) return [];
      const rows = await res.json();
      return rows.map((r) => r.announcement_id);
    } catch (e) {
      console.error("announcements: fetchRemoteReadIds failed", e);
      return [];
    }
  }
  async function pushRead(announcementId, userId) {
    const url = `${SUPABASE_URL}/rest/v1/${READS_TABLE}?on_conflict=announcement_id,user_id`;
    const res = await fetch(url, {
      method: "POST",
      headers: authHeaders({
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      }),
      body: JSON.stringify({ announcement_id: announcementId, user_id: userId, read_at: new Date().toISOString() }),
    });
    if (!res.ok) throw new Error("HTTP " + res.status);
  }

  /* ---------------- App state ---------------- */
  const State = {
    all: [],            // announcements zote zilizopakuliwa (active + expired)
    readIds: new Set(),
    pendingReads: [],
    userId: null,
    online: navigator.onLine,
    lastSync: null,
    category: "Yote",
    query: "",
    view: "active",      // active | archive
    offset: 0,
    hasMore: true,
    loading: false,
    detailId: null,
    overlayEl: null,
  };

  async function loadLocalReadState() {
    const ids = await dbGet(READ_IDS_KEY, []);
    State.readIds = new Set(ids || []);
    State.pendingReads = (await dbGet(PENDING_READS_KEY, [])) || [];
  }
  async function persistReadIds() { await dbSet(READ_IDS_KEY, Array.from(State.readIds)); }
  async function persistPending() { await dbSet(PENDING_READS_KEY, State.pendingReads); }

  async function markRead(id) {
    if (State.readIds.has(id)) return;
    State.readIds.add(id);
    await persistReadIds();
    updateBadges();
    try {
      await pushRead(id, State.userId);
    } catch (e) {
      State.pendingReads.push({ announcement_id: id, user_id: State.userId, read_at: new Date().toISOString() });
      await persistPending();
    }
  }
  async function flushPendingReads() {
    if (!State.pendingReads.length || !navigator.onLine) return;
    const rest = [];
    for (const p of State.pendingReads) {
      try { await pushRead(p.announcement_id, p.user_id); }
      catch (e) { rest.push(p); }
    }
    State.pendingReads = rest;
    await persistPending();
  }

  function getUnreadCount() {
    return State.all.filter((p) => !isExpired(p) && !State.readIds.has(p.id)).length;
  }

  /* ---------------- Data pipeline ---------------- */
  async function loadFromCache() {
    const cached = await dbGet(CACHE_KEY, []);
    const meta = await dbGet(CACHE_META_KEY, {});
    State.all = cached || [];
    State.lastSync = meta && meta.lastSync ? meta.lastSync : null;
  }
  async function saveCache() {
    await dbSet(CACHE_KEY, State.all);
    State.lastSync = new Date().toISOString();
    await dbSet(CACHE_META_KEY, { lastSync: State.lastSync });
  }

  async function refreshFromNetwork(reset) {
    if (State.loading) return;
    State.loading = true;
    if (reset) State.offset = 0;
    try {
      const page = await fetchPage(State.offset, PAGE_SIZE);
      State.hasMore = page.length === PAGE_SIZE;
      const byId = new Map(State.all.map((p) => [p.id, p]));
      page.forEach((p) => byId.set(p.id, p));
      State.all = Array.from(byId.values());
      State.offset += page.length;
      await saveCache();
      const remoteReadIds = await fetchRemoteReadIds(State.userId);
      remoteReadIds.forEach((id) => State.readIds.add(id));
      await persistReadIds();
      await flushPendingReads();
      State.online = true;
      return { ok: true };
    } catch (e) {
      console.error("announcements: refresh failed", e);
      State.online = false;
      return { ok: false, error: e };
    } finally {
      State.loading = false;
    }
  }

  function getFilteredList() {
    let list = State.all.filter((p) => (State.view === "archive" ? isExpired(p) : !isExpired(p)));
    if (State.category !== "Yote") {
      list = list.filter((p) => (p.category || "").toLowerCase() === State.category.toLowerCase());
    }
    if (State.query.trim()) {
      const q = State.query.trim().toLowerCase();
      list = list.filter((p) => [p.title, getBody(p), p.excerpt, p.category]
        .filter(Boolean).some((f) => String(f).toLowerCase().includes(q)));
    }
    return sortAnnouncements(list);
  }

  /* ---------------- Nav button + badge (sidebar & bottom nav) ---------------- */
  function navButtonInnerHtml(unread) {
    const badge = unread > 0
      ? `<span class="ann-badge" aria-label="${unread} matangazo hayajasomwa">\uD83D\uDD34 ${unread}</span>`
      : "";
    return `<span class="ic">\uD83D\uDCE2</span><span>New${badge ? "" : ""}</span>${badge}`;
  }
  function updateBadges() {
    const unread = getUnreadCount();
    document.querySelectorAll(".ann-nav-btn").forEach((b) => { b.innerHTML = navButtonInnerHtml(unread); });
    if (State.overlayEl) renderBody();
  }

  function makeNavButton() {
    const btn = document.createElement("button");
    btn.className = "nav-btn ann-nav-btn";
    btn.setAttribute("aria-label", "Fungua Matangazo");
    btn.innerHTML = navButtonInnerHtml(0);
    btn.addEventListener("click", openOverlay);
    return btn;
  }
  function injectNav() {
    const sidebar = document.querySelector("nav.sidebar");
    const bottomRow = document.querySelector(".bottom-nav .nav-row");
    if (!sidebar || !bottomRow) return false;
    if (!sidebar.querySelector(".ann-nav-btn")) sidebar.appendChild(makeNavButton());
    if (!bottomRow.querySelector(".ann-nav-btn")) bottomRow.appendChild(makeNavButton());
    return true;
  }
  function waitAndInject(triesLeft) {
    if (injectNav()) { updateBadges(); return; }
    if (triesLeft <= 0) return;
    setTimeout(() => waitAndInject(triesLeft - 1), 200);
  }

  /* ---------------- Toast (self-contained, haitegemei app.js) ---------------- */
  function annToast(msg) {
    const host = State.overlayEl || document.body;
    const el = document.createElement("div");
    el.className = "ann-toast";
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.remove(), 2200);
  }

  /* ---------------- Share / Copy ---------------- */
  async function shareAnnouncement(p) {
    const link = safeLinkUrl(p.external_url) || location.href;
    const text = `${p.title}\n\n${getExcerpt(p)}`;
    if (navigator.share) {
      try { await navigator.share({ title: p.title, text, url: link }); return; }
      catch (e) { if (e && e.name === "AbortError") return; }
    }
    await copyToClipboard(`${p.title}\n\n${getBody(p)}\n${link}`);
    annToast("\u2713 Imenakiliwa (Share haipo kwenye kivinjari hiki)");
  }
  async function copyToClipboard(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      ta.remove(); return ok;
    }
  }
  async function copyAnnouncement(p) {
    const link = safeLinkUrl(p.external_url) || "";
    const text = `${p.title}\n\n${getBody(p)}${link ? "\n" + link : ""}`;
    const ok = await copyToClipboard(text);
    annToast(ok ? "\u2713 Imenakiliwa" : "Imeshindikana kunakili");
  }

  /* ---------------- Rendering ---------------- */
  function chipHtml() {
    return CATEGORIES.map((c) => `
      <button class="ann-chip ${State.category === c.key ? "active" : ""}" data-cat="${esc(c.key)}">
        ${c.ic ? c.ic + " " : ""}${esc(c.label)}
      </button>`).join("");
  }

  function cardHtml(p) {
    const unread = !State.readIds.has(p.id);
    const pm = priorityMeta(p.priority);
    const img = safeImgSrc(getImage(p));
    return `
      <div class="ann-card ${unread ? "unread" : ""} ${pm.cls}" data-open="${esc(p.id)}" role="button" tabindex="0" aria-label="${esc(p.title || "Tangazo")}">
        ${img ? `<img class="ann-card-img" src="${esc(img)}" alt="">` : ""}
        <div class="ann-card-body">
          <div class="ann-card-flags">
            ${p.is_pinned ? `<span class="ann-flag pin">\uD83D\uDCCC Pinned</span>` : ""}
            <span class="ann-flag prio ${pm.cls}">${pm.ic} ${pm.label}</span>
            ${p.category ? `<span class="ann-flag cat">${esc(p.category)}</span>` : ""}
          </div>
          <div class="ann-card-title">${unread ? '<span class="ann-dot" aria-hidden="true"></span>' : ""}${esc(p.title || "Tangazo")}</div>
          <div class="ann-card-excerpt">${esc(getExcerpt(p))}</div>
          <div class="ann-card-meta">
            <span>${esc(fmtShort(getWhen(p)))}</span>
            <span class="ann-read-state">${unread ? "\uD83D\uDD34 Haijasomwa" : "\u2713 Imesomwa"}</span>
          </div>
        </div>
      </div>`;
  }

  function listHtml() {
    const list = getFilteredList();
    if (State.loading && !State.all.length) {
      return `<div class="ann-skeleton">Inapakia matangazo\u2026</div>`;
    }
    if (!list.length) {
      return State.query.trim()
        ? `<div class="ann-empty">\uD83D\uDD0D<br>Hakuna tangazo linalolingana na utafutaji wako.</div>`
        : `<div class="ann-empty">\uD83D\uDCE2<br>Hakuna matangazo kwa sasa.</div>`;
    }
    const more = (State.view === "active" && State.hasMore && !State.query.trim() && State.category === "Yote")
      ? `<button class="ann-loadmore-btn" id="ann-loadmore">Load More</button>` : "";
    return list.map(cardHtml).join("") + more;
  }

  function detailHtml(p) {
    const pm = priorityMeta(p.priority);
    const img = safeImgSrc(getImage(p));
    const attach = safeLinkUrl(p.attachment_url);
    const extUrl = safeLinkUrl(p.external_url);
    const unread = !State.readIds.has(p.id);
    return `
      <div class="ann-detail">
        <button class="ann-back" id="ann-detail-back" aria-label="Rudi nyuma">\u2190 Rudi</button>
        <div class="ann-card-flags">
          ${p.is_pinned ? `<span class="ann-flag pin">\uD83D\uDCCC Pinned</span>` : ""}
          <span class="ann-flag prio ${pm.cls}">${pm.ic} ${pm.label}</span>
          ${p.category ? `<span class="ann-flag cat">${esc(p.category)}</span>` : ""}
        </div>
        <h2 class="ann-detail-title">${esc(p.title || "Tangazo")}</h2>
        <div class="ann-detail-meta">
          <span>${esc(fmt(getWhen(p)))}</span>
          <span>\u00B7 ${esc(p.author_id ? String(p.author_id) : "Uongozi")}</span>
          <span>\u00B7 ${unread ? "\uD83D\uDD34 Haijasomwa" : "\u2713 Imesomwa"}</span>
        </div>
        ${img ? `<img class="ann-detail-img" id="ann-detail-img" src="${esc(img)}" alt="" role="button" aria-label="Onyesha picha kubwa">` : ""}
        <div class="ann-detail-content">${esc(getBody(p))}</div>
        ${attach ? `<div class="ann-attachment"><span>\uD83D\uDCCE ${esc((attach.split("/").pop() || "Kiambatisho").split("?")[0])}</span>
            <a class="ann-attachment-btn" href="${esc(attach)}" target="_blank" rel="noopener noreferrer">Fungua</a>
            <a class="ann-attachment-btn" href="${esc(attach)}" download target="_blank" rel="noopener noreferrer">Pakua</a></div>` : ""}
        ${extUrl ? `<a class="ann-external-btn" href="${esc(extUrl)}" target="_blank" rel="noopener noreferrer">\uD83D\uDD17 Fungua Kiungo</a>` : ""}
        <div class="ann-detail-actions">
          <button class="ann-action-btn" id="ann-share">\u2197 Share</button>
          <button class="ann-action-btn" id="ann-copy">\uD83D\uDCCB Copy</button>
        </div>
      </div>`;
  }

  function headerHtml() {
    const dot = State.online ? "\uD83D\uDFE2 Online" : "\uD83D\uDD34 Offline";
    const sync = State.lastSync ? `Last synced: ${esc(new Date(State.lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}` : "";
    return `
      <div class="ann-topline">
        <span class="ann-status">${dot}</span>
        <span class="ann-sync">${sync}</span>
        <button class="ann-refresh-btn" id="ann-refresh" aria-label="Sasisha matangazo">\u21BB Refresh</button>
      </div>
      <div class="ann-error-slot" id="ann-error-slot"></div>
      <input class="ann-search" id="ann-search" type="search" inputmode="search" placeholder="\uD83D\uDD0D Tafuta matangazo..." value="${esc(State.query)}" aria-label="Tafuta matangazo">
      <div class="ann-chips" role="group" aria-label="Chuja kwa category">${chipHtml()}</div>
      <div class="ann-tabs" role="tablist">
        <button class="ann-tab ${State.view === "active" ? "active" : ""}" data-view="active" role="tab">Active</button>
        <button class="ann-tab ${State.view === "archive" ? "active" : ""}" data-view="archive" role="tab">Archive</button>
      </div>`;
  }

  function renderBody() {
    const bodyEl = State.overlayEl && State.overlayEl.querySelector("#ann-body");
    if (!bodyEl) return;
    if (State.detailId) {
      const p = State.all.find((x) => x.id === State.detailId);
      bodyEl.innerHTML = p ? detailHtml(p) : `<div class="ann-empty">Tangazo halikupatikana.</div>`;
    } else {
      bodyEl.innerHTML = headerHtml() + `<div class="ann-list" id="ann-list">${listHtml()}</div>`;
    }
  }

  /* ---------------- Pull-to-refresh (touch) ---------------- */
  function wirePullToRefresh(scrollEl) {
    let startY = null, pulling = false;
    scrollEl.addEventListener("touchstart", (e) => {
      if (scrollEl.scrollTop <= 0) { startY = e.touches[0].clientY; pulling = true; }
      else { startY = null; pulling = false; }
    }, { passive: true });
    scrollEl.addEventListener("touchmove", (e) => {
      if (!pulling || startY == null) return;
      const dy = e.touches[0].clientY - startY;
      if (dy > 70) { pulling = false; startY = null; doRefresh(); }
    }, { passive: true });
    scrollEl.addEventListener("touchend", () => { pulling = false; startY = null; });
  }

  /* ---------------- Actions wiring (event delegation, once per overlay) ---------------- */
  async function doRefresh() {
    setErrorSlot("");
    annToast("\u21BB Inasasisha\u2026");
    const r = await refreshFromNetwork(true);
    if (!r.ok) {
      setErrorSlot("\u26A0\uFE0F Imeshindikana kupata matangazo mapya. Inaonyesha matangazo yaliyohifadhiwa mwisho.");
      console.error(r.error);
    }
    updateBadges();
  }
  function setErrorSlot(msg) {
    const el = State.overlayEl && State.overlayEl.querySelector("#ann-error-slot");
    if (el) el.innerHTML = msg ? `<div class="ann-error-banner">${esc(msg)}</div>` : "";
  }

  function openImageViewer(url) {
    const v = document.createElement("div");
    v.className = "ann-viewer";
    v.innerHTML = `<button class="ann-viewer-close" aria-label="Funga picha">\u2715</button><img src="${esc(url)}" alt="">`;
    v.addEventListener("click", (e) => { if (e.target === v || e.target.classList.contains("ann-viewer-close")) v.remove(); });
    document.body.appendChild(v);
  }

  function wireOverlayEvents(overlay) {
    const bodyEl = overlay.querySelector("#ann-body");

    bodyEl.addEventListener("click", async (e) => {
      const chip = e.target.closest("[data-cat]");
      if (chip) { State.category = chip.dataset.cat; renderBody(); return; }

      const tab = e.target.closest("[data-view]");
      if (tab) { State.view = tab.dataset.view; renderBody(); return; }

      const refreshBtn = e.target.closest("#ann-refresh");
      if (refreshBtn) { await doRefresh(); return; }

      const loadMore = e.target.closest("#ann-loadmore");
      if (loadMore) { await refreshFromNetwork(false); renderBody(); return; }

      const back = e.target.closest("#ann-detail-back");
      if (back) { State.detailId = null; renderBody(); return; }

      const shareBtn = e.target.closest("#ann-share");
      if (shareBtn) { const p = State.all.find((x) => x.id === State.detailId); if (p) shareAnnouncement(p); return; }

      const copyBtn = e.target.closest("#ann-copy");
      if (copyBtn) { const p = State.all.find((x) => x.id === State.detailId); if (p) copyAnnouncement(p); return; }

      const img = e.target.closest("#ann-detail-img");
      if (img) { openImageViewer(img.src); return; }

      const card = e.target.closest("[data-open]");
      if (card) {
        const id = card.dataset.open;
        State.detailId = id;
        renderBody();
        markRead(id);
        return;
      }
    });

    bodyEl.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest("[data-open]");
      if (card) { e.preventDefault(); card.click(); }
    });

    bodyEl.addEventListener("input", debounce((e) => {
      if (e.target.id === "ann-search") { State.query = e.target.value; renderBody(); }
    }, 250));
  }

  /* ---------------- Overlay open/close ---------------- */
  function openOverlay() {
    ensureStylesheet();
    const overlay = document.createElement("div");
    overlay.className = "ann-overlay";
    overlay.innerHTML = `
      <div class="ann-overlay-head">
        <button id="ann-back" class="ann-back" aria-label="Rudi nyuma">\u2190</button>
        <h2>Matangazo</h2>
      </div>
      <div id="ann-body" class="ann-body"></div>`;
    document.body.appendChild(overlay);
    State.overlayEl = overlay;
    State.detailId = null;

    overlay.querySelector("#ann-back").addEventListener("click", closeOverlay);
    document.addEventListener("keydown", onEscClose);
    wireOverlayEvents(overlay);

    renderBody();
    wirePullToRefresh(overlay.querySelector("#ann-body"));

    // Data: onyesha cache mara moja, kisha jaribu refresh ya mtandao bila kuzuia UI.
    (async () => {
      if (!State.all.length) await loadFromCache();
      renderBody();
      const r = await refreshFromNetwork(State.all.length === 0);
      if (!r.ok) setErrorSlot("\u26A0\uFE0F Imeshindikana kupata matangazo mapya. Inaonyesha matangazo yaliyohifadhiwa mwisho.");
      renderBody();
      updateBadges();
    })();
  }
  function onEscClose(e) {
    if (e.key !== "Escape") return;
    const viewer = document.querySelector(".ann-viewer");
    if (viewer) { viewer.remove(); return; }
    closeOverlay();
  }
  function closeOverlay() {
    if (State.overlayEl) State.overlayEl.remove();
    State.overlayEl = null;
    State.detailId = null;
    document.removeEventListener("keydown", onEscClose);
  }

  /* ---------------- Online/offline listeners ---------------- */
  window.addEventListener("online", () => { State.online = true; flushPendingReads(); if (State.overlayEl) renderBody(); });
  window.addEventListener("offline", () => { State.online = false; if (State.overlayEl) renderBody(); });

  /* ---------------- Boot ---------------- */
  async function boot() {
    State.userId = await ensureUserId();
    await loadLocalReadState();
    await loadFromCache();
    updateBadges();
    // Background silent refresh ili badge iwe sahihi tangu app ianze, bila kufungua overlay.
    refreshFromNetwork(false).then(updateBadges).catch(() => {});
  }

  window.addEventListener("load", () => {
    ensureStylesheet();
    waitAndInject(50);
    boot();
  });
})();
