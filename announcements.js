"use strict";
/* ================================================================
 * announcements.js — Tab ya "New"
 * Inasoma posts zenye status "published" kutoka Supabase na
 * kuzionyesha kwenye app ya crew. Haiguzi core.js/script.js kabisa —
 * inaongeza kitufe chake cha nav na overlay yake yenyewe kwenye DOM.
 * Ina cache ya offline (kupitia RescueDB/IndexedDB) ili matangazo
 * ya mwisho yaliyopakuliwa yaonekane hata bila intaneti.
 * ================================================================ */

(function () {
  const SUPABASE_URL = "https://c--7f6fe176-f458-46d1-add7-d90bba190bf5-prod.lovable.cloud";
  const SUPABASE_ANON_KEY = "sb_publishable_6nwtjI7yQSuQF5DLJ6Nmbw_EtLzZVqo";
  const CACHE_KEY = "cachedAnnouncements";

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

  async function fetchAnnouncements() {
    const url = `${SUPABASE_URL}/rest/v1/posts?select=*&status=eq.published&deleted_at=is.null&order=published_at.desc`;
    const res = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error("HTTP " + res.status + " " + errText.slice(0, 120));
    }
    return res.json();
  }

  function renderList(posts) {
    if (!posts || !posts.length) {
      return `<div style="padding:24px;text-align:center;color:#9aa4b2;">Hakuna matangazo kwa sasa.</div>`;
    }
    return posts.map((p) => {
      const title = esc(p.title || "Tangazo");
      const body = esc(p.content || p.body || p.excerpt || "");
      const img = p.image || p.image_url || p.cover_image || "";
      const when = fmt(p.published_at || p.publication_date || p.created_at);
      return `
        <div style="background:#161c2b;border:1px solid #232b3e;border-radius:10px;margin:0 0 14px 0;overflow:hidden;">
          ${img ? `<img src="${esc(img)}" style="width:100%;max-height:180px;object-fit:cover;display:block;">` : ""}
          <div style="padding:14px;">
            <h3 style="margin:0 0 6px 0;color:#eef2f8;font-size:16px;">${title}</h3>
            ${when ? `<div style="color:#7d8898;font-size:12px;margin-bottom:8px;">${esc(when)}</div>` : ""}
            <div style="color:#c3cad6;font-size:14px;white-space:pre-wrap;">${body}</div>
          </div>
        </div>`;
    }).join("");
  }

  async function loadAndShow(bodyEl) {
    bodyEl.innerHTML = `<div style="padding:24px;text-align:center;color:#9aa4b2;">Inapakia…</div>`;
    try {
      const posts = await fetchAnnouncements();
      if (window.RescueDB) await window.RescueDB.setSetting(CACHE_KEY, posts);
      bodyEl.innerHTML = renderList(posts);
    } catch (e) {
      const cached = window.RescueDB ? await window.RescueDB.getSetting(CACHE_KEY, []) : [];
      bodyEl.innerHTML =
        `<div style="padding:10px 4px;color:#e0a03c;font-size:12px;">Tatizo la kuvuta data: ${esc(e && e.message)}. Inaonyesha matangazo yaliyohifadhiwa mara ya mwisho.</div>` +
        renderList(cached);
    }
  }

  function openOverlay() {
    const overlay = document.createElement("div");
    overlay.style.cssText =
      "position:fixed;inset:0;background:#0e1420;z-index:600;display:flex;flex-direction:column;";
    overlay.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid #232b3e;">
        <button id="ann-back" style="background:none;border:none;color:#eef2f8;font-size:20px;">←</button>
        <h2 style="margin:0;color:#eef2f8;font-size:17px;">Matangazo</h2>
      </div>
      <div id="ann-body" style="flex:1;overflow-y:auto;padding:14px;"></div>
    `;
    document.body.appendChild(overlay);
    overlay.querySelector("#ann-back").addEventListener("click", () => overlay.remove());
    loadAndShow(overlay.querySelector("#ann-body"));
  }

  function makeNavButton() {
    const btn = document.createElement("button");
    btn.className = "nav-btn";
    btn.innerHTML = `<span class="ic">📢</span><span>New</span>`;
    btn.addEventListener("click", openOverlay);
    return btn;
  }

  function injectNav() {
    const sidebar = document.querySelector("nav.sidebar");
    const bottomRow = document.querySelector(".bottom-nav .nav-row");
    if (!sidebar || !bottomRow) return false;
    if (!sidebar.querySelector(".ann-nav-btn")) {
      const b1 = makeNavButton();
      b1.classList.add("ann-nav-btn");
      sidebar.appendChild(b1);
    }
    if (!bottomRow.querySelector(".ann-nav-btn")) {
      const b2 = makeNavButton();
      b2.classList.add("ann-nav-btn");
      bottomRow.appendChild(b2);
    }
    return true;
  }

  function waitAndInject(triesLeft) {
    if (injectNav()) return;
    if (triesLeft <= 0) return;
    setTimeout(() => waitAndInject(triesLeft - 1), 200);
  }

  window.addEventListener("load", () => waitAndInject(50));
})();

