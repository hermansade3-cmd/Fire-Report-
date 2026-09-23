"use strict";
/* ================================================================
 * sync.js — Background sync ya Ripoti kwenda Supabase
 * Inatuma ripoti zenye status "COMPLETED" kwenda jedwali la
 * field_reports pindi tu simu ikiwa na intaneti. Haiathiri kabisa
 * uwezo wa app kufanya kazi offline — kila kitu bado kinahifadhiwa
 * kwanza IndexedDB kupitia RescueDB kama kawaida.
 * ================================================================ */

const SUPABASE_URL = "https://c--7f6fe176-f458-46d1-add7-d90bba190bf5-prod.lovable.cloud";
const SUPABASE_ANON_KEY = "sb_publishable_6nwtjI7yQSuQF5DLJ6Nmbw_EtLzZVqo";
const SYNCED_IDS_KEY = "syncedReportIds";

let syncInFlight = false;

async function getSyncedIds() {
  const ids = await RescueDB.getSetting(SYNCED_IDS_KEY, []);
  return new Set(ids || []);
}

async function addSyncedId(incidentId) {
  const ids = await getSyncedIds();
  ids.add(incidentId);
  await RescueDB.setSetting(SYNCED_IDS_KEY, Array.from(ids));
}

async function pushReport(report) {
  const body = {
    incident_id: report.incidentId,
    report_number: report.reportNumber || null,
    status: report.status || null,
    payload: report,
    submitted_at: new Date().toISOString(),
  };

  const res = await fetch(`${SUPABASE_URL}/rest/v1/field_reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
      "Prefer": "return=minimal",
    },
    body: JSON.stringify(body),
  });

  if (res.ok) return { ok: true };

  // 409 / unique violation => tayari ilishatumwa awali, ihesabu kama imefanikiwa
  if (res.status === 409) return { ok: true, alreadySynced: true };

  const text = await res.text().catch(() => "");
  return { ok: false, status: res.status, error: text };
}

async function trySyncQueue() {
  if (syncInFlight) return;
  if (!navigator.onLine) return;

  syncInFlight = true;
  try {
    const [reports, syncedIds] = await Promise.all([
      RescueDB.getAllReports(),
      getSyncedIds(),
    ]);

    const pending = reports.filter(
      (r) => r.status === "COMPLETED" && !syncedIds.has(r.incidentId)
    );

    for (const report of pending) {
      try {
        const result = await pushReport(report);
        if (result.ok) {
          await addSyncedId(report.incidentId);
          if (typeof toast === "function") {
            toast(`Ripoti ${report.reportNumber || report.incidentId} imetumwa`, "ok");
          }
        } else {
          console.error("Sync failed for", report.incidentId, result.error);
        }
      } catch (e) {
        // Hakuna mtandao au tatizo la muda — itajaribu tena baadaye
        console.error("Sync error for", report.incidentId, e);
        break;
      }
    }
  } finally {
    syncInFlight = false;
  }
}

// Jaribu kutuma mara moja app inapofunguliwa
window.addEventListener("load", () => setTimeout(trySyncQueue, 2000));

// Mtandao ukirudi
window.addEventListener("online", trySyncQueue);

// Angalia mara kwa mara (kila dakika moja) ikiwa kuna intaneti
setInterval(trySyncQueue, 60000);

// Fanya ipatikane kwa debugging/manual trigger
window.RescueSync = { trySyncQueue };
