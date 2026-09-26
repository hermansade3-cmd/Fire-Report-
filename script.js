"use strict";
/* ================================================================
* 4) app.js
* ================================================================ */
/* app.js \u2014 Offline Incident & Rescue Report
* Vanilla JS SPA. No build step, no external CDN. All state persisted via
* RescueDB (IndexedDB, see db.js). Route state lives in location.hash.
*/
(function () {
"use strict";
const $ = (sel, root) => (root || document).querySelector(sel);
const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
const uid = (prefix) => prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
const escapeHtml = (s) => (s == null ? "" : String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])));
const nowIso = () => new Date().toISOString();
const fmtDate = (iso) => { if (!iso)
return "-"; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleDateString(); };
const fmtDateTime = (iso) => { if (!iso)
return "-"; const d = new Date(iso); return isNaN(d) ? iso : d.toLocaleString(); };
function friendlyReportTitle(r) {
var _a, _b, _c, _d;
const type = (((_a = r === null || r === void 0 ? void 0 : r.incident) === null || _a === void 0 ? void 0 : _a.type) || "").trim();
const other = (((_b = r === null || r === void 0 ? void 0 : r.incident) === null || _b === void 0 ? void 0 : _b.otherType) || "").trim();
const area = [(_c = r === null || r === void 0 ? void 0 : r.location) === null || _c === void 0 ? void 0 : _c.ward, (_d = r === null || r === void 0 ? void 0 : r.location) === null || _d === void 0 ? void 0 : _d.district].filter(Boolean).join(" ").trim();
const base = type || other || "Ripoti";
return [base, area].filter(Boolean).join(" ") || "Ripoti";
}
async function hashSecret(value) {
const data = new TextEncoder().encode(String(value));
const digest = await crypto.subtle.digest("SHA-256", data);
return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function verifyDeletePassword(value) {
if (!value || !State.settings.deletePasswordHash)
return false;
return (await hashSecret(value)) === State.settings.deletePasswordHash;
}
function getPath(obj, path) {
return path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), obj);
}
function setPath(obj, path, value) {
const keys = path.split(".");
let cur = obj;
for (let i = 0; i < keys.length - 1; i++) {
const k = keys[i];
if (cur[k] == null || typeof cur[k] !== "object")
cur[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
cur = cur[k];
}
cur[keys[keys.length - 1]] = value;
}
function timeToMinutes(t) {
if (!t)
return null;
const m = /^(\d{1,2}):(\d{2})/.exec(t);
if (!m)
return null;
return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}
function minutesDiffLabel(fromT, toT) {
const a = timeToMinutes(fromT), b = timeToMinutes(toT);
if (a == null || b == null)
return null;
let diff = b - a;
if (diff < 0)
diff += 24 * 60; // crossed midnight
const h = Math.floor(diff / 60), m = diff % 60;
if (h === 0)
return m + " min";
return h + "h " + m + "m";
}
function toast(msg, kind) {
const host = $("#toast-host");
const el = document.createElement("div");
el.className = "toast" + (kind ? " " + kind : "");
el.textContent = msg;
host.appendChild(el);
setTimeout(() => el.remove(), 2600);
}
/* ---------------- APK Download ---------------- */
const APK_FILE = "Fire_Report-v0.6.apk";
const State = {
settings: {},
currentReport: null, // report object being edited
currentStep: 0,
saveTimer: null,
unlocked: false,
};
const STEPS_ORDER = [
"incident", "location", "timeline", "vehicles", "casualties",
"fatality", "witnesses", "actions", "cause", "damage",
"fuel", "otherTeams", "challenges", "photos", "crew", "review",
];
const STEP_LABELS = {
incident: "Taarifa za Tukio",
location: "Eneo la Tukio",
timeline: "Muda wa Operesheni",
vehicles: "Vyombo/Vitu Vilivyohusika",
casualties: "Majeruhi",
fatality: "Vifo",
witnesses: "Mashahidi",
actions: "Hatua Zilizochukuliwa",
cause: "Chanzo cha Tukio",
damage: "Hasara",
fuel: "Mafuta / Rasilimali",
otherTeams: "Vikosi Vingine",
challenges: "Changamoto",
photos: "Picha / Ushahidi",
crew: "Wafanyakazi (Crew)",
review: "Kamilisha / Hakiki",
};
const INCIDENT_TYPES = [
"Ajali ya Pikipiki", "Ajali ya Gari", "Ajali nyingine", "Moto", "Uokoaji",
"Mtu aliyekwama", "Mafuriko", "Jengo kuanguka", "Tukio la maji",
"Uokoaji wa mnyama", "Tukio jingine",
];
const CONDITIONS = ["Stable", "Serious", "Critical", "Unconscious", "Unknown"];
const CASUALTY_ROLES = ["Driver", "Passenger", "Pedestrian", "Other"];
const CAUSE_OPTIONS = ["Speeding", "Driver error", "Mechanical failure", "Road condition", "Weather", "Fire", "Electrical fault", "Human error", "Unknown", "Other"];
const ACTION_CHECKLIST = [
["sceneAssessment", "Scene assessment"], ["firstAid", "First aid"], ["rescue", "Rescue"],
["evacuation", "Evacuation"], ["transportation", "Transportation"], ["fireSuppression", "Fire suppression"],
["sceneSafety", "Scene safety"], ["handoverHospital", "Handover to hospital"], ["handoverPolice", "Handover to police"],
["other", "Other"],
];
const CHALLENGE_OPTIONS = ["None", "Traffic", "Poor road", "Weather", "Lack of equipment", "Crowd", "Communication problem", "Access problem", "Other"];
const OTHER_TEAM_OPTIONS = ["None", "Police", "Hospital/Medical team", "Local authorities", "Other rescue team", "Other"];
function blankReport() {
const s = State.settings;
return {
incidentId: uid("INC"),
reportNumber: "",
status: "DRAFT",
createdAt: nowIso(),
updatedAt: nowIso(),
incident: { date: "", timeReceived: "", type: "", otherType: "", sourceOfInfo: "", reporterName: "", reporterPhone: "" },
location: { region: s.defaultRegion || "", district: s.defaultDistrict || "", ward: "", street: "", road: "", landmark: "", description: "", gps: { lat: "", lng: "", accuracy: "", timestamp: "" } },
timeline: { timeReceived: "", timeDeparted: "", timeArrived: "", timeOpStart: "", timeOpEnd: "", timeDepartedScene: "", timeReturned: "" },
vehiclesInvolved: [],
casualties: [],
fatality: { occurred: false, deceased: [] },
witnesses: [],
actionsTaken: { text: "", checklist: {} },
cause: { options: [], detail: "" },
damage: { propertyDamaged: "", vehicleDamage: "", equipmentDamage: "", estimatedLoss: "", otherLosses: "", description: "" },
fuel: [],
otherTeams: { checks: [], entries: [] },
challenges: { text: "", options: [] },
crew: { station: s.defaultStation || "", shiftLeader: "", driver: s.defaultVehicle ? "" : "", members: [] },
photoIds: [],
};
}
function markSaving() { setIndicator("saving", "Inahifadhi..."); }
function markSaved() { setIndicator("saved", "IMEHIFADHIWA \u2713"); }
function markError() { setIndicator("error", "Imeshindikana. Retry"); }
function setIndicator(cls, text) {
const el = $("#save-indicator");
if (!el)
return;
el.className = "save-indicator " + cls;
el.textContent = text;
}
function scheduleSave() {
if (!State.currentReport)
return;
markSaving();
clearTimeout(State.saveTimer);
const interval = Number(State.settings.autoSaveInterval || 600);
State.saveTimer = setTimeout(flushSave, interval);
}
async function flushSave() {
if (!State.currentReport)
return;
clearTimeout(State.saveTimer);
const r = State.currentReport;
r.updatedAt = nowIso();
computeDerived(r);
try {
await RescueDB.putReport(r);
markSaved();
}
catch (e) {
console.error(e);
markError();
}
}
function computeDerived(r) {
r.casualtyCount = (r.casualties || []).length;
const t = r.timeline || {};
r.derived = {
responseTime: minutesDiffLabel(t.timeDeparted, t.timeArrived),
sceneDuration: minutesDiffLabel(t.timeOpStart, t.timeOpEnd),
totalDuration: minutesDiffLabel(t.timeReceived, t.timeReturned),
};
}
window.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden")
flushSave(); });
window.addEventListener("pagehide", () => { flushSave(); });
window.addEventListener("beforeunload", () => { flushSave(); });
const routes = {};
function route(pattern, handler) { routes[pattern] = handler; }
function navigate(hash) { if (location.hash === hash)
render();
else
location.hash = hash; }
function currentRoute() {
const hash = location.hash.slice(1) || "/dashboard";
const [path, query] = hash.split("?");
const params = new URLSearchParams(query || "");
return { path, params };
}
window.addEventListener("hashchange", () => { flushSave(); render(); });
function render() {
const { path, params } = currentRoute();
window.scrollTo(0, 0);
const segs = path.split("/").filter(Boolean);
const top = segs[0] || "dashboard";
const handler = routes[top] || routes["dashboard"];
handler(segs, params);
highlightNav(top);
}
function highlightNav(top) {
$$(".nav-btn").forEach((b) => b.classList.toggle("active", b.dataset.route === top));
}
function setMain(html, title, opts) {
opts = opts || {};
$("#page-title").textContent = title;
$("#back-btn").style.visibility = opts.back === false ? "hidden" : "visible";
$("#save-indicator").textContent = opts.showSave ? "" : "";
$("#save-indicator").style.display = opts.showSave ? "inline" : "none";
$("#main").innerHTML = html;
}
route("dashboard", async () => {
const [reports, trash] = await Promise.all([RescueDB.getAllReports(), RescueDB.getAllTrash()]);
const today = new Date().toDateString();
const thisMonth = new Date().toISOString().slice(0, 7);
const counts = {
total: reports.length,
drafts: reports.filter((r) => r.status === "DRAFT").length,
inProgress: reports.filter((r) => r.status === "IN_PROGRESS").length,
completed: reports.filter((r) => r.status === "COMPLETED").length,
archived: reports.filter((r) => r.status === "ARCHIVED").length,
today: reports.filter((r) => new Date(r.createdAt).toDateString() === today).length,
month: reports.filter((r) => (r.createdAt || "").slice(0, 7) === thisMonth).length,
trash: trash.length,
};
setMain(`
    <div class="stat-grid">
      <div class="stat-box"><div class="num">${counts.total}</div><div class="label">Ripoti Zote</div></div>
      <div class="stat-box"><div class="num">${counts.drafts}</div><div class="label">Drafti</div></div>
      <div class="stat-box"><div class="num">${counts.completed}</div><div class="label">Zilizokamilika</div></div>
      <div class="stat-box"><div class="num">${counts.archived}</div><div class="label">Archived</div></div>
      <div class="stat-box"><div class="num">${counts.today}</div><div class="label">Leo</div></div>
      <div class="stat-box"><div class="num">${counts.month}</div><div class="label">Mwezi Huu</div></div>
      <div class="stat-box trash-stat" data-nav="/trash"><div class="num">${counts.trash}</div><div class="label">\uD83D\uDDD1\uFE0F Trash</div></div>
    </div>
    <div class="dash-actions">
      <button class="btn btn-primary" data-nav="/report/new"><span class="ic">\uFF0B</span>Ripoti Mpya</button>
      <button class="btn" data-nav="/reports?status=DRAFT"><span class="ic">\uD83D\uDCDD</span>Drafti</button>
      <button class="btn" data-nav="/reports?status=COMPLETED"><span class="ic">\u2705</span>Zilizokamilika</button>
      <button class="btn" data-nav="/reports?status=ARCHIVED"><span class="ic">\uD83D\uDDC4\uFE0F</span>Archive</button>
      <button class="btn" data-nav="/search"><span class="ic">\uD83D\uDD0D</span>Tafuta</button>
      <button class="btn" data-nav="/trash"><span class="ic">\uD83D\uDDD1\uFE0F</span>Trash</button>
      <button class="btn" data-nav="/statistics"><span class="ic">\uD83D\uDCCA</span>Takwimu</button>
      <button class="btn" data-nav="/backup"><span class="ic">\u2B07\uFE0F</span>Export/Backup</button>
    </div>
    <div id="drafts-continue"></div>
    <div class="card">
      <div class="card-title">Ripoti za Hivi Karibuni</div>
      <div id="recent-list">${reports.length ? "" : '<div class="empty-hint">Hakuna ripoti bado. Bonyeza "Ripoti Mpya" kuanza.</div>'}</div>
    </div>
  `, "Dashboard", { back: false });
const recent = reports.slice().sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || "")).slice(0, 6);
$("#recent-list").innerHTML = recent.map(reportListItemHtml).join("");
setupLongPressDelete();
const unfinished = reports.filter((r) => r.status === "DRAFT" || r.status === "IN_PROGRESS")
.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
if (unfinished.length) {
$("#drafts-continue").innerHTML = `
      <div class="card" style="border-color:var(--accent)">
        <div class="card-title">Endelea na Ripoti Isiyokamilika?</div>
        ${unfinished.slice(0, 3).map(reportListItemHtml).join("")}
      </div>`;
setupLongPressDelete();
}
});
function reportListItemHtml(r) {
var _a, _b, _c, _d;
const type = ((_a = r.incident) === null || _a === void 0 ? void 0 : _a.type) || "Aina haijabainishwa";
const loc = [(_b = r.location) === null || _b === void 0 ? void 0 : _b.ward, (_c = r.location) === null || _c === void 0 ? void 0 : _c.district].filter(Boolean).join(", ") || "Eneo halijabainishwa";
const reportTitle = friendlyReportTitle(r);
const badgeClass = "badge-" + (r.status || "draft").toLowerCase();
return `<div class="report-list-item" data-nav="/report/${r.incidentId}" data-report-id="${r.incidentId}" tabindex="0" title="Shikilia kwa muda mfupi kuleta Delete">
    <div class="top-row">
      <span class="id">${escapeHtml(reportTitle)}</span>
      <span class="badge ${badgeClass}">${(r.status || "").replace("_", " ")}</span>
    </div>
    <div class="meta">${escapeHtml(fmtDate(((_d = r.incident) === null || _d === void 0 ? void 0 : _d.date) || r.createdAt))} \u00B7 ${escapeHtml(type)}</div>
    <div class="summary">${escapeHtml(loc)}${r.casualtyCount ? " \u00B7 Majeruhi: " + r.casualtyCount : ""}</div>
    <div class="hold-hint">\u2195 Shikilia sekunde 1 kuleta chaguo la Delete</div>
  </div>`;
}
route("reports", async (segs, params) => {
const status = params.get("status") || "ALL";
const reports = await RescueDB.getAllReports();
const filtered = status === "ALL" ? reports : reports.filter((r) => r.status === status);
const sorted = filtered.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
const titleMap = { DRAFT: "Drafti", IN_PROGRESS: "Zinazoendelea", COMPLETED: "Zilizokamilika", ARCHIVED: "Archive", ALL: "Ripoti Zote" };
setMain(`
    <div class="filter-row">
      ${["ALL", "DRAFT", "IN_PROGRESS", "COMPLETED", "ARCHIVED"].map((s) => `<span class="chip ${s === status ? "selected" : ""}" data-nav="/reports?status=${s}">${titleMap[s]}</span>`).join("")}
    </div>
    <div id="list">${sorted.length ? sorted.map(reportListItemHtml).join("") : '<div class="empty-state"><div class="ic">\uD83D\uDCC4</div>Hakuna ripoti katika kundi hili.</div>'}</div>
  `, titleMap[status] || "Ripoti");
setupLongPressDelete();
});
route("search", async () => {
setMain(`
    <div class="search-bar">
      <input type="text" id="search-input" placeholder="Tafuta: namba, tarehe, eneo, jina, usajili...">
    </div>
    <div id="search-results"><div class="empty-hint">Andika ili kutafuta.</div></div>
  `, "Tafuta Ripoti");
const input = $("#search-input");
let all = await RescueDB.getAllReports();
input.addEventListener("input", () => {
const q = input.value.trim().toLowerCase();
if (!q) {
$("#search-results").innerHTML = '<div class="empty-hint">Andika ili kutafuta.</div>';
return;
}
const hits = all.filter((r) => {
var _a, _b, _c, _d, _e, _f, _g, _h;
const haystack = [
r.reportNumber, r.incidentId,
(_a = r.incident) === null || _a === void 0 ? void 0 : _a.date,
(_b = r.incident) === null || _b === void 0 ? void 0 : _b.type,
(_c = r.location) === null || _c === void 0 ? void 0 : _c.region,
(_d = r.location) === null || _d === void 0 ? void 0 : _d.district,
(_e = r.location) === null || _e === void 0 ? void 0 : _e.ward,
(_f = r.location) === null || _f === void 0 ? void 0 : _f.street,
(_g = r.location) === null || _g === void 0 ? void 0 : _g.landmark,
(_h = r.incident) === null || _h === void 0 ? void 0 : _h.reporterName,
...(r.casualties || []).map((c) => c.name),
...(r.vehiclesInvolved || []).map((v) => v.regNo),
].filter(Boolean).join(" ").toLowerCase();
return haystack.includes(q);
});
$("#search-results").innerHTML = hits.length ? hits.map(reportListItemHtml).join("") : '<div class="empty-hint">Hakuna matokeo.</div>';
setupLongPressDelete();
});
});
route("statistics", async () => {
const reports = await RescueDB.getAllReports();
const byType = {};
let casualties = 0, deaths = 0;
reports.forEach((r) => {
var _a, _b;
const t = ((_a = r.incident) === null || _a === void 0 ? void 0 : _a.type) || "Haijabainishwa";
byType[t] = (byType[t] || 0) + 1;
casualties += (r.casualties || []).length;
deaths += (((_b = r.fatality) === null || _b === void 0 ? void 0 : _b.deceased) || []).length;
});
const rows = Object.entries(byType).sort((a, b) => b[1] - a[1]);
setMain(`
    <div class="stat-grid">
      <div class="stat-box"><div class="num">${reports.length}</div><div class="label">Ripoti Zote</div></div>
      <div class="stat-box"><div class="num">${casualties}</div><div class="label">Majeruhi</div></div>
      <div class="stat-box"><div class="num">${deaths}</div><div class="label">Vifo</div></div>
    </div>
    <div class="card">
      <div class="card-title">Kwa Aina ya Tukio</div>
      ${rows.length ? rows.map(([t, n]) => `
<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);font-size:14px;">
<span>${escapeHtml(t)}</span><strong>${n}</strong>
</div>`).join("") : '<div class="empty-hint">Hakuna data bado.</div>'}
    </div>
  `, "Takwimu");
});
route("trash", async () => {
const trash = (await RescueDB.getAllTrash()).sort((a, b) => (b.deletedAt || "").localeCompare(a.deletedAt || ""));
setMain(`
    <p class="muted">Ripoti zilizofutwa huhifadhiwa hapa mpaka uzifute kabisa.</p>
    <div id="trash-list">${trash.length ? trash.map(trashItemHtml).join("") : '<div class="empty-state"><div class="ic">\uD83D\uDDD1\uFE0F</div>Trash iko wazi.</div>'}</div>
  `, "Trash");
});
function trashItemHtml(r) {
var _a, _b;
return `<div class="card">
    <div class="top-row" style="display:flex;justify-content:space-between;">
      <strong>${escapeHtml(friendlyReportTitle(r))}</strong>
      <span class="muted">Ilifutwa: ${escapeHtml(fmtDateTime(r.deletedAt))}</span>
    </div>
    <p class="muted">${escapeHtml(((_a = r.incident) === null || _a === void 0 ? void 0 : _a.type) || "")} \u00B7 ${escapeHtml(fmtDate((_b = r.incident) === null || _b === void 0 ? void 0 : _b.date))}</p>
    <div class="btn-row">
      <button class="btn btn-sm" data-action="restore-trash" data-id="${r.incidentId}">Restore</button>
      <button class="btn btn-sm btn-danger" data-action="perma-delete" data-id="${r.incidentId}">Futa Kabisa</button>
    </div>
  </div>`;
}
route("backup", async () => {
setMain(`
    <div class="card">
      <div class="card-title">Full Backup</div>
      <p class="muted">Hamisha taarifa zote (ripoti, picha, settings) kwenda faili moja. Unaweza kuihamisha kwenda simu nyingine.</p>
      <div class="btn-row">
        <button class="btn btn-primary" id="export-backup-btn">Export Full Backup (JSON)</button>
      </div>
    </div>
    <div class="card">
      <div class="card-title">Import Backup</div>
      <p class="muted">Chagua faili la backup (.json) kurejesha taarifa. Data iliyopo haitafutwa.</p>
      <input type="file" id="import-file" accept="application/json,.json">
    </div>
    <div class="card">
      <div class="card-title">Export Ripoti Zote (CSV)</div>
      <div class="btn-row"><button class="btn" id="export-csv-btn">Pakua CSV</button></div>
    </div>
  `, "Export / Backup");
$("#export-backup-btn").addEventListener("click", async () => {
try {
const data = await RescueDB.exportFullBackup();
RescueExport.downloadJSON(data, `rescue-backup-${Date.now()}.json`);
toast("Backup imepakuliwa", "ok");
}
catch (e) {
console.error(e);
toast("Imeshindikana ku-export", "err");
}
});
$("#export-csv-btn").addEventListener("click", async () => {
const reports = await RescueDB.getAllReports();
RescueExport.downloadReportsCSV(reports);
});
$("#import-file").addEventListener("change", async (e) => {
const file = e.target.files[0];
if (!file)
return;
try {
const text = await file.text();
const data = JSON.parse(text);
showImportModeModal(data);
}
catch (err) {
console.error(err);
toast("Faili si sahihi", "err");
}
});
});
function showImportModeModal(data) {
var _a, _b;
const backdrop = document.createElement("div");
backdrop.className = "modal-backdrop";
backdrop.innerHTML = `
    <div class="modal">
      <h3>Import Backup</h3>
      <p class="muted">Ripoti ${((_a = data.reports) === null || _a === void 0 ? void 0 : _a.length) || 0}, Picha ${((_b = data.photos) === null || _b === void 0 ? void 0 : _b.length) || 0}. Ukigongana na data iliyopo, chagua:</p>
      <div class="btn-row" style="flex-direction:column;">
        <button class="btn btn-block" data-mode="keep">Weka Iliyopo (Keep existing)</button>
        <button class="btn btn-block" data-mode="replace">Badilisha (Replace)</button>
        <button class="btn btn-block" data-mode="copy">Tengeneza Nakala (Create copy)</button>
        <button class="btn btn-block btn-ghost" data-mode="cancel">Ghairi</button>
      </div>
    </div>`;
document.body.appendChild(backdrop);
backdrop.addEventListener("click", async (e) => {
const mode = e.target.dataset.mode;
if (!mode)
return;
backdrop.remove();
if (mode === "cancel")
return;
try {
await RescueDB.importFullBackup(data, mode);
toast("Backup imeingizwa", "ok");
navigate("#/dashboard");
}
catch (err) {
console.error(err);
toast("Import imeshindikana", "err");
}
});
}
route("settings", async () => {
const s = State.settings;
setMain(`
    <div class="card">
      <div class="card-title">Station Defaults</div>
      <div class="field"><label>Jina la Kituo</label><input type="text" data-set="defaultStation" value="${escapeHtml(s.defaultStation || "")}"></div>
      <div class="field"><label>Mkoa</label><input type="text" data-set="defaultRegion" value="${escapeHtml(s.defaultRegion || "")}"></div>
      <div class="field"><label>Wilaya</label><input type="text" data-set="defaultDistrict" value="${escapeHtml(s.defaultDistrict || "")}"></div>
      <div class="field"><label>Chombo cha Kawaida (Default Vehicle)</label><input type="text" data-set="defaultVehicle" value="${escapeHtml(s.defaultVehicle || "")}"></div>
      <div class="field"><label>Muundo wa Namba ya Ripoti (Report Numbering)</label><input type="text" data-set="reportNumberFormat" value="${escapeHtml(s.reportNumberFormat || "RPT-{YYYY}{MM}{DD}-{SEQ}")}"></div>
    </div>

    <div class="card">
      <div class="card-title">Muonekano</div>
      <div class="switch-row">
        <div><div class="lbl">Dark Mode</div><div class="sub">Rangi nyeusi kwa matumizi ya usiku</div></div>
        <label class="switch"><input type="checkbox" id="dark-toggle" ${s.theme !== "light" ? "checked" : ""}><span class="track"></span><span class="knob"></span></label>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Auto-Save</div>
      <div class="field"><label>Muda wa Auto-Save (milliseconds)</label>
        <input type="number" data-set="autoSaveInterval" value="${s.autoSaveInterval || 600}" min="200" step="100">
      </div>
      <div class="switch-row">
        <div><div class="lbl">Backup Reminder</div><div class="sub">Kukumbusha ku-backup mara kwa mara</div></div>
        <label class="switch"><input type="checkbox" id="backup-reminder-toggle" ${s.backupReminder ? "checked" : ""}><span class="track"></span><span class="knob"></span></label>
      </div>
    </div>

    <div class="card">
      <div class="card-title">Faragha (Privacy)</div>
      <div class="switch-row">
        <div><div class="lbl">Enable App Lock</div><div class="sub">Linda app kwa PIN ya tarakimu 4 (local privacy tu, si encryption)</div></div>
        <label class="switch"><input type="checkbox" id="applock-toggle" ${s.appLockEnabled ? "checked" : ""}><span class="track"></span><span class="knob"></span></label>
      </div>
      <div class="switch-row">
        <div><div class="lbl">Hide sensitive info kwenye list view</div><div class="sub">Ficha majina ya majeruhi kwenye orodha</div></div>
        <label class="switch"><input type="checkbox" id="hide-sensitive-toggle" ${s.hideSensitiveInList ? "checked" : ""}><span class="track"></span><span class="knob"></span></label>
      </div>
      <div id="pin-setup" style="${s.appLockEnabled ? "" : "display:none"}">
        <button class="btn btn-sm" id="change-pin-btn">Weka/Badilisha PIN</button>
      </div>
    </div>

    <div class="card security-card">
      <div class="card-title">Usalama wa Kufuta</div>
      <div class="security-note">Ripoti iliyofutwa itafutwa kabisa pamoja na picha zake. Ili kuifuta lazima uweke password ya kufuta.</div>
      <div class="switch-row">
        <div><div class="lbl">Password ya Kufuta</div><div class="sub">${s.deletePasswordHash ? "Imewekwa \u2713" : "Bado haijawekwa"}</div></div>
        <button class="btn btn-sm" id="delete-password-btn">${s.deletePasswordHash ? "Badilisha" : "Weka Password"}</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">About</div>
      <p><strong>OFFLINE INCIDENT &amp; RESCUE REPORT</strong></p>
      <p class="muted">Version 1.0.0</p>
      <p class="muted">Offline-first incident reporting application.</p>
      <p class="muted">Created by Herman Sade</p>
    </div>

    <div class="card">
      <div class="card-title">Programu (APK)</div>
      <p class="muted">Pakua programu hii kama APK ya Android, au itume kwa wenzako.</p>
      <div class="btn-row">
        <a class="btn btn-block" id="download-apk-btn" href="${APK_FILE}" download>\u2B07\uFE0F Pakua APK</a>
      </div>
    </div>
  `, "Settings");
$$("[data-set]").forEach((input) => {
input.addEventListener("change", async () => {
const key = input.dataset.set;
const val = input.type === "number" ? Number(input.value) : input.value;
State.settings[key] = val;
await RescueDB.setSetting(key, val);
toast("Imehifadhiwa", "ok");
});
});
$("#dark-toggle").addEventListener("change", async (e) => {
const theme = e.target.checked ? "dark" : "light";
State.settings.theme = theme;
await RescueDB.setSetting("theme", theme);
applyTheme();
});
$("#backup-reminder-toggle").addEventListener("change", async (e) => {
State.settings.backupReminder = e.target.checked;
await RescueDB.setSetting("backupReminder", e.target.checked);
});
$("#applock-toggle").addEventListener("change", async (e) => {
const enabled = e.target.checked;
State.settings.appLockEnabled = enabled;
await RescueDB.setSetting("appLockEnabled", enabled);
$("#pin-setup").style.display = enabled ? "" : "none";
if (enabled && !State.settings.appPin)
openPinSetupModal();
});
$("#hide-sensitive-toggle").addEventListener("change", async (e) => {
State.settings.hideSensitiveInList = e.target.checked;
await RescueDB.setSetting("hideSensitiveInList", e.target.checked);
});
const changePinBtn = $("#change-pin-btn");
if (changePinBtn)
changePinBtn.addEventListener("click", openPinSetupModal);
const deletePasswordBtn = $("#delete-password-btn");
if (deletePasswordBtn)
deletePasswordBtn.addEventListener("click", openDeletePasswordModal);
const downloadApkBtn = $("#download-apk-btn");
if (downloadApkBtn)
downloadApkBtn.addEventListener("click", () => toast("Inapakua APK\u2026", "ok"));
});
function openPinSetupModal() {
let pin = "";
const backdrop = document.createElement("div");
backdrop.className = "modal-backdrop";
backdrop.innerHTML = `
    <div class="modal">
      <h3>Weka PIN Mpya (tarakimu 4)</h3>
      <div class="pin-dots" id="pin-dots">${"<span class='dot'></span>".repeat(4)}</div>
      <div class="pin-pad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-d="${n}">${n}</button>`).join("")}
        <button data-d="clear">C</button><button data-d="0">0</button><button data-d="back">\u232B</button>
      </div>
      <div class="btn-row"><button class="btn btn-block btn-ghost" id="pin-cancel">Ghairi</button></div>
    </div>`;
document.body.appendChild(backdrop);
const dotsEl = $("#pin-dots", backdrop);
function refreshDots() {
$$(".dot", dotsEl).forEach((d, i) => d.classList.toggle("filled", i < pin.length));
}
backdrop.addEventListener("click", async (e) => {
if (e.target.id === "pin-cancel") {
backdrop.remove();
return;
}
const d = e.target.dataset.d;
if (!d)
return;
if (d === "clear")
pin = "";
else if (d === "back")
pin = pin.slice(0, -1);
else if (pin.length < 4)
pin += d;
refreshDots();
if (pin.length === 4) {
State.settings.appPin = pin;
await RescueDB.setSetting("appPin", pin);
toast("PIN imewekwa", "ok");
backdrop.remove();
}
});
}
async function openDeletePasswordModal() {
const hasPassword = !!State.settings.deletePasswordHash;
let current = "", next = "", confirmNext = "";
const backdrop = document.createElement("div");
backdrop.className = "modal-backdrop";
backdrop.innerHTML = `
    <div class="modal liquid-modal">
      <h3>${hasPassword ? "Badilisha Password ya Kufuta" : "Weka Password ya Kufuta"}</h3>
      <p class="muted">Password hii inahitajika kila unapofuta ripoti kabisa.</p>
      ${hasPassword ? `<div class="field"><label>Password ya Sasa</label><input id="del-current" type="password" inputmode="numeric" autocomplete="current-password" placeholder="Weka password ya sasa"></div>` : ""}
      <div class="field"><label>${hasPassword ? "Password Mpya" : "Password"}</label><input id="del-next" type="password" inputmode="numeric" autocomplete="new-password" minlength="6" placeholder="Angalau tarakimu 6"></div>
      <div class="field"><label>Rudia Password</label><input id="del-confirm" type="password" inputmode="numeric" autocomplete="new-password" minlength="6" placeholder="Rudia password"></div>
      <div id="del-pass-error" class="form-error"></div>
      <div class="btn-row"><button class="btn btn-block btn-ghost" id="del-pass-cancel">Ghairi</button><button class="btn btn-block btn-primary" id="del-pass-save">Hifadhi</button></div>
    </div>`;
document.body.appendChild(backdrop);
const err = $("#del-pass-error", backdrop);
$("#del-pass-cancel", backdrop).addEventListener("click", () => backdrop.remove());
$("#del-pass-save", backdrop).addEventListener("click", async () => {
var _a;
current = ((_a = $("#del-current", backdrop)) === null || _a === void 0 ? void 0 : _a.value) || "";
next = $("#del-next", backdrop).value || "";
confirmNext = $("#del-confirm", backdrop).value || "";
if (hasPassword && !(await verifyDeletePassword(current))) {
err.textContent = "Password ya sasa si sahihi.";
return;
}
if (next.length < 6) {
err.textContent = "Password iwe na angalau tarakimu 6.";
return;
}
if (!/^\d+$/.test(next)) {
err.textContent = "Tumia tarakimu pekee.";
return;
}
if (next !== confirmNext) {
err.textContent = "Password hazifanani.";
return;
}
State.settings.deletePasswordHash = await hashSecret(next);
await RescueDB.setSetting("deletePasswordHash", State.settings.deletePasswordHash);
backdrop.remove();
toast("Password ya kufuta imehifadhiwa", "ok");
render();
});
}
function applyTheme() {
document.documentElement.setAttribute("data-theme", State.settings.theme === "light" ? "light" : "dark");
}
function renderReportForm() {
const r = State.currentReport;
if (r.lastStepIndex !== State.currentStep) {
r.lastStepIndex = State.currentStep;
scheduleSave();
}
const stepKey = STEPS_ORDER[State.currentStep];
$("#page-title").textContent = STEP_LABELS[stepKey];
$("#back-btn").style.visibility = "visible";
$("#save-indicator").style.display = "inline";
const pct = Math.round(((State.currentStep + 1) / STEPS_ORDER.length) * 100);
const body = renderStep(stepKey, r);
$("#main").innerHTML = `
    <div class="step-progress"><span>Hatua ${State.currentStep + 1}/${STEPS_ORDER.length}: ${STEP_LABELS[stepKey]}</span><span>${pct}%</span></div>
    <div class="step-bar"><div class="step-bar-fill" style="width:${pct}%"></div></div>
    <div id="step-body">${body}</div>
    <div class="step-nav">
      <button class="btn" id="step-back" ${State.currentStep === 0 ? "disabled" : ""}>Nyuma</button>
      <button class="btn btn-ghost" id="save-draft-btn">Save Draft</button>
      ${State.currentStep === STEPS_ORDER.length - 1
            ? `<button class="btn btn-primary" id="complete-btn">Complete Report</button>`
            : `<button class="btn btn-primary" id="step-next">Save &amp; Endelea</button>`}
    </div>
  `;
bindStep(stepKey, r);
$("#step-back").addEventListener("click", () => { flushSave(); State.currentStep--; renderReportForm(); });
const nextBtn = $("#step-next");
if (nextBtn)
nextBtn.addEventListener("click", () => {
flushSave();
if (r.status === "DRAFT") {
r.status = "IN_PROGRESS";
}
State.currentStep++;
renderReportForm();
});
$("#save-draft-btn").addEventListener("click", async () => { await flushSave(); toast("Draft imehifadhiwa", "ok"); navigate("#/dashboard"); });
const completeBtn = $("#complete-btn");
if (completeBtn)
completeBtn.addEventListener("click", async () => {
r.status = "COMPLETED";
r.completedAt = nowIso();
await flushSave();
await RescueDB.logAction(r.incidentId, "Completed");
toast("Ripoti imekamilika", "ok");
navigate("#/report/" + r.incidentId + "/preview");
});
}
function fieldInput(label, path, val, opts) {
opts = opts || {};
const type = opts.type || "text";
const required = opts.required ? '<span class="req">*</span>' : opts.unknown ? '<span class="opt-tag">(Optional/Unknown)</span>' : '<span class="opt-tag">(Optional)</span>';
if (type === "textarea") {
return `<div class="field"><label>${label} ${required}</label><textarea data-bind="${path}">${escapeHtml(val || "")}</textarea></div>`;
}
return `<div class="field"><label>${label} ${required}</label><input type="${type}" data-bind="${path}" value="${escapeHtml(val !== null && val !== void 0 ? val : "")}"></div>`;
}
function fieldSelect(label, path, val, options, opts) {
opts = opts || {};
const required = opts.required ? '<span class="req">*</span>' : '<span class="opt-tag">(Optional)</span>';
return `<div class="field"><label>${label} ${required}</label><select data-bind="${path}">
    <option value="">-- Chagua --</option>
    ${options.map((o) => `<option value="${escapeHtml(o)}" ${val === o ? "selected" : ""}>${escapeHtml(o)}</option>`).join("")}
  </select></div>`;
}
function renderStep(key, r) {
switch (key) {
case "incident": return stepIncident(r);
case "location": return stepLocation(r);
case "timeline": return stepTimeline(r);
case "vehicles": return stepVehicles(r);
case "casualties": return stepCasualties(r);
case "fatality": return stepFatality(r);
case "witnesses": return stepWitnesses(r);
case "actions": return stepActions(r);
case "cause": return stepCause(r);
case "damage": return stepDamage(r);
case "fuel": return stepFuel(r);
case "otherTeams": return stepOtherTeams(r);
case "challenges": return stepChallenges(r);
case "photos": return stepPhotos(r);
case "crew": return stepCrew(r);
case "review": return stepReview(r);
default: return "";
}
}
function bindGenericInputs(container) {
$$("[data-bind]", container).forEach((el) => {
const evt = (el.tagName === "SELECT" || el.type === "date" || el.type === "time" || el.type === "checkbox") ? "change" : "input";
el.addEventListener(evt, () => {
const path = el.dataset.bind;
let val = el.type === "checkbox" ? el.checked : el.value;
setPath(State.currentReport, path, val);
scheduleSave();
if (el.dataset.recalc)
recalcRegion(el.dataset.recalc);
});
});
}
function recalcRegion(region) {
const el = document.getElementById(region);
if (!el)
return;
if (region === "duration-info")
el.innerHTML = durationInfoHtml(State.currentReport);
}
function stepIncident(r) {
const i = r.incident;
return `
    <div class="card">
      ${fieldInput("Report/Office Reference Number", "reportNumber", r.reportNumber, {})}
      <div class="field-row">
        ${fieldInput("Tarehe ya Tukio", "incident.date", i.date, { type: "date", required: true })}
        ${fieldInput("Muda wa Kupokea Taarifa", "incident.timeReceived", i.timeReceived, { type: "time" })}
      </div>
      ${fieldSelect("Aina ya Tukio", "incident.type", i.type, INCIDENT_TYPES, { required: true })}
      ${i.type === "Tukio jingine" || i.type === "Ajali nyingine" ? fieldInput("Elezea Aina ya Tukio", "incident.otherType", i.otherType, {}) : ""}
      ${fieldInput("Chanzo cha Taarifa", "incident.sourceOfInfo", i.sourceOfInfo, {})}
      ${fieldInput("Jina la Mtoa Taarifa", "incident.reporterName", i.reporterName, {})}
      ${fieldInput("Namba ya Simu ya Mtoa Taarifa", "incident.reporterPhone", i.reporterPhone, { type: "tel" })}
    </div>`;
}
function stepLocation(r) {
const l = r.location;
const g = l.gps || {};
return `
    <div class="card">
      ${fieldInput("Mkoa", "location.region", l.region, {})}
      ${fieldInput("Wilaya", "location.district", l.district, {})}
      ${fieldInput("Kata", "location.ward", l.ward, {})}
      ${fieldInput("Mtaa", "location.street", l.street, {})}
      ${fieldInput("Barabara", "location.road", l.road, {})}
      ${fieldInput("Eneo Maarufu/Landmark", "location.landmark", l.landmark, {})}
      ${fieldInput("Maelezo ya Eneo", "location.description", l.description, { type: "textarea" })}
    </div>
    <div class="card">
      <div class="card-title">GPS (Optional \u2014 si lazima)</div>
      <div id="gps-info" class="muted" style="margin-bottom:10px;">
        ${g.lat ? `Lat: ${escapeHtml(g.lat)}, Lng: ${escapeHtml(g.lng)} (\u00B1${escapeHtml(g.accuracy)}m) \u2014 ${escapeHtml(fmtDateTime(g.timestamp))}` : "GPS haijawekwa bado."}
      </div>
      <button class="btn btn-block" id="capture-gps-btn">\uD83D\uDCCD Capture Current Location</button>
    </div>`;
}
function durationInfoHtml(r) {
computeDerived(r);
const d = r.derived || {};
return `
    <div class="stat-grid">
      <div class="stat-box"><div class="num">${d.responseTime || "-"}</div><div class="label">Response Time</div></div>
      <div class="stat-box"><div class="num">${d.sceneDuration || "-"}</div><div class="label">Time at Scene</div></div>
      <div class="stat-box"><div class="num">${d.totalDuration || "-"}</div><div class="label">Total Duration</div></div>
    </div>`;
}
function stepTimeline(r) {
const t = r.timeline;
return `
    <div class="card" id="duration-info">${durationInfoHtml(r)}</div>
    <div class="card">
      ${fieldInput("Time Received", "timeline.timeReceived", t.timeReceived, { type: "time", recalc: "duration-info" })}
      ${fieldInput("Time Departed Station", "timeline.timeDeparted", t.timeDeparted, { type: "time" })}
      ${fieldInput("Time Arrived Scene", "timeline.timeArrived", t.timeArrived, { type: "time" })}
      ${fieldInput("Time Operation Started", "timeline.timeOpStart", t.timeOpStart, { type: "time" })}
      ${fieldInput("Time Operation Completed", "timeline.timeOpEnd", t.timeOpEnd, { type: "time" })}
      ${fieldInput("Time Departed Scene", "timeline.timeDepartedScene", t.timeDepartedScene, { type: "time" })}
      ${fieldInput("Time Returned Station", "timeline.timeReturned", t.timeReturned, { type: "time" })}
    </div>`;
}
function stepVehicles(r) {
return `
    <div id="vehicles-list">${(r.vehiclesInvolved || []).map((v, idx) => vehicleBlockHtml(v, idx)).join("") || '<div class="empty-hint">Hakuna chombo kilichoongezwa bado.</div>'}</div>
    <button class="btn btn-block" id="add-vehicle-btn">+ Add Another Vehicle/Object</button>`;
}
function vehicleBlockHtml(v, idx) {
return `<div class="entry-block" data-entry="vehiclesInvolved.${idx}">
    <div class="entry-block-head"><span class="name">Chombo #${idx + 1}</span><button class="remove-btn" data-remove="vehiclesInvolved.${idx}">Ondoa</button></div>
    ${fieldInput("Aina ya Chombo", `vehiclesInvolved.${idx}.type`, v.type)}
    ${fieldInput("Namba ya Usajili", `vehiclesInvolved.${idx}.regNo`, v.regNo)}
    ${fieldInput("Make/Model", `vehiclesInvolved.${idx}.makeModel`, v.makeModel)}
    ${fieldInput("Rangi", `vehiclesInvolved.${idx}.color`, v.color)}
    ${fieldInput("Owner", `vehiclesInvolved.${idx}.owner`, v.owner)}
    ${fieldInput("Maelezo Mengine", `vehiclesInvolved.${idx}.notes`, v.notes, { type: "textarea" })}
  </div>`;
}
function stepCasualties(r) {
return `
    <p class="muted">Idadi ya Majeruhi: <strong>${(r.casualties || []).length}</strong></p>
    <div id="casualties-list">${(r.casualties || []).map((c, idx) => casualtyBlockHtml(c, idx)).join("") || '<div class="empty-hint">Hakuna majeruhi walioongezwa bado.</div>'}</div>
    <button class="btn btn-block btn-primary" id="add-casualty-btn">+ ADD CASUALTY</button>`;
}
function casualtyBlockHtml(c, idx) {
return `<div class="entry-block" data-entry="casualties.${idx}">
    <div class="entry-block-head"><span class="name">Majeruhi #${idx + 1}</span><button class="remove-btn" data-remove="casualties.${idx}">Ondoa</button></div>
    ${fieldInput("Full Name", `casualties.${idx}.name`, c.name)}
    <div class="field-row">
      ${fieldInput("Age", `casualties.${idx}.age`, c.age, { type: "number" })}
      ${fieldSelect("Sex", `casualties.${idx}.sex`, c.sex, ["Male", "Female"])}
    </div>
    ${fieldInput("Phone", `casualties.${idx}.phone`, c.phone, { type: "tel" })}
    ${fieldSelect("Role", `casualties.${idx}.role`, c.role, CASUALTY_ROLES)}
    ${fieldInput("Injury Description", `casualties.${idx}.injury`, c.injury, { type: "textarea" })}
    ${fieldSelect("Condition", `casualties.${idx}.condition`, c.condition, CONDITIONS)}
    ${fieldInput("First Aid Given", `casualties.${idx}.firstAid`, c.firstAid)}
    ${fieldInput("Hospital/Facility Taken To", `casualties.${idx}.hospital`, c.hospital)}
    ${fieldInput("Transport Used", `casualties.${idx}.transport`, c.transport)}
    ${fieldInput("Time Transported", `casualties.${idx}.timeTransported`, c.timeTransported, { type: "time" })}
    ${fieldInput("Additional Notes", `casualties.${idx}.notes`, c.notes, { type: "textarea" })}
  </div>`;
}
function stepFatality(r) {
const f = r.fatality;
return `
    <div class="card">
      <div class="chip-group">
        <span class="chip ${!f.occurred ? "selected" : ""}" data-fatal="no">No Death</span>
        <span class="chip ${f.occurred ? "selected" : ""}" data-fatal="yes">Death Occurred</span>
      </div>
    </div>
    <div id="deceased-section">${f.occurred ? deceasedSectionHtml(r) : ""}</div>`;
}
function deceasedSectionHtml(r) {
const list = r.fatality.deceased || [];
return `
    <p class="muted">Number of Deceased: <strong>${list.length}</strong></p>
    <div id="deceased-list">${list.map((d, idx) => deceasedBlockHtml(d, idx)).join("")}</div>
    <button class="btn btn-block" id="add-deceased-btn">+ Add Deceased Person</button>`;
}
function deceasedBlockHtml(d, idx) {
return `<div class="entry-block" data-entry="fatality.deceased.${idx}">
    <div class="entry-block-head"><span class="name">Marehemu #${idx + 1}</span><button class="remove-btn" data-remove="fatality.deceased.${idx}">Ondoa</button></div>
    ${fieldInput("Name", `fatality.deceased.${idx}.name`, d.name)}
    <div class="field-row">
      ${fieldInput("Age", `fatality.deceased.${idx}.age`, d.age, { type: "number" })}
      ${fieldSelect("Sex", `fatality.deceased.${idx}.sex`, d.sex, ["Male", "Female"])}
    </div>
    ${fieldInput("Identification/Status if Known", `fatality.deceased.${idx}.status`, d.status)}
    ${fieldInput("Notes", `fatality.deceased.${idx}.notes`, d.notes, { type: "textarea" })}
  </div>`;
}
function stepWitnesses(r) {
return `
    <div id="witnesses-list">${(r.witnesses || []).map((w, idx) => witnessBlockHtml(w, idx)).join("") || '<div class="empty-hint">Hakuna shahidi aliyeongezwa bado.</div>'}</div>
    <button class="btn btn-block" id="add-witness-btn">+ ADD WITNESS</button>`;
}
function witnessBlockHtml(w, idx) {
return `<div class="entry-block" data-entry="witnesses.${idx}">
    <div class="entry-block-head"><span class="name">Shahidi #${idx + 1}</span><button class="remove-btn" data-remove="witnesses.${idx}">Ondoa</button></div>
    ${fieldInput("Full Name", `witnesses.${idx}.name`, w.name)}
    ${fieldInput("Position/Occupation", `witnesses.${idx}.position`, w.position)}
    ${fieldInput("Company/Organization", `witnesses.${idx}.org`, w.org)}
    ${fieldInput("Phone", `witnesses.${idx}.phone`, w.phone, { type: "tel" })}
    ${fieldInput("Statement/Notes", `witnesses.${idx}.statement`, w.statement, { type: "textarea" })}
  </div>`;
}
function stepActions(r) {
const a = r.actionsTaken;
return `
    <div class="card">
      ${fieldInput("Describe Actions Taken by the Crew", "actionsTaken.text", a.text, { type: "textarea" })}
    </div>
    <div class="card">
      <div class="card-title">Checklist</div>
      <div class="checklist">
        ${ACTION_CHECKLIST.map(([k, label]) => { var _a; return `<label><input type="checkbox" data-bind="actionsTaken.checklist.${k}" ${((_a = a.checklist) === null || _a === void 0 ? void 0 : _a[k]) ? "checked" : ""}> ${label}</label>`; }).join("")}
      </div>
    </div>`;
}
function stepCause(r) {
const c = r.cause;
return `
    <div class="card">
      <div class="card-title">Cause / Source of Incident</div>
      <div class="chip-group" id="cause-chips">
        ${CAUSE_OPTIONS.map((o) => `<span class="chip ${((c.options || []).includes(o)) ? "selected" : ""}" data-toggle-opt="${o}">${o}</span>`).join("")}
      </div>
    </div>
    <div class="card">${fieldInput("Detailed Cause/Observations", "cause.detail", c.detail, { type: "textarea" })}</div>`;
}
function stepDamage(r) {
const d = r.damage;
return `<div class="card">
    ${fieldInput("Property Damaged", "damage.propertyDamaged", d.propertyDamaged)}
    ${fieldInput("Vehicle Damage", "damage.vehicleDamage", d.vehicleDamage)}
    ${fieldInput("Equipment Damage", "damage.equipmentDamage", d.equipmentDamage)}
    ${fieldInput("Estimated Loss (TZS)", "damage.estimatedLoss", d.estimatedLoss, { type: "number" })}
    ${fieldInput("Other Losses", "damage.otherLosses", d.otherLosses)}
    ${fieldInput("Description", "damage.description", d.description, { type: "textarea" })}
  </div>`;
}
function stepFuel(r) {
return `
    <div id="fuel-list">${(r.fuel || []).map((f, idx) => fuelBlockHtml(f, idx)).join("") || '<div class="empty-hint">Hakuna rasilimali zilizoongezwa bado.</div>'}</div>
    <button class="btn btn-block" id="add-fuel-btn">+ Add Resource Entry</button>`;
}
function fuelBlockHtml(f, idx) {
return `<div class="entry-block" data-entry="fuel.${idx}">
    <div class="entry-block-head"><span class="name">Entry #${idx + 1}</span><button class="remove-btn" data-remove="fuel.${idx}">Ondoa</button></div>
    ${fieldInput("Vehicle Registration", `fuel.${idx}.regNo`, f.regNo)}
    ${fieldInput("Fuel Type", `fuel.${idx}.fuelType`, f.fuelType)}
    ${fieldInput("Fuel Consumed (Litres)", `fuel.${idx}.litres`, f.litres, { type: "number" })}
    ${fieldInput("Other Resources Used", `fuel.${idx}.otherResources`, f.otherResources)}
  </div>`;
}
function stepOtherTeams(r) {
const o = r.otherTeams;
return `
    <div class="card">
      <div class="checklist">
        ${OTHER_TEAM_OPTIONS.map((opt) => `<label><input type="checkbox" data-team-check="${opt}" ${((o.checks || []).includes(opt)) ? "checked" : ""}> ${opt}</label>`).join("")}
      </div>
    </div>
    <div id="other-teams-entries">${(o.entries || []).map((e, idx) => otherTeamBlockHtml(e, idx)).join("")}</div>
    <button class="btn btn-block" id="add-team-btn">+ Add Team Detail</button>`;
}
function otherTeamBlockHtml(e, idx) {
return `<div class="entry-block" data-entry="otherTeams.entries.${idx}">
    <div class="entry-block-head"><span class="name">Team #${idx + 1}</span><button class="remove-btn" data-remove="otherTeams.entries.${idx}">Ondoa</button></div>
    ${fieldInput("Team Name", `otherTeams.entries.${idx}.name`, e.name)}
    ${fieldInput("Role", `otherTeams.entries.${idx}.role`, e.role)}
    ${fieldInput("Notes", `otherTeams.entries.${idx}.notes`, e.notes, { type: "textarea" })}
  </div>`;
}
function stepChallenges(r) {
const c = r.challenges;
return `
    <div class="card">${fieldInput("Challenges Encountered", "challenges.text", c.text, { type: "textarea" })}</div>
    <div class="card">
      <div class="chip-group">
        ${CHALLENGE_OPTIONS.map((o) => `<span class="chip ${((c.options || []).includes(o)) ? "selected" : ""}" data-toggle-challenge="${o}">${o}</span>`).join("")}
      </div>
    </div>`;
}
function stepPhotos(r) {
return `
    <div class="card">
      <div class="btn-row">
        <label class="btn btn-primary" style="flex:1;">\uD83D\uDCF7 Take Photo<input type="file" accept="image/*" capture="environment" id="photo-take" style="display:none"></label>
        <label class="btn" style="flex:1;">\uD83D\uDDBC\uFE0F Choose Photo<input type="file" accept="image/*" multiple id="photo-choose" style="display:none"></label>
      </div>
    </div>
    <div class="photo-grid" id="photo-grid"><div class="muted">Inapakia...</div></div>`;
}
async function loadPhotoGrid(incidentId) {
const grid = $("#photo-grid");
if (!grid)
return;
const photos = await RescueDB.getPhotosForIncident(incidentId);
if (!photos.length) {
grid.innerHTML = '<div class="empty-hint">Hakuna picha bado.</div>';
return;
}
grid.innerHTML = photos.map((p) => {
const url = URL.createObjectURL(p.blob);
return `<div class="photo-thumb" data-photo-id="${p.photoId}">
      <img src="${url}" alt="">
      <button class="del" data-del-photo="${p.photoId}">\u00D7</button>
      <input class="cap-input" placeholder="Caption" value="${escapeHtml(p.caption || "")}" data-caption="${p.photoId}">
    </div>`;
}).join("");
}
function stepCrew(r) {
const c = r.crew;
return `
    <div class="card">
      ${fieldInput("Station", "crew.station", c.station)}
      ${fieldInput("Shift Leader", "crew.shiftLeader", c.shiftLeader)}
      ${fieldInput("Driver", "crew.driver", c.driver)}
    </div>
    <div id="crew-members">${(c.members || []).map((m, idx) => crewMemberHtml(m, idx)).join("") || '<div class="empty-hint">Hakuna crew member aliyeongezwa.</div>'}</div>
    <button class="btn btn-block" id="add-crew-btn">+ Add Crew Member</button>`;
}
function crewMemberHtml(m, idx) {
return `<div class="entry-block" data-entry="crew.members.${idx}">
    <div class="entry-block-head"><span class="name">Member #${idx + 1}</span><button class="remove-btn" data-remove="crew.members.${idx}">Ondoa</button></div>
    ${fieldInput("Name", `crew.members.${idx}.name`, m.name)}
    ${fieldInput("Rank/Role", `crew.members.${idx}.role`, m.role)}
    ${fieldInput("Service/Staff Number", `crew.members.${idx}.staffNo`, m.staffNo)}
  </div>`;
}
function stepReview(r) {
return `
    <div class="card">
      <p>Umekamilisha sehemu zote. Hakiki taarifa kabla ya "Complete Report".</p>
      <button class="btn btn-block" id="preview-btn">\uD83D\uDC41\uFE0F Preview Report</button>
    </div>
    <div class="card">
      <div class="card-title">Report Status</div>
      <div class="chip-group">
        ${["DRAFT", "IN_PROGRESS", "COMPLETED", "ARCHIVED"].map((s) => `<span class="chip ${r.status === s ? "selected" : ""}" data-set-status="${s}">${s.replace("_", " ")}</span>`).join("")}
      </div>
    </div>`;
}
function bindStep(key, r) {
bindGenericInputs($("#step-body"));
if (key === "location") {
$("#capture-gps-btn").addEventListener("click", () => {
if (!navigator.geolocation) {
toast("GPS haipatikani kwenye kifaa hiki", "err");
return;
}
$("#capture-gps-btn").textContent = "Inatafuta...";
navigator.geolocation.getCurrentPosition((pos) => {
r.location.gps = {
lat: pos.coords.latitude.toFixed(6),
lng: pos.coords.longitude.toFixed(6),
accuracy: Math.round(pos.coords.accuracy),
timestamp: nowIso(),
};
scheduleSave();
renderReportForm();
toast("Eneo limewekwa", "ok");
}, () => {
toast("Imeshindikana kupata GPS. Unaweza kuendelea bila GPS.", "err");
$("#capture-gps-btn").textContent = "\uD83D\uDCCD Capture Current Location";
}, { enableHighAccuracy: true, timeout: 10000 });
});
}
if (key === "vehicles") {
$("#add-vehicle-btn").addEventListener("click", () => { r.vehiclesInvolved = r.vehiclesInvolved || []; r.vehiclesInvolved.push({}); scheduleSave(); renderReportForm(); });
bindRemove($("#vehicles-list"), r);
}
if (key === "casualties") {
$("#add-casualty-btn").addEventListener("click", () => { r.casualties = r.casualties || []; r.casualties.push({}); scheduleSave(); renderReportForm(); });
bindRemove($("#casualties-list"), r);
}
if (key === "fatality") {
$$("[data-fatal]", $("#step-body")).forEach((chip) => chip.addEventListener("click", () => {
r.fatality.occurred = chip.dataset.fatal === "yes";
scheduleSave();
renderReportForm();
}));
const addBtn = $("#add-deceased-btn");
if (addBtn)
addBtn.addEventListener("click", () => { r.fatality.deceased = r.fatality.deceased || []; r.fatality.deceased.push({}); scheduleSave(); renderReportForm(); });
bindRemove($("#deceased-section"), r);
}
if (key === "witnesses") {
$("#add-witness-btn").addEventListener("click", () => { r.witnesses = r.witnesses || []; r.witnesses.push({}); scheduleSave(); renderReportForm(); });
bindRemove($("#witnesses-list"), r);
}
if (key === "cause") {
$$("[data-toggle-opt]", $("#step-body")).forEach((chip) => chip.addEventListener("click", () => {
const opt = chip.dataset.toggleOpt;
r.cause.options = r.cause.options || [];
const i = r.cause.options.indexOf(opt);
if (i >= 0)
r.cause.options.splice(i, 1);
else
r.cause.options.push(opt);
chip.classList.toggle("selected");
scheduleSave();
}));
}
if (key === "fuel") {
$("#add-fuel-btn").addEventListener("click", () => { r.fuel = r.fuel || []; r.fuel.push({}); scheduleSave(); renderReportForm(); });
bindRemove($("#fuel-list"), r);
}
if (key === "otherTeams") {
$$("[data-team-check]", $("#step-body")).forEach((cb) => cb.addEventListener("change", () => {
const opt = cb.dataset.teamCheck;
r.otherTeams.checks = r.otherTeams.checks || [];
const i = r.otherTeams.checks.indexOf(opt);
if (cb.checked && i < 0)
r.otherTeams.checks.push(opt);
if (!cb.checked && i >= 0)
r.otherTeams.checks.splice(i, 1);
scheduleSave();
}));
$("#add-team-btn").addEventListener("click", () => { r.otherTeams.entries = r.otherTeams.entries || []; r.otherTeams.entries.push({}); scheduleSave(); renderReportForm(); });
bindRemove($("#other-teams-entries"), r);
}
if (key === "challenges") {
$$("[data-toggle-challenge]", $("#step-body")).forEach((chip) => chip.addEventListener("click", () => {
const opt = chip.dataset.toggleChallenge;
r.challenges.options = r.challenges.options || [];
const i = r.challenges.options.indexOf(opt);
if (i >= 0)
r.challenges.options.splice(i, 1);
else
r.challenges.options.push(opt);
chip.classList.toggle("selected");
scheduleSave();
}));
}
if (key === "photos") {
loadPhotoGrid(r.incidentId);
const handleFiles = async (files) => {
for (const file of files) {
const photoId = uid("PH");
await RescueDB.putPhoto({ photoId, incidentId: r.incidentId, blob: file, caption: "", takenAt: nowIso() });
r.photoIds = r.photoIds || [];
r.photoIds.push(photoId);
}
scheduleSave();
loadPhotoGrid(r.incidentId);
toast("Picha zimehifadhiwa", "ok");
};
$("#photo-take").addEventListener("change", (e) => handleFiles(Array.from(e.target.files)));
$("#photo-choose").addEventListener("change", (e) => handleFiles(Array.from(e.target.files)));
$("#photo-grid").addEventListener("click", async (e) => {
const delId = e.target.dataset.delPhoto;
if (delId) {
if (!confirm("Futa picha hii?"))
return;
await RescueDB.deletePhoto(delId);
r.photoIds = (r.photoIds || []).filter((id) => id !== delId);
scheduleSave();
loadPhotoGrid(r.incidentId);
}
});
$("#photo-grid").addEventListener("change", async (e) => {
const capId = e.target.dataset.caption;
if (capId) {
const photos = await RescueDB.getPhotosForIncident(r.incidentId);
const p = photos.find((x) => x.photoId === capId);
if (p) {
p.caption = e.target.value;
await RescueDB.putPhoto(p);
}
}
});
}
if (key === "crew") {
$("#add-crew-btn").addEventListener("click", () => { r.crew.members = r.crew.members || []; r.crew.members.push({}); scheduleSave(); renderReportForm(); });
bindRemove($("#crew-members"), r);
}
if (key === "review") {
$("#preview-btn").addEventListener("click", () => { flushSave(); navigate("#/report/" + r.incidentId + "/preview"); });
$$("[data-set-status]", $("#step-body")).forEach((chip) => chip.addEventListener("click", async () => {
r.status = chip.dataset.setStatus;
await flushSave();
renderReportForm();
toast("Status: " + r.status, "ok");
}));
}
}
function bindRemove(container, r) {
if (!container)
return;
$$("[data-remove]", container).forEach((btn) => {
btn.addEventListener("click", () => {
const path = btn.dataset.remove; // e.g. casualties.3 or fatality.deceased.2
const lastDot = path.lastIndexOf(".");
const arrPath = path.slice(0, lastDot);
const idx = Number(path.slice(lastDot + 1));
const arr = getPath(r, arrPath);
if (Array.isArray(arr))
arr.splice(idx, 1);
scheduleSave();
renderReportForm();
});
});
}
routes["report"] = async (segs) => {
const id = segs[1];
const sub = segs[2];
if (id === "new") {
State.currentReport = blankReport();
State.currentStep = 0;
await RescueDB.putReport(State.currentReport);
await RescueDB.logAction(State.currentReport.incidentId, "Created");
history.replaceState(null, "", "#/report/" + State.currentReport.incidentId);
renderReportForm();
return;
}
const existing = await RescueDB.getReport(id);
if (!existing) {
navigate("#/dashboard");
toast("Ripoti haikupatikana", "err");
return;
}
State.currentReport = existing;
if (sub === "preview" || sub === "manage" || sub === "actions") {
await renderReportActions(existing);
return;
}
const savedStep = Number.isInteger(existing.lastStepIndex) ? existing.lastStepIndex : 0;
State.currentStep = Math.min(Math.max(savedStep, 0), STEPS_ORDER.length - 1);
renderReportForm();
};
async function renderReportActions(r) {
var _a, _b;
const photos = await RescueDB.getPhotosForIncident(r.incidentId);
computeDerived(r);
const narrativeText = RescueExport.getEffectiveNarrativeText(r);
const photosHtml = RescueExport.buildPhotosHtml(photos);
setMain(`
    <div class="card">
      <div class="top-row" style="display:flex;justify-content:space-between;align-items:center;">
        <strong style="font-size:15px;">${escapeHtml(friendlyReportTitle(r))}</strong>
        <span class="badge badge-${r.status.toLowerCase()}">${r.status.replace("_", " ")}</span>
      </div>
      <p class="muted" style="margin-top:6px;">${escapeHtml(((_a = r.incident) === null || _a === void 0 ? void 0 : _a.type) || "")} \u00B7 ${escapeHtml(fmtDate((_b = r.incident) === null || _b === void 0 ? void 0 : _b.date))}</p>
    </div>

    <button class="btn btn-block" id="whatsapp-quick-btn" style="background:#25D366;border-color:#25D366;color:#04210f;font-weight:800;margin-bottom:12px;">
      \uD83D\uDFE2 Tuma kupitia WhatsApp (Haraka)
    </button>

    <div class="card">
      <div class="card-title">REPORT ACTIONS</div>
      <div class="dash-actions">
        <button class="btn" id="act-view"><span class="ic">\uD83D\uDC41\uFE0F</span>View Report</button>
        <button class="btn" id="act-edit"><span class="ic">\u270F\uFE0F</span>Edit Report</button>
        <button class="btn" id="act-pdf"><span class="ic">\uD83D\uDCC4</span>Export PDF</button>
        <button class="btn" id="act-print"><span class="ic">\uD83D\uDDA8\uFE0F</span>Print Report</button>
        <button class="btn btn-primary" id="act-share"><span class="ic">\uD83D\uDCE4</span>Share Report</button>
        <button class="btn" id="act-copy"><span class="ic">\uD83D\uDCCB</span>Copy Report</button>
        <button class="btn" id="act-download"><span class="ic">\uD83D\uDCC1</span>Save/Download</button>
        <button class="btn" id="act-archive"><span class="ic">${r.status === "ARCHIVED" ? "\u21A9\uFE0F" : "\uD83D\uDDC4\uFE0F"}</span>${r.status === "ARCHIVED" ? "Unarchive" : "Archive Report"}</button>
      </div>
      <button class="btn btn-block btn-danger" id="act-delete" style="margin-top:4px;">\uD83D\uDDD1\uFE0F Delete Report</button>
    </div>

    <div class="card" id="view-report-card">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
        <span>Taarifa Kamili ya Tukio</span>
        <span class="muted" id="narrative-edit-status" style="font-size:11px;"></span>
      </div>
      <p class="muted" style="font-size:12px;margin:2px 0 8px 0;">Gusa maandishi hapa chini kuedit na kujaza sehemu unazoona zinafaa.</p>
      <div id="print-area">
        <div class="preview-doc">
          <div id="narrative-editor" class="narrative-body" contenteditable="true" spellcheck="false" style="outline:none;border:1px dashed var(--line,#ccc);border-radius:6px;padding:10px;min-height:80px;"></div>
          <div id="narrative-photos">${photosHtml}</div>
        </div>
      </div>
      <div class="btn-row" style="margin-top:10px;gap:8px;">
        <button class="btn btn-primary" id="act-save-narrative">\uD83D\uDCBE Hifadhi Mabadiliko</button>
        <button class="btn btn-ghost" id="act-reset-narrative">\u21A9\uFE0F Rudisha Asili</button>
      </div>
    </div>

    <div class="card">
      <div class="card-title">History</div>
      <div id="audit-log" class="muted">Inapakia...</div>
    </div>
  `, "Report Actions: " + friendlyReportTitle(r));
$("#narrative-editor").textContent = narrativeText;
bindReportActions(r);
bindNarrativeEditor(r);
const log = await RescueDB.getAuditLog(r.incidentId);
$("#audit-log").innerHTML = log.length
? log.sort((a, b) => b.at.localeCompare(a.at)).map((l) => `<div style="padding:6px 0;border-bottom:1px solid var(--line);font-size:13px;">${escapeHtml(l.action)} \u2014 <span class="muted">${escapeHtml(fmtDateTime(l.at))}</span></div>`).join("")
: '<div class="muted">Hakuna historia.</div>';
}
function bindReportActions(r) {
$("#act-view").addEventListener("click", () => {
$("#view-report-card").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("#act-edit").addEventListener("click", () => navigate("#/report/" + r.incidentId));
$("#act-pdf").addEventListener("click", async () => {
try {
RescueExport.downloadReportPdf(r, $("#narrative-editor").innerText);
await RescueDB.logAction(r.incidentId, "Exported PDF");
showShareConfirmation(r, { pdfReady: true });
}
catch (e) {
console.error(e);
toast("Imeshindikana kutengeneza PDF", "err");
}
});
$("#act-download").addEventListener("click", async () => {
try {
RescueExport.downloadReportPdf(r, $("#narrative-editor").innerText);
await RescueDB.logAction(r.incidentId, "Downloaded report file");
toast("Ripoti imehifadhiwa kwenye kifaa (PDF)", "ok");
}
catch (e) {
console.error(e);
toast("Imeshindikana kuhifadhi", "err");
}
});
$("#act-print").addEventListener("click", async () => {
window.print();
await RescueDB.logAction(r.incidentId, "Printed report");
});
$("#act-copy").addEventListener("click", async () => {
const ok = await RescueExport.copyText($("#narrative-editor").innerText);
if (ok) {
toast("Ripoti nzima imenakiliwa (copied)", "ok");
await RescueDB.logAction(r.incidentId, "Copied report text");
}
else
toast("Imeshindikana kunakili", "err");
});
$("#whatsapp-quick-btn").addEventListener("click", async () => {
RescueExport.whatsappShare($("#narrative-editor").innerText);
await RescueDB.logAction(r.incidentId, "Shared via WhatsApp");
showShareConfirmation(r, {});
});
$("#act-share").addEventListener("click", () => showShareSheet(r));
$("#act-archive").addEventListener("click", async () => {
if (r.status === "ARCHIVED") {
r.status = "COMPLETED";
await RescueDB.putReport(r);
await RescueDB.logAction(r.incidentId, "Restored from archive");
toast("Imerudishwa", "ok");
}
else {
r.status = "ARCHIVED";
await RescueDB.putReport(r);
await RescueDB.logAction(r.incidentId, "Archived");
toast("Imewekwa Archive", "ok");
}
navigate("#/dashboard");
});
$("#act-delete").addEventListener("click", () => confirmDeleteModal(r));
}
function bindNarrativeEditor(r) {
  const editor = $("#narrative-editor");
  const statusEl = $("#narrative-edit-status");
  if (!editor) return;
  const savedBaseline = () => (typeof r.editedNarrative === "string" && r.editedNarrative.trim() !== "")
    ? r.editedNarrative
    : RescueExport.buildNarrativeText(r);
  function setStatus(text, kind) {
    if (!statusEl) return;
    statusEl.textContent = text || "";
    statusEl.style.color = kind === "err" ? "#c0392b" : kind === "ok" ? "#1a7f37" : "var(--muted, #888)";
  }
  function markDirtyIfChanged() {
    const current = editor.innerText.replace(/\u00A0/g, " ");
    if (current !== savedBaseline()) setStatus("Kuna mabadiliko ambayo hayajahifadhiwa", "err");
    else setStatus("");
  }
  async function persist(showToast) {
    r.editedNarrative = editor.innerText;
    await RescueDB.putReport(r);
    await RescueDB.logAction(r.incidentId, "Edited narrative text");
    setStatus("Imehifadhiwa \u2713", "ok");
    if (showToast) toast("Mabadiliko ya taarifa yamehifadhiwa", "ok");
    setTimeout(() => {
      if (statusEl && statusEl.textContent.indexOf("Imehifadhiwa") === 0) setStatus("");
    }, 2500);
  }
  editor.addEventListener("input", markDirtyIfChanged);
  // Auto-save mtumiaji anapoacha kuandika (blur) ili kuedit na kujaza iwe rahisi
  // bila kulazimika kubofya kitufe kila mara.
  editor.addEventListener("blur", () => { persist(false); });
  const saveBtn = $("#act-save-narrative");
  const resetBtn = $("#act-reset-narrative");
  if (saveBtn) saveBtn.addEventListener("click", () => persist(true));
  if (resetBtn) resetBtn.addEventListener("click", async () => {
    const ok = window.confirm("Una uhakika unataka kurudisha maandishi ya awali (yaliyotengenezwa kiotomatiki)? Mabadiliko yako ya sasa yatapotea.");
    if (!ok) return;
    delete r.editedNarrative;
    await RescueDB.putReport(r);
    await RescueDB.logAction(r.incidentId, "Reset narrative text to default");
    editor.textContent = RescueExport.buildNarrativeText(r);
    setStatus("");
    toast("Imerudishwa kwenye maandishi ya awali", "ok");
  });
}
function showShareSheet(r) {
let mode = "full"; // "full" | "summary"
const backdrop = document.createElement("div");
backdrop.className = "modal-backdrop";
backdrop.innerHTML = `
    <div class="modal">
      <h3>SHARE / EXPORT</h3>
      <div class="chip-group" style="margin-bottom:14px;">
        <span class="chip selected" data-mode="full">Ripoti Kamili</span>
        <span class="chip" data-mode="summary">Muhtasari Tu</span>
      </div>
      <div class="btn-row" style="flex-direction:column;gap:8px;">
        <button class="btn btn-block" data-act="native">\uD83D\uDCF1 Share</button>
        <button class="btn btn-block" data-act="whatsapp" style="background:#25D366;border-color:#25D366;color:#04210f;font-weight:700;">\uD83D\uDFE2 WhatsApp</button>
        <button class="btn btn-block" data-act="pdf">\uD83D\uDCC4 Export PDF</button>
        <button class="btn btn-block" data-act="print">\uD83D\uDDA8\uFE0F Print</button>
        <button class="btn btn-block" data-act="copy">\uD83D\uDCCB Copy Text</button>
        <button class="btn btn-block" data-act="download">\uD83D\uDCC1 Download File</button>
        <button class="btn btn-block" data-act="email">\uD83D\uDCE7 Email</button>
        <button class="btn btn-block" data-act="bluetooth">\uD83D\uDD35 Bluetooth / Quick Share</button>
        <button class="btn btn-block" data-act="drive">\u2601\uFE0F Save to Drive</button>
      </div>
      <p class="muted" style="margin-top:10px;">Bluetooth/Quick Share na Save to Drive hufungua orodha ya kushirikisha (share sheet) ya simu yako \u2014 chagua app husika humo.</p>
      <div class="btn-row" style="margin-top:6px;"><button class="btn btn-block btn-ghost" id="share-sheet-close">Funga</button></div>
    </div>`;
document.body.appendChild(backdrop);
$$("[data-mode]", backdrop).forEach((chip) => chip.addEventListener("click", () => {
mode = chip.dataset.mode;
$$("[data-mode]", backdrop).forEach((c) => c.classList.toggle("selected", c === chip));
}));
const getText = () => (mode === "summary" ? RescueExport.buildSummaryText(r) : ($("#narrative-editor") ? $("#narrative-editor").innerText : RescueExport.getEffectiveNarrativeText(r)));
backdrop.addEventListener("click", async (e) => {
const act = e.target.dataset.act;
if (e.target.id === "share-sheet-close") {
backdrop.remove();
return;
}
if (!act)
return;
try {
if (act === "native") {
const res = await RescueExport.shareText("Incident & Rescue Report", getText());
await RescueDB.logAction(r.incidentId, "Shared report (native)");
if (res.cancelled)
return;
if (res.method === "copy-fallback")
toast(res.ok ? "Share ya moja kwa moja haipatikani \u2014 maandishi yamenakiliwa" : "Imeshindikana kushare", res.ok ? "ok" : "err");
backdrop.remove();
if (res.ok)
showShareConfirmation(r, {});
}
else if (act === "whatsapp") {
RescueExport.whatsappShare(getText());
await RescueDB.logAction(r.incidentId, "Shared via WhatsApp");
backdrop.remove();
showShareConfirmation(r, {});
}
else if (act === "pdf" || act === "download") {
RescueExport.downloadReportPdf(r, getText());
await RescueDB.logAction(r.incidentId, "Exported PDF");
backdrop.remove();
showShareConfirmation(r, { pdfReady: true });
}
else if (act === "print") {
backdrop.remove();
window.print();
await RescueDB.logAction(r.incidentId, "Printed report");
}
else if (act === "copy") {
const ok = await RescueExport.copyText(getText());
toast(ok ? "Maandishi yamenakiliwa (copied)" : "Imeshindikana kunakili", ok ? "ok" : "err");
if (ok)
await RescueDB.logAction(r.incidentId, "Copied report text");
backdrop.remove();
}
else if (act === "email") {
RescueExport.mailtoShare(`Incident & Rescue Report - ${r.reportNumber || r.incidentId}`, getText());
await RescueDB.logAction(r.incidentId, "Shared via Email");
backdrop.remove();
}
else if (act === "bluetooth" || act === "drive") {
const res = await RescueExport.sharePdfFile(r, getText());
await RescueDB.logAction(r.incidentId, act === "bluetooth" ? "Shared via Bluetooth/Quick Share" : "Shared to Drive (via share sheet)");
backdrop.remove();
if (res.cancelled)
return;
if (res.method === "download-fallback") {
toast("PDF imehifadhiwa. Unaweza kuifungua na kuishare kupitia WhatsApp, Email, Bluetooth, Quick Share, n.k.", "ok");
}
showShareConfirmation(r, { pdfReady: true });
}
}
catch (err) {
console.error(err);
toast("Kitendo kimeshindikana", "err");
}
});
}
function showShareConfirmation(r, opts) {
const backdrop = document.createElement("div");
backdrop.className = "modal-backdrop";
backdrop.innerHTML = `
    <div class="modal">
      <h3>\u2705 Report tayari kushirikiwa</h3>
      <p class="muted">Report ID: <strong>${escapeHtml(friendlyReportTitle(r))}</strong></p>
      <div class="btn-row" style="flex-direction:column;gap:8px;margin-top:10px;">
        <button class="btn btn-block" id="conf-share-again">Share Tena</button>
        ${opts.pdfReady ? `<button class="btn btn-block" id="conf-open-pdf">Fungua PDF</button>` : ""}
        <button class="btn btn-block" id="conf-print">Print</button>
        <button class="btn btn-block btn-primary" id="conf-done">Nimemaliza</button>
      </div>
    </div>`;
document.body.appendChild(backdrop);
backdrop.addEventListener("click", (e) => {
if (e.target.id === "conf-done") {
backdrop.remove();
return;
}
if (e.target.id === "conf-share-again") {
backdrop.remove();
showShareSheet(r);
return;
}
if (e.target.id === "conf-print") {
backdrop.remove();
window.print();
return;
}
if (e.target.id === "conf-open-pdf") {
const blob = RescueExport.generateReportPdfBlob(r);
const url = URL.createObjectURL(blob);
window.open(url, "_blank");
return;
}
});
}
function confirmDeleteModal(r) {
if (!State.settings.deletePasswordHash) {
const backdrop = document.createElement("div");
backdrop.className = "modal-backdrop";
backdrop.innerHTML = `
      <div class="modal liquid-modal danger-modal">
        <div class="modal-icon">\uD83D\uDD10</div>
        <h3>Password ya Delete Haijawekwa</h3>
        <p class="muted">Weka password kwenye Settings \u2192 Usalama wa Kufuta kabla ya kuhamisha ripoti kwenda Trash.</p>
        <div class="btn-row">
          <button class="btn btn-block btn-ghost" id="no-del-pass">Funga</button>
          <button class="btn btn-block btn-primary" id="go-del-pass">Weka Password</button>
        </div>
      </div>`;
document.body.appendChild(backdrop);
$("#no-del-pass", backdrop).addEventListener("click", () => backdrop.remove());
$("#go-del-pass", backdrop).addEventListener("click", () => { backdrop.remove(); openDeletePasswordModal(); });
return;
}
const backdrop = document.createElement("div");
backdrop.className = "modal-backdrop";
backdrop.innerHTML = `
    <div class="modal liquid-modal danger-modal">
      <div class="modal-icon">\uD83D\uDDD1\uFE0F</div>
      <h3>Hamisha Ripoti kwenda Trash?</h3>
      <p>Ripoti <strong>${escapeHtml(friendlyReportTitle(r))}</strong> haitafutwa kabisa.</p>
      <div class="delete-flow">
        <div>1. Thibitisha password</div>
        <div>2. Ripoti itajificha kwenye orodha</div>
        <div>3. Itaonekana kwenye Trash na inaweza kurejeshwa</div>
      </div>
      <div class="field">
        <label>\uD83D\uDD10 Password ya Delete</label>
        <input id="delete-pass" type="password" inputmode="numeric" autocomplete="off" placeholder="Ingiza password">
      </div>
      <div id="delete-pass-error" class="form-error"></div>
      <div class="btn-row">
        <button class="btn btn-block btn-ghost" id="cancel-del">Ghairi</button>
        <button class="btn btn-block btn-danger" id="confirm-del">\uD83D\uDDD1\uFE0F Delete</button>
      </div>
    </div>`;
document.body.appendChild(backdrop);
$("#cancel-del", backdrop).addEventListener("click", () => backdrop.remove());
$("#confirm-del", backdrop).addEventListener("click", async () => {
const pass = $("#delete-pass", backdrop).value || "";
if (!(await verifyDeletePassword(pass))) {
$("#delete-pass-error", backdrop).textContent = "Password si sahihi. Ripoti haijahamishwa.";
return;
}
try {
await flushSave();
await RescueDB.moveToTrash(r);
await RescueDB.logAction(r.incidentId, "Moved to Trash");
backdrop.remove();
toast("Ripoti imehamishwa kwenda Trash \u2014 inaweza kurejeshwa.", "ok");
navigate("#/dashboard");
}
catch (e) {
console.error(e);
$("#delete-pass-error", backdrop).textContent = "Imeshindikana kuhamisha ripoti. Jaribu tena.";
}
});
}
document.addEventListener("click", async (e) => {
const navEl = e.target.closest("[data-nav]");
if (navEl) {
navigate("#" + navEl.dataset.nav);
return;
}
const restoreBtn = e.target.closest("[data-action='restore-trash']");
if (restoreBtn) {
await RescueDB.restoreFromTrash(restoreBtn.dataset.id);
await RescueDB.logAction(restoreBtn.dataset.id, "Restored from trash");
toast("Imerejeshwa", "ok");
render();
return;
}
const permaBtn = e.target.closest("[data-action='perma-delete']");
if (permaBtn) {
confirmPermaDeleteModal(permaBtn.dataset.id);
return;
}
});
function confirmPermaDeleteModal(id) {
const backdrop = document.createElement("div");
backdrop.className = "modal-backdrop";
backdrop.innerHTML = `
    <div class="modal liquid-modal danger-modal">
      <div class="modal-icon">\u26A0\uFE0F</div>
      <h3>Futa Kabisa?</h3>
      <p class="muted">Hii ni hatua ya mwisho. Ripoti na picha zake zitaondolewa kabisa kwenye kifaa na haziwezi kurejeshwa.</p>
      <div class="field">
        <label>\uD83D\uDD10 Password ya Delete</label>
        <input id="perma-delete-pass" type="password" inputmode="numeric" autocomplete="off" placeholder="Ingiza password">
      </div>
      <div id="perma-delete-error" class="form-error"></div>
      <div class="btn-row">
        <button class="btn btn-block btn-ghost" id="cancel-perma">Ghairi</button>
        <button class="btn btn-block btn-danger" id="confirm-perma">Futa Kabisa</button>
      </div>
    </div>`;
document.body.appendChild(backdrop);
$("#cancel-perma", backdrop).addEventListener("click", () => backdrop.remove());
$("#confirm-perma", backdrop).addEventListener("click", async () => {
if (!State.settings.deletePasswordHash) {
backdrop.remove();
openDeletePasswordModal();
return;
}
const pass = $("#perma-delete-pass", backdrop).value || "";
if (!(await verifyDeletePassword(pass))) {
$("#perma-delete-error", backdrop).textContent = "Password si sahihi.";
return;
}
try {
await RescueDB.permanentlyDelete(id);
await RescueDB.logAction(id, "Deleted permanently");
backdrop.remove();
toast("Ripoti imefutwa kabisa.", "ok");
render();
}
catch (e) {
console.error(e);
$("#perma-delete-error", backdrop).textContent = "Imeshindikana kufuta kabisa.";
}
});
}
let longPressTimer = null;
let longPressTriggered = false;
function setupLongPressDelete() {
const items = $$(".report-list-item[data-report-id]");
items.forEach((item) => {
const id = item.dataset.reportId;
const start = (ev) => {
if (ev.type === "mousedown" && ev.button !== 0)
return;
longPressTriggered = false;
clearTimeout(longPressTimer);
longPressTimer = setTimeout(async () => {
longPressTriggered = true;
if (navigator.vibrate)
navigator.vibrate([35, 25, 35]);
const report = await RescueDB.getReport(id);
if (report)
confirmDeleteModal(report);
}, 850);
};
const cancel = () => clearTimeout(longPressTimer);
item.addEventListener("touchstart", start, { passive: true });
item.addEventListener("touchend", cancel);
item.addEventListener("touchcancel", cancel);
item.addEventListener("mousedown", start);
item.addEventListener("mouseup", cancel);
item.addEventListener("mouseleave", cancel);
item.addEventListener("contextmenu", (e) => e.preventDefault());
item.addEventListener("click", (e) => {
if (longPressTriggered) {
e.preventDefault();
e.stopPropagation();
longPressTriggered = false;
}
}, true);
});
}
function navButtons() {
return [
{ r: "dashboard", ic: "\uD83C\uDFE0", label: "Home" },
{ r: "reports", ic: "\uD83D\uDCCB", label: "Reports" },
{ r: "report/new", ic: "\u2795", label: "New" },
{ r: "reports?status=ARCHIVED", ic: "\uD83D\uDDC4\uFE0F", label: "Archive" },
{ r: "trash", ic: "\uD83D\uDDD1\uFE0F", label: "Trash" },
{ r: "settings", ic: "\u2699\uFE0F", label: "Settings" },
];
}
const SADEBOOKS_URL = "https://hermansade3-cmd.github.io/sadebooks/";
function buildShell() {
const app = $("#app");
const booksLink = `<a class="books-link" href="${SADEBOOKS_URL}" target="_blank" rel="noopener noreferrer"><span class="ic">\uD83D\uDCDA</span><span>SadeBooks</span><small>\u00B7 Soma vitabu vya Kiswahili</small></a>`;
const navHtml = navButtons().map((n) => `<button class="nav-btn" data-route="${n.r.split("?")[0].split("/")[0]}" data-nav="/${n.r}"><span class="ic">${n.ic}</span><span>${n.label}</span></button>`).join("");
app.innerHTML = `
    <nav class="sidebar">
      <div style="padding:8px 12px 16px 12px;"><strong style="font-size:15px;">\uD83D\uDEA8 Rescue Report</strong></div>
      ${booksLink}
      ${navHtml}
    </nav>
    <div class="content-col">
      <div class="offline-banner" id="offline-banner">Offline Mode \u2014 Data inahifadhiwa kwenye kifaa hiki</div>
      <div class="topbar">
        <button class="back-btn" id="back-btn" aria-label="Back">\u2190</button>
        <h1 id="page-title">Dashboard</h1>
        <span class="save-indicator" id="save-indicator" style="display:none;"></span>
      </div>
      <main id="main"></main>
      <div class="footer-note">Created by Herman Sade</div>
    </div>
    <nav class="bottom-nav">${booksLink}<div class="nav-row">${navHtml}</div></nav>
    <div id="toast-host"></div>
  `;
$("#back-btn").addEventListener("click", () => { flushSave(); history.back(); });
updateOfflineBanner();
window.addEventListener("online", updateOfflineBanner);
window.addEventListener("offline", updateOfflineBanner);
}
function updateOfflineBanner() {
const b = $("#offline-banner");
if (!b)
return;
b.classList.toggle("online", navigator.onLine);
b.textContent = navigator.onLine ? "" : "Offline Mode \u2014 Data inahifadhiwa kwenye kifaa hiki";
}
async function checkPinLock() {
if (!State.settings.appLockEnabled || !State.settings.appPin)
return true;
return new Promise((resolve) => {
const overlay = document.createElement("div");
overlay.style.cssText = "position:fixed;inset:0;background:#0e1420;z-index:500;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#eef2f8;font-family:sans-serif;";
let pin = "";
overlay.innerHTML = `
      <div style="font-size:40px;margin-bottom:6px;">\uD83D\uDEA8</div>
      <h3 style="margin-bottom:14px;">Weka PIN</h3>
      <div class="pin-dots" id="lock-dots">${"<span class='dot'></span>".repeat(4)}</div>
      <div class="pin-pad" style="margin-top:20px;">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-d="${n}">${n}</button>`).join("")}
        <button data-d="clear">C</button><button data-d="0">0</button><button data-d="back">\u232B</button>
      </div>
      <div id="lock-err" style="color:#e0492f;margin-top:10px;font-size:13px;height:16px;"></div>
    `;
