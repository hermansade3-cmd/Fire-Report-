"use strict";
/* script.js \u2014 Offline Incident & Rescue Report
 * Msimbo wote wa JavaScript umeunganishwa hapa kwa mpangilio huu:
 *   1) db.js       \u2014 IndexedDB (RescueDB)
 *   2) pdf-lite.js \u2014 Kizio cha PDF bila maktaba za nje
 *   3) export.js   \u2014 Ripoti, PDF, Copy, Share, Backup
 *   4) app.js      \u2014 Programu kuu (SPA, routes, UI)
 * Created by Herman Sade */
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
    // ---------- Reports ----------
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
    // ---------- Trash ----------
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
    // Permanently remove a trashed report and all of its photos.
    // This is intentionally separate from moveToTrash so normal Delete is reversible.
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
    // ---------- Photos ----------
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
    // ---------- Settings ----------
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
    // ---------- Audit ----------
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
    // ---------- Full backup / restore ----------
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
        // mode: "keep" (skip if exists), "replace" (overwrite), "copy" (new id)
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
                // mode === "keep": do nothing, existing wins
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
        // Msingi wa Helvetica hauna Unicode kamili; badilisha herufi zisizo za
        // Kilatini na alama za kawaida (WinAnsi inashughulikia Kiswahili vizuri
        // kwa sababu haitumii alama maalum nje ya alfabeti ya Kilatini).
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
    // Kadiria upana wa herufi kwa Helvetica (wastani) ili tuvunje mistari vizuri
    // bila kuhitaji font-metrics kamili.
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
                // neno refu kuliko mstari mzima: likate kwa nguvu
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
        // mstari mdogo chini ya kichwa
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
        // 1: Catalog, 2: Pages \u2014 tutaziweka mwishoni baada ya kujua idadi ya kurasa
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
        // Jenga faili kama Uint8Array ukihesabu offsets sahihi kwa byte.
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
    // =================================================================
    // TAARIFA KAMILI (muundo wa "JAMBO AFANDE") - inatumika kwa
    // Copy Report, Export PDF, Share Report, View Report na Print Report
    // =================================================================
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
    // Muhtasari mfupi (kwa WhatsApp/Share Summary Only)
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
    // =================================================================
    // PDF (inatengenezwa moja kwa moja kwenye kifaa - js/pdf-lite.js)
    // =================================================================
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
    // =================================================================
    // COPY, SHARE, WHATSAPP, EMAIL
    // =================================================================
    async function copyText(text) {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
            throw new Error("no-clipboard-api");
        }
        catch (e) {
            // mbadala (fallback) kwa vivinjari vya zamani
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
                // itaanguka kwenye fallback hapa chini
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
        // Fallback: pakua PDF kisha mwambie mtumiaji aishare mwenyewe
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
/* ================================================================
 * 4) app.js
 * ================================================================ */
/* app.js \u2014 Offline Incident & Rescue Report
 * Vanilla JS SPA. No build step, no external CDN. All state persisted via
 * RescueDB (IndexedDB, see db.js). Route state lives in location.hash.
 */
(function () {
    "use strict";
    // ---------------------------------------------------------------
    // Utilities
    // ---------------------------------------------------------------
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
    // Parse "HH:MM" (today) into minutes-of-day; returns null if invalid
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
    // ---------------------------------------------------------------
    // Toasts
    // ---------------------------------------------------------------
    function toast(msg, kind) {
        const host = $("#toast-host");
        const el = document.createElement("div");
        el.className = "toast" + (kind ? " " + kind : "");
        el.textContent = msg;
        host.appendChild(el);
        setTimeout(() => el.remove(), 2600);
    }
    // ---------------------------------------------------------------
    // App State
    // ---------------------------------------------------------------
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
    // ---------------------------------------------------------------
    // Persistence: auto-save with debounce + immediate flush
    // ---------------------------------------------------------------
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
    // ---------------------------------------------------------------
    // Router
    // ---------------------------------------------------------------
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
    // ---------------------------------------------------------------
    // DASHBOARD
    // ---------------------------------------------------------------
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
        // On the report list, show a friendly title instead of the internal INC-... ID.
        // The incidentId is still kept internally for navigation/data integrity.
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
    // ---------------------------------------------------------------
    // REPORT LIST (drafts/completed/archived/all)
    // ---------------------------------------------------------------
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
    // ---------------------------------------------------------------
    // SEARCH
    // ---------------------------------------------------------------
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
    // ---------------------------------------------------------------
    // STATISTICS
    // ---------------------------------------------------------------
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
    // ---------------------------------------------------------------
    // TRASH
    // ---------------------------------------------------------------
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
    // ---------------------------------------------------------------
    // BACKUP / EXPORT (settings-adjacent page)
    // ---------------------------------------------------------------
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
    // ---------------------------------------------------------------
    // SETTINGS
    // ---------------------------------------------------------------
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
    // ---------------------------------------------------------------
    // NEW / EDIT REPORT FLOW
    // ---------------------------------------------------------------
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
    // ---- Step: Incident (Section A) ----
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
    // ---- Step: Location ----
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
    // ---- Step: Timeline ----
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
    // ---- Step: Vehicles / Objects ----
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
    // ---- Step: Casualties ----
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
    // ---- Step: Fatality ----
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
    // ---- Step: Witnesses ----
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
    // ---- Step: Actions Taken ----
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
    // ---- Step: Cause ----
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
    // ---- Step: Damage ----
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
    // ---- Step: Fuel / Resources ----
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
    // ---- Step: Other Teams ----
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
    // ---- Step: Challenges ----
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
    // ---- Step: Photos ----
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
    // ---- Step: Crew ----
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
    // ---- Step: Review ----
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
              
