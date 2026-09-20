"use strict";
/* ================================================================
* 1) db.js
* ================================================================ */
/* db.js
* IndexedDB persistence layer for the Offline Incident & Rescue Report app.
* Stores: reports, photos, trash, settings, auditLogs
* Casualties / witnesses / vehicles / crew / actions / etc. are kept as
* arrays embedded inside each report document (they are always read/written
* together with the report, so embedding avoids extra transactions and keeps
* auto-save atomic). Photos are kept in their own store (binary blobs) keyed
* by incidentId so large binary data never blocks report auto-save.
*/
const DB_NAME = "rescueReportDB";
const DB_VERSION = 2;
let dbPromise = null;
function openDB() {
if (dbPromise)
return dbPromise;
dbPromise = new Promise((resolve, reject) => {
const req = indexedDB.open(DB_NAME, DB_VERSION);
req.onupgradeneeded = (e) => {
const db = e.target.result;
if (!db.objectStoreNames.contains("reports")) {
const store = db.createObjectStore("reports", { keyPath: "incidentId" });
store.createIndex("status", "status", { unique: false });
store.createIndex("createdAt", "createdAt", { unique: false });
store.createIndex("incidentDate", "incident.date", { unique: false });
store.createIndex("reportNumber", "reportNumber", { unique: false });
}
if (!db.objectStoreNames.contains("trash")) {
db.createObjectStore("trash", { keyPath: "incidentId" });
}
if (!db.objectStoreNames.contains("photos")) {
const p = db.createObjectStore("photos", { keyPath: "photoId" });
p.createIndex("incidentId", "incidentId", { unique: false });
}
if (!db.objectStoreNames.contains("settings")) {
db.createObjectStore("settings", { keyPath: "key" });
}
if (!db.objectStoreNames.contains("auditLogs")) {
const a = db.createObjectStore("auditLogs", { keyPath: "id", autoIncrement: true });
a.createIndex("incidentId", "incidentId", { unique: false });
}
};
req.onsuccess = (e) => resolve(e.target.result);
req.onerror = (e) => reject(e.target.error);
});
return dbPromise;
}
function tx(storeNames, mode = "readonly") {
return openDB().then((db) => db.transaction(storeNames, mode));
}
function promisifyRequest(req) {
return new Promise((resolve, reject) => {
req.onsuccess = () => resolve(req.result);
req.onerror = () => reject(req.error);
});
}
const RescueDB = {
async putReport(report) {
const t = await tx(["reports"], "readwrite");
const store = t.objectStore("reports");
await promisifyRequest(store.put(report));
return new Promise((res, rej) => {
t.oncomplete = () => res(report);
t.onerror = () => rej(t.error);
});
},
async getReport(incidentId) {
const t = await tx(["reports"]);
return promisifyRequest(t.objectStore("reports").get(incidentId));
},
async getAllReports() {
const t = await tx(["reports"]);
return promisifyRequest(t.objectStore("reports").getAll());
},
async deleteReportHard(incidentId) {
const t = await tx(["reports"], "readwrite");
t.objectStore("reports").delete(incidentId);
return new Promise((res, rej) => {
t.oncomplete = () => res();
t.onerror = () => rej(t.error);
});
},
async moveToTrash(report) {
const t = await tx(["reports", "trash"], "readwrite");
t.objectStore("reports").delete(report.incidentId);
report.status = "DELETED";
report.deletedAt = new Date().toISOString();
t.objectStore("trash").put(report);
return new Promise((res, rej) => {
t.oncomplete = () => res();
t.onerror = () => rej(t.error);
});
},
async restoreFromTrash(incidentId, newStatus = "DRAFT") {
const t = await tx(["reports", "trash"], "readwrite");
const trashStore = t.objectStore("trash");
const report = await promisifyRequest(trashStore.get(incidentId));
if (report) {
trashStore.delete(incidentId);
report.status = newStatus;
delete report.deletedAt;
t.objectStore("reports").put(report);
}
return new Promise((res, rej) => {
t.oncomplete = () => res(report);
t.onerror = () => rej(t.error);
});
},
async getAllTrash() {
const t = await tx(["trash"]);
return promisifyRequest(t.objectStore("trash").getAll());
},
async purgeTrash() {
const items = await this.getAllTrash();
for (const r of items)
await this.permanentlyDelete(r.incidentId);
},
async permanentlyDelete(incidentId) {
const photos = await this.getPhotosForIncident(incidentId);
const t = await tx(["reports", "trash", "photos"], "readwrite");
t.objectStore("reports").delete(incidentId);
t.objectStore("trash").delete(incidentId);
const photoStore = t.objectStore("photos");
photos.forEach((p) => photoStore.delete(p.photoId));
return new Promise((res, rej) => {
t.oncomplete = () => res();
t.onerror = () => rej(t.error);
t.onabort = () => rej(t.error || new Error("Transaction aborted"));
});
},
async putPhoto(photo) {
const t = await tx(["photos"], "readwrite");
t.objectStore("photos").put(photo);
return new Promise((res, rej) => {
t.oncomplete = () => res(photo);
t.onerror = () => rej(t.error);
});
},
async getPhotosForIncident(incidentId) {
const t = await tx(["photos"]);
const idx = t.objectStore("photos").index("incidentId");
return promisifyRequest(idx.getAll(IDBKeyRange.only(incidentId)));
},
async deletePhoto(photoId) {
const t = await tx(["photos"], "readwrite");
t.objectStore("photos").delete(photoId);
return new Promise((res, rej) => {
t.oncomplete = () => res();
t.onerror = () => rej(t.error);
});
},
async getAllPhotos() {
const t = await tx(["photos"]);
return promisifyRequest(t.objectStore("photos").getAll());
},
async getSetting(key, fallback = null) {
const t = await tx(["settings"]);
const row = await promisifyRequest(t.objectStore("settings").get(key));
return row ? row.value : fallback;
},
async setSetting(key, value) {
const t = await tx(["settings"], "readwrite");
t.objectStore("settings").put({ key, value });
return new Promise((res, rej) => {
t.oncomplete = () => res();
t.onerror = () => rej(t.error);
});
},
async getAllSettings() {
const t = await tx(["settings"]);
const rows = await promisifyRequest(t.objectStore("settings").getAll());
const out = {};
rows.forEach((r) => (out[r.key] = r.value));
return out;
},
async logAction(incidentId, action) {
const t = await tx(["auditLogs"], "readwrite");
t.objectStore("auditLogs").add({
incidentId,
action,
at: new Date().toISOString(),
});
return new Promise((res, rej) => {
t.oncomplete = () => res();
t.onerror = () => rej(t.error);
});
},
async getAuditLog(incidentId) {
const t = await tx(["auditLogs"]);
const idx = t.objectStore("auditLogs").index("incidentId");
return promisifyRequest(idx.getAll(IDBKeyRange.only(incidentId)));
},
async exportFullBackup() {
const [reports, trash, photos, settingsRows] = await Promise.all([
this.getAllReports(),
this.getAllTrash(),
this.getAllPhotos(),
(async () => {
const t = await tx(["settings"]);
return promisifyRequest(t.objectStore("settings").getAll());
})(),
]);
return {
appName: "Offline Incident & Rescue Report",
createdBy: "Herman Sade",
exportedAt: new Date().toISOString(),
version: DB_VERSION,
reports,
trash,
photos,
settings: settingsRows,
};
},
async importFullBackup(data, mode = "keep") {
const t = await tx(["reports", "trash", "photos", "settings"], "readwrite");
const reportsStore = t.objectStore("reports");
const trashStore = t.objectStore("trash");
const photosStore = t.objectStore("photos");
const settingsStore = t.objectStore("settings");
const handleCollection = async (store, rows, keyField) => {
for (const row of rows || []) {
const existing = await promisifyRequest(store.get(row[keyField]));
if (!existing) {
store.put(row);
}
else if (mode === "replace") {
store.put(row);
}
else if (mode === "copy") {
const clone = Object.assign({}, row);
clone[keyField] = row[keyField] + "-copy-" + Date.now();
store.put(clone);
}
}
};
await handleCollection(reportsStore, data.reports, "incidentId");
await handleCollection(trashStore, data.trash, "incidentId");
await handleCollection(photosStore, data.photos, "photoId");
for (const row of data.settings || []) {
settingsStore.put(row);
}
return new Promise((res, rej) => {
t.oncomplete = () => res();
t.onerror = () => rej(t.error);
});
},
};
window.RescueDB = RescueDB;
/* ================================================================
* 2) pdf-lite.js
* ================================================================ */
/* pdf-lite.js \u2014 Kizio (module) cha kutengeneza PDF bila maktaba yoyote ya nje,
* bila CDN, na bila internet. Kinatumia herufi za msingi za PDF (Helvetica,
* fonti ya kawaida inayojumuishwa kwenye kila kisomaji cha PDF) kuandika
* hati ya maandishi (text) yenye kurasa nyingi (A4), vichwa vya habari na
* footer kwenye kila ukurasa.
*
* Haihitaji internet wala server \u2014 inatengeneza Blob ya PDF moja kwa moja
* kwenye kifaa (browser).
*/
(function () {
"use strict";
const PAGE_W = 595.28; // A4 pt
const PAGE_H = 841.89;
const MARGIN = 46;
const FONT_SIZE = 10;
const LINE_HEIGHT = 13.6;
const HEADER_H = 46;
const FOOTER_H = 30;
function toWinAnsi(str) {
let out = "";
for (let i = 0; i < str.length; i++) {
const code = str.charCodeAt(i);
out += code < 256 ? str[i] : "?";
}
return out;
}
function escapePdfString(s) {
return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}
function wrapLine(line, maxChars) {
if (line.length <= maxChars)
return [line];
const words = line.split(" ");
const out = [];
let cur = "";
for (const w of words) {
const candidate = cur ? cur + " " + w : w;
if (candidate.length > maxChars) {
if (cur)
out.push(cur);
if (w.length > maxChars) {
let rest = w;
while (rest.length > maxChars) {
out.push(rest.slice(0, maxChars));
rest = rest.slice(maxChars);
}
cur = rest;
}
else {
cur = w;
}
}
else {
cur = candidate;
}
}
if (cur)
out.push(cur);
return out;
}
function buildLines(bodyText) {
const maxChars = Math.floor((PAGE_W - 2 * MARGIN) / (FONT_SIZE * 0.52));
const rawLines = bodyText.split("\n");
const lines = [];
rawLines.forEach((rl) => {
if (rl.trim() === "") {
lines.push("");
return;
}
wrapLine(rl, maxChars).forEach((l) => lines.push(l));
});
return lines;
}
function paginate(lines) {
const usableH = PAGE_H - MARGIN - HEADER_H - FOOTER_H - MARGIN;
const linesPerPage = Math.max(10, Math.floor(usableH / LINE_HEIGHT));
const pages = [];
for (let i = 0; i < lines.length; i += linesPerPage) {
pages.push(lines.slice(i, i + linesPerPage));
}
if (!pages.length)
pages.push([]);
return pages;
}
function buildContentStream(pageLines, headerText, footerLeft, footerRight) {
let ops = [];
ops.push("BT");
ops.push("/F2 12 Tf");
ops.push(`${MARGIN} ${PAGE_H - MARGIN - 14} Td`);
ops.push(`(${escapePdfString(toWinAnsi(headerText))}) Tj`);
ops.push("ET");
const lineY = PAGE_H - MARGIN - HEADER_H + 8;
ops.push(`${MARGIN} ${lineY} m ${PAGE_W - MARGIN} ${lineY} l S`);
ops.push("BT");
ops.push(`/F1 ${FONT_SIZE} Tf`);
ops.push(`${LINE_HEIGHT} TL`);
ops.push(`${MARGIN} ${PAGE_H - MARGIN - HEADER_H - 6} Td`);
pageLines.forEach((line) => {
ops.push(`(${escapePdfString(toWinAnsi(line))}) Tj`);
ops.push("T*");
});
ops.push("ET");
ops.push("BT");
ops.push("/F1 8 Tf");
ops.push(`${MARGIN} ${MARGIN - 14} Td`);
ops.push(`(${escapePdfString(toWinAnsi(footerLeft))}) Tj`);
ops.push("ET");
ops.push("BT");
ops.push("/F1 8 Tf");
ops.push(`${PAGE_W - MARGIN - footerRight.length * 4.2} ${MARGIN - 14} Td`);
ops.push(`(${escapePdfString(toWinAnsi(footerRight))}) Tj`);
ops.push("ET");
return ops.join("\n");
}
/**
* Tengeneza PDF (Uint8Array) kutoka kwenye maandishi ya kawaida (plain text).
* opts: { headerText, bodyText, footerLeftPrefix }
*/
function generate(opts) {
const headerText = opts.headerText || "";
const bodyText = opts.bodyText || "";
const footerLeftPrefix = opts.footerLeftPrefix || "Created by Herman Sade";
const lines = buildLines(bodyText);
const pages = paginate(lines);
const totalPages = pages.length;
const objects = []; // { num, body } \u2014 tutajaza num baadaye
const pageObjNums = [];
const contentObjNums = [];
const fontRegularNum = 3 + totalPages * 2;
const fontBoldNum = fontRegularNum + 1;
let nextNum = 3;
const pageEntries = [];
pages.forEach((pageLines, idx) => {
const pageNum = nextNum++;
const contentNum = nextNum++;
pageObjNums.push(pageNum);
contentObjNums.push(contentNum);
const footerRight = `Ukurasa ${idx + 1}/${totalPages}`;
const stream = buildContentStream(pageLines, headerText, footerLeftPrefix, footerRight);
pageEntries.push({ pageNum, contentNum, stream });
});
const objStrings = [];
objStrings[1] = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
objStrings[2] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjNums.map((n) => n + " 0 R").join(" ")}] /Count ${totalPages} >>\nendobj\n`;
pageEntries.forEach(({ pageNum, contentNum }) => {
objStrings[pageNum] = `${pageNum} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 ${fontRegularNum} 0 R /F2 ${fontBoldNum} 0 R >> >> /Contents ${contentNum} 0 R >>\nendobj\n`;
});
pageEntries.forEach(({ contentNum, stream }) => {
const bytesLen = new TextEncoder().encode(stream).length;
objStrings[contentNum] = `${contentNum} 0 obj\n<< /Length ${bytesLen} >>\nstream\n${stream}\nendstream\nendobj\n`;
});
objStrings[fontRegularNum] = `${fontRegularNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n`;
objStrings[fontBoldNum] = `${fontBoldNum} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n`;
const totalObjs = fontBoldNum;
const encoder = new TextEncoder();
const chunks = [];
let offset = 0;
const header = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
chunks.push(encoder.encode(header));
offset += chunks[chunks.length - 1].length;
const xrefOffsets = new Array(totalObjs + 1).fill(0);
for (let n = 1; n <= totalObjs; n++) {
xrefOffsets[n] = offset;
const bytes = encoder.encode(objStrings[n]);
chunks.push(bytes);
offset += bytes.length;
}
const xrefStart = offset;
let xref = `xref\n0 ${totalObjs + 1}\n0000000000 65535 f \n`;
for (let n = 1; n <= totalObjs; n++) {
xref += String(xrefOffsets[n]).padStart(10, "0") + " 00000 n \n";
}
chunks.push(encoder.encode(xref));
const trailer = `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
chunks.push(encoder.encode(trailer));
let totalLen = 0;
chunks.forEach((c) => (totalLen += c.length));
const out = new Uint8Array(totalLen);
let pos = 0;
chunks.forEach((c) => { out.set(c, pos); pos += c.length; });
return out;
}
function generateBlob(opts) {
const bytes = generate(opts);
return new Blob([bytes], { type: "application/pdf" });
}
window.PdfLite = { generate, generateBlob };
})();
/* ================================================================
* 3) export.js
* ================================================================ */
/* export.js \u2014 Ripoti (report) formatting, PDF, Copy, Share, Backup/Export
* kwa Offline Incident & Rescue Report. Hakuna maktaba ya nje/CDN \u2014 kila
* kitu kinafanya kazi 100% offline kwenye kifaa.
*/
(function () {
"use strict";
function escapeHtml(s) {
return (s == null ? "" : String(s)).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const V = (x) => (x === undefined || x === null || x === "" ? "-" : String(x));
function downloadBlob(blob, filename) {
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = filename;
document.body.appendChild(a);
a.click();
a.remove();
setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function downloadJSON(data, filename) {
const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
downloadBlob(blob, filename);
}
function downloadTextFile(text, filename) {
const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
downloadBlob(blob, filename);
}
function downloadHTML(innerHtml, filename) {
const full = `<!DOCTYPE html><html lang="sw"><head><meta charset="utf-8"><title>Taarifa ya Tukio</title>
  <style>
    body{font-family:sans-serif;background:#fff;color:#111;padding:26px;font-size:13.5px;line-height:1.6;max-width:720px;margin:0 auto;}
    h2{font-size:16px;text-align:center;margin-bottom:2px;}
    h3{font-size:13px;text-transform:uppercase;border-bottom:1px solid #ccc;padding-bottom:4px;margin:18px 0 8px 0;letter-spacing:.03em;}
    .sub-center{text-align:center;color:#555;font-size:12px;margin-bottom:16px;}
    .narrative-body{white-space:pre-wrap;}
    .photo-grid{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;}
    .photo-grid div{width:120px;}
    .photo-grid img{width:100%;border-radius:4px;border:1px solid #ddd;}
    .footer{text-align:center;color:#999;margin-top:28px;font-size:11px;}
  </style></head><body>${innerHtml}<div class="footer">Incident &amp; Rescue Reporting System<br>Created by Herman Sade</div></body></html>`;
const blob = new Blob([full], { type: "text/html" });
downloadBlob(blob, filename);
}
function csvEscape(v) {
if (v == null)
return "";
const s = String(v).replace(/"/g, '""');
return /[",\n]/.test(s) ? `"${s}"` : s;
}
function downloadReportsCSV(reports) {
const headers = [
"Incident ID", "Report Number", "Status", "Date", "Type", "Region", "District", "Ward",
"Street", "Response Time", "Scene Duration", "Total Duration", "Casualty Count",
"Deaths", "Reporter Name", "Reporter Phone", "Created At", "Updated At",
];
const rows = reports.map((r) => {
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
return [
r.incidentId, r.reportNumber, r.status,
(_a = r.incident) === null || _a === void 0 ? void 0 : _a.date,
(_b = r.incident) === null || _b === void 0 ? void 0 : _b.type,
(_c = r.location) === null || _c === void 0 ? void 0 : _c.region,
(_d = r.location) === null || _d === void 0 ? void 0 : _d.district,
(_e = r.location) === null || _e === void 0 ? void 0 : _e.ward,
(_f = r.location) === null || _f === void 0 ? void 0 : _f.street,
(_g = r.derived) === null || _g === void 0 ? void 0 : _g.responseTime,
(_h = r.derived) === null || _h === void 0 ? void 0 : _h.sceneDuration,
(_j = r.derived) === null || _j === void 0 ? void 0 : _j.totalDuration,
(r.casualties || []).length, (((_k = r.fatality) === null || _k === void 0 ? void 0 : _k.deceased) || []).length,
(_l = r.incident) === null || _l === void 0 ? void 0 : _l.reporterName,
(_m = r.incident) === null || _m === void 0 ? void 0 : _m.reporterPhone,
r.createdAt, r.updatedAt,
];
});
const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n");
const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
downloadBlob(blob, `rescue-reports-${Date.now()}.csv`);
}
function incidentTypeLabel(i) {
if ((i.type === "Ajali nyingine" || i.type === "Tukio jingine") && i.otherType)
return i.otherType;
return V(i.type);
}
function placeLabel(l) {
return [l.street, l.ward, l.landmark].filter(Boolean).join(", ") || "-";
}
function buildNarrativeText(r) {
const i = r.incident || {}, l = r.location || {}, t = r.timeline || {}, d = r.damage || {}, cz = r.cause || {}, ch = r.challenges || {}, cr = r.crew || {}, f = r.fatality || {};
const lines = [];
const P = (s) => lines.push(s);
const blank = () => lines.push("");
P("JAMBO AFANDE.");
blank();
P(`TAARIFA KAMILI YA TUKIO LA ${incidentTypeLabel(i).toUpperCase()} MKOA WA ${V(l.region).toUpperCase()}, WILAYA YA ${V(l.district).toUpperCase()}, MTAA WA ${V(l.street).toUpperCase()}`);
blank();
P(`Leo tarehe ${V(i.date)}, majira ya saa ${V(i.timeReceived)}, kituo cha ${V(cr.station)} tumepokea taarifa kutoka kwa mtoa taarifa ${V(i.reporterName)}, mwenye namba ya simu ${V(i.reporterPhone)}, ametujulisha tukio la ${incidentTypeLabel(i)} lililotokea ${placeLabel(l)}.`);
blank();
const v0 = (r.vehiclesInvolved || [])[0];
if (v0 || cr.driver || cr.shiftLeader) {
P(`Gari lenye namba ${V(v0 && v0.regNo)} aina ya ${V(v0 && v0.type)}, likiendeshwa na ${V(cr.driver)}, limetoka kituoni na kuelekea eneo la tukio likiongozwa na kiongozi wa zamu ${V(cr.shiftLeader)}.`);
blank();
}
P("TAARIFA ZA KIOFISI");
blank();
P(V(r.reportNumber || r.incidentId));
blank();
P("TAARIFA ZA ENEO/ANUANI");
blank();
P(`Mtaa: ${V(l.street)}`);
P(`Kata: ${V(l.ward)}`);
P(`Wilaya: ${V(l.district)}`);
P(`Mkoa: ${V(l.region)}`);
P(`Barabara: ${V(l.road)}`);
P(`Alama ya eneo: ${V(l.landmark)}`);
P(`Maelezo ya eneo: ${V(l.description)}`);
if (l.gps && l.gps.lat)
P(`GPS: ${l.gps.lat}, ${l.gps.lng} (usahihi +-${l.gps.accuracy}m)`);
blank();
P("TAARIFA ZA MUDA");
blank();
P(`Kupokea taarifa saa ${V(t.timeReceived)}`);
P(`Kuondoka kituoni saa ${V(t.timeDeparted)}`);
P(`Kufika eneo la tukio saa ${V(t.timeArrived)}`);
P(`Kuanza kazi saa ${V(t.timeOpStart)}`);
P(`Kumaliza kazi saa ${V(t.timeOpEnd)}`);
P(`Kuondoka eneo la tukio saa ${V(t.timeDepartedScene)}`);
P(`Kufika kituoni saa ${V(t.timeReturned)}`);
if (r.derived) {
P(`Muda wa kuwahi (response time): ${V(r.derived.responseTime)}`);
P(`Muda uliotumika eneo la tukio: ${V(r.derived.sceneDuration)}`);
P(`Muda wote wa operesheni: ${V(r.derived.totalDuration)}`);
}
blank();
P("HATUA ZILIZOCHUKULIWA NA JESHI LA ZIMAMOTO NA UOKOAJI");
blank();
P(V(r.actionsTaken && r.actionsTaken.text));
const checklistOn = Object.entries((r.actionsTaken && r.actionsTaken.checklist) || {}).filter(([, on]) => on).map(([k]) => k);
if (checklistOn.length) {
blank();
P(`Hatua nyingine zilizoainishwa: ${checklistOn.join(", ")}`);
}
blank();
P("CHANZO CHA TUKIO");
blank();
P(V((cz.options || []).join(", ")));
blank();
P(`Maelezo ya ziada: ${V(cz.detail)}`);
blank();
P("TAARIFA ZA ENEO LA TUKIO");
blank();
P(V(l.description));
blank();
P("MAGARI/VITU VILIVYOHUSIKA");
blank();
if ((r.vehiclesInvolved || []).length) {
r.vehiclesInvolved.forEach((v, idx) => {
P(`${idx + 1}. ${V(v.type)} - ${V(v.regNo)} - ${V(v.makeModel)} - ${V(v.color)}`);
P(`   Mmiliki: ${V(v.owner)}`);
P(`   Maelezo: ${V(v.notes)}`);
});
}
else {
P("Hakuna gari/kitu kilichorekodiwa.");
}
blank();
P("TAARIFA ZA MAJERUHI");
blank();
P(`Jumla ya majeruhi: ${(r.casualties || []).length}`);
blank();
if ((r.casualties || []).length) {
r.casualties.forEach((c, idx) => {
P(`${idx + 1}. Jina: ${V(c.name)}`);
P(`   Umri: ${V(c.age)}`);
P(`   Jinsia: ${V(c.sex)}`);
P(`   Hali: ${V(c.condition)}`);
P(`   Aina ya jeraha: ${V(c.injury)}`);
P(`   Huduma ya kwanza: ${V(c.firstAid)}`);
P(`   Hospitali/Kituo: ${V(c.hospital)}`);
P(`   Usafiri: ${V(c.transport)}`);
P(`   Maelezo: ${V(c.notes)}`);
});
}
else {
P("Hakuna majeruhi walioripotiwa.");
}
blank();
P("KIFO");
blank();
if (f.occurred && (f.deceased || []).length) {
P("KIFO KIMETOKEA");
blank();
P(`Jumla ya waliofariki: ${f.deceased.length}`);
blank();
f.deceased.forEach((p, idx) => {
P(`${idx + 1}. Jina: ${V(p.name)}`);
P(`   Umri: ${V(p.age)}`);
P(`   Jinsia: ${V(p.sex)}`);
P(`   Maelezo/Status: ${V(p.status)}`);
P(`   Maelezo mengine: ${V(p.notes)}`);
});
}
else {
P("HAKUNA");
}
blank();
P("HASARA ILIYOTOKEA");
blank();
const damageParts = [d.propertyDamaged, d.vehicleDamage, d.equipmentDamage, d.otherLosses].filter(Boolean);
P(V(d.description || damageParts.join("; ")));
blank();
P(`Makadirio ya hasara: TZS ${V(d.estimatedLoss)}`);
blank();
P("GHARAMA ZILIZOTUMIWA NA JESHI KATIKA TUKIO HILO");
blank();
if ((r.fuel || []).length) {
r.fuel.forEach((fl) => { P(`Mafuta: ${V(fl.fuelType)} - LT ${V(fl.litres)} (${V(fl.regNo)})`); if (fl.otherResources)
P(`Rasilimali nyingine: ${fl.otherResources}`); });
}
else {
P("Mafuta: -");
P("Rasilimali nyingine: -");
}
blank();
P("UMBALI WA KWENDA NA KURUDI ENEO LA TUKIO");
blank();
P("KM -  (haijarekodiwa kwenye fomu)");
blank();
P("VIKOSI/TAASISI NYINGINE VILIVYOSHIRIKI");
blank();
const teamChecks = (r.otherTeams && r.otherTeams.checks) || [];
if (teamChecks.length && !(teamChecks.length === 1 && teamChecks[0] === "None")) {
P(teamChecks.join(", "));
}
else {
P("Hakuna kikosi kingine kilichoshiriki.");
}
((r.otherTeams && r.otherTeams.entries) || []).forEach((e) => {
P(`${V(e.name)}`);
P(`Jukumu: ${V(e.role)}`);
if (e.notes)
P(`Maelezo: ${e.notes}`);
});
blank();
P("SHAHIDI/MAELEZO YA MASHUHUDA");
blank();
if ((r.witnesses || []).length) {
r.witnesses.forEach((w) => {
P(`${V(w.name)} - ${V(w.phone)}`);
P(`Maelezo: ${V(w.statement)}`);
});
}
else {
P("Hakuna shahidi aliyerekodiwa.");
}
blank();
P("CHANGAMOTO");
blank();
const chOpts = (ch.options || []).filter((o) => o !== "None");
if (chOpts.length || ch.text) {
if (chOpts.length)
P(chOpts.join(", "));
if (ch.text)
P(V(ch.text));
}
else {
P("HAKUNA");
}
blank();
P("PICHA ZA TUKIO");
blank();
if ((r.photoIds || []).length) {
r.photoIds.forEach((id, idx) => P(`Picha ${idx + 1}: (ameambatanishwa - angalia PDF/HTML kwa picha halisi)`));
}
else {
P("Hakuna picha zilizoambatanishwa.");
}
blank();
P("TAARIFA ZA ASKARI/CREW");
blank();
P(`Kiongozi wa zamu: ${V(cr.shiftLeader)}`);
P(`Dereva: ${V(cr.driver)}`);
const members = (cr.members || []).map((m) => `${V(m.name)} (${V(m.role)})`).join(", ");
P(`Askari/Crew: ${members || "-"}`);
blank();
P("Naomba kuwasilisha Afande,");
blank();
P(V(cr.shiftLeader));
P(`${V(cr.station)}`);
blank();
P("Created by Herman Sade");
return lines.join("\n");
}
function buildSummaryText(r) {
const i = r.incident || {}, l = r.location || {};
const worstCondition = (r.casualties || []).reduce((worst, c) => {
const order = ["Unknown", "Stable", "Serious", "Critical", "Unconscious"];
if (!c.condition)
return worst;
return order.indexOf(c.condition) > order.indexOf(worst) ? c.condition : worst;
}, "");
const actions = (r.actionsTaken && r.actionsTaken.text) || "";
const lines = [
"INCIDENT & RESCUE REPORT",
"",
`Report ID: ${V(r.reportNumber || r.incidentId)}`,
`Date: ${V(i.date)}`,
`Time: ${V(i.timeReceived)}`,
`Location: ${placeLabel(l)}, ${V(l.district)}, ${V(l.region)}`,
`Incident Type: ${incidentTypeLabel(i)}`,
`Severity: ${V(worstCondition)}`,
`Persons Involved: ${(r.casualties || []).length + (r.witnesses || []).length}`,
`Casualties: ${(r.casualties || []).length}`,
`Rescue Actions: ${V(actions).slice(0, 160)}`,
`Resources Used: ${(r.fuel || []).map((f) => `${V(f.fuelType)} ${V(f.litres)}L`).join(", ") || "-"}`,
`Current Status: ${V(r.status)}`,
`Additional Notes: ${V(r.challenges && r.challenges.text)}`,
"",
"Created by: Herman Sade",
"App: Incident & Rescue Reporting",
];
return lines.join("\n");
}
function buildNarrativeHtml(r, photos) {
const text = buildNarrativeText(r);
let html = `<div class="narrative-body">${escapeHtml(text)}</div>`;
if (photos && photos.length) {
html += `<h3>Picha za Tukio (Attachments)</h3><div class="photo-grid">`;
photos.forEach((p, idx) => {
const url = URL.createObjectURL(p.blob);
html += `<div><img src="${url}"><div style="font-size:10px;color:#555;">Picha ${idx + 1}${p.caption ? ": " + escapeHtml(p.caption) : ""}</div></div>`;
});
html += `</div>`;
}
return html;
}
function generateReportPdfBlob(r) {
const header = `OFFLINE INCIDENT & RESCUE REPORT - ${r.reportNumber || r.incidentId}`;
const body = buildNarrativeText(r);
return window.PdfLite.generateBlob({ headerText: header, bodyText: body, footerLeftPrefix: "Created by Herman Sade" });
}
function downloadReportPdf(r) {
const blob = generateReportPdfBlob(r);
downloadBlob(blob, `${r.reportNumber || r.incidentId}.pdf`);
return blob;
}
async function copyText(text) {
try {
if (navigator.clipboard && navigator.clipboard.writeText) {
await navigator.clipboard.writeText(text);
return true;
}
throw new Error("no-clipboard-api");
}
catch (e) {
const ta = document.createElement("textarea");
ta.value = text;
ta.style.position = "fixed";
ta.style.opacity = "0";
document.body.appendChild(ta);
ta.focus();
ta.select();
let ok = false;
try {
ok = document.execCommand("copy");
}
catch (e2) {
ok = false;
}
ta.remove();
return ok;
}
}
function canNativeShare() {
return typeof navigator.share === "function";
}
function canNativeShareFiles(files) {
return typeof navigator.canShare === "function" && navigator.canShare({ files });
}
async function shareText(title, text) {
if (canNativeShare()) {
try {
await navigator.share({ title, text });
return { ok: true, method: "native" };
}
catch (e) {
if (e && e.name === "AbortError")
return { ok: false, method: "native", cancelled: true };
}
}
const copied = await copyText(text);
return { ok: copied, method: "copy-fallback" };
}
async function sharePdfFile(r) {
const blob = generateReportPdfBlob(r);
const filename = `${r.reportNumber || r.incidentId}.pdf`;
const file = new File([blob], filename, { type: "application/pdf" });
if (canNativeShare() && canNativeShareFiles([file])) {
try {
await navigator.share({ title: "Incident & Rescue Report", text: `Ripoti: ${r.reportNumber || r.incidentId}`, files: [file] });
return { ok: true, method: "native-file" };
}
catch (e) {
if (e && e.name === "AbortError")
return { ok: false, method: "native-file", cancelled: true };
}
}
downloadBlob(blob, filename);
return { ok: true, method: "download-fallback" };
}
function whatsappShare(text) {
window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
}
function mailtoShare(subject, text) {
window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
}
window.RescueExport = {
downloadJSON, downloadHTML, downloadTextFile, downloadReportsCSV,
buildNarrativeText, buildSummaryText, buildNarrativeHtml,
generateReportPdfBlob, downloadReportPdf,
copyText, shareText, sharePdfFile, whatsappShare, mailtoShare,
canNativeShare, canNativeShareFiles,
};
})();