document.body.appendChild(overlay);
const dotsEl = overlay.querySelector("#lock-dots");
const refresh = () => Array.from(dotsEl.children).forEach((d, i) => d.classList.toggle("filled", i < pin.length));
overlay.addEventListener("click", (e) => {
const d = e.target.dataset.d;
if (!d)
return;
if (d === "clear")
pin = "";
else if (d === "back")
pin = pin.slice(0, -1);
else if (pin.length < 4)
pin += d;
refresh();
if (pin.length === 4) {
if (pin === State.settings.appPin) {
overlay.remove();
resolve(true);
}
else {
overlay.querySelector("#lock-err").textContent = "PIN sio sahihi";
pin = "";
refresh();
}
}
});
});
}
function injectNarrativeEditorStyles() {
  if (document.getElementById("narrative-editor-styles")) return;
  const style = document.createElement("style");
  style.id = "narrative-editor-styles";
  style.textContent = `
    #narrative-editor{white-space:pre-wrap;line-height:1.5;font-size:13.5px;}
    #narrative-editor:focus{border-color:var(--accent,#2563eb) !important;border-style:solid !important;}
    @media print{
      #narrative-editor{border:none !important;padding:0 !important;}
      #narrative-edit-status,#act-save-narrative,#act-reset-narrative{display:none !important;}
    }
  `;
  document.head.appendChild(style);
}
async function boot() {
injectNarrativeEditorStyles();
buildShell();
try {
State.settings = await RescueDB.getAllSettings();
}
catch (err) {
console.error("IndexedDB error:", err);
State.settings = {};
setTimeout(() => toast("Hifadhi ya data (IndexedDB) haipatikani kwenye kivinjari hiki. Tumia Chrome au Safari.", "error"), 500);
}
applyTheme();
await checkPinLock();
$$(".sidebar, .bottom-nav").forEach(() => { }); // no-op, kept for clarity
if (!location.hash)
location.hash = "#/dashboard";
render();
if (State.settings.backupReminder) {
const last = State.settings.lastBackupReminderShown;
const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
if (!last || last < dayAgo) {
setTimeout(() => toast("Kumbuka ku-backup taarifa zako (Settings \u2192 Export/Backup)"), 1500);
RescueDB.setSetting("lastBackupReminderShown", Date.now());
}
}
}
document.addEventListener("DOMContentLoaded", boot);
})();
