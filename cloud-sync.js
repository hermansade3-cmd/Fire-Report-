/* cloud-sync.js — Akaunti (Firebase Auth) + Backup ya wingu (Firestore) kwa Rescue Report
 *
 * Inatumika na login.html na script.js. Inahitaji RescueDB (core.js) ipakiwe kabla.
 * Data zote za app (ripoti, picha, settings, n.k.) zinahifadhiwa kwenye:
 *   users/{uid}/meta/manifest   -> orodha ya vitu + hash zake
 *   users/{uid}/items/{id}__{n} -> vitu vyenyewe (vipande visivyozidi ~250KB)
 */
(function (global) {
  "use strict";

  var FIREBASE_VERSION = "10.12.2";
  var firebaseConfig = {
    apiKey: "AIzaSyBWg5KZZVhpaEeg-nVEylIYRDIxmaiK7TQ",
    authDomain: "fire-media-f73ac.firebaseapp.com",
    projectId: "fire-media-f73ac",
    storageBucket: "fire-media-f73ac.firebasestorage.app",
    messagingSenderId: "1027823144494",
    appId: "1:1027823144494:web:b21a24fc4b6f3ec5d259bf",
    measurementId: "G-L3C9EQ3VCZ"
  };
  var SDK_FILES = ["firebase-app-compat.js", "firebase-auth-compat.js", "firebase-firestore-compat.js"];

  var LS_USER = "rescueCloudUser";          // {uid,email} ikiwa mtumiaji ameingia
  var LS_LOCAL = "rescueCloudLocal:";       // + uid  -> vitu vilivyokuwepo kifaani wakati wa sync ya mwisho
  var LS_LAST = "rescueCloudLast:";         // + uid  -> muda wa backup ya mwisho
  var CHUNK = 250000;                       // herufi kwa kipande (Firestore: doc < 1MB)
  var SECRET_KEYS = ["appPin"];             // hazipandishwi wingu
  var VOLATILE = /^(exportedAt|exportDate|exported_at|generatedAt|timestamp)$/;

  var auth = null, db = null, readyPromise = null;
  var statusCbs = [], status = "idle", statusErr = null;
  var timer = null, chain = Promise.resolve();

  /* ---------------- helpers ---------------- */
  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = src; s.async = true;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("sdk-load-failed")); };
      document.head.appendChild(s);
    });
  }

  function init() {
    if (readyPromise) return readyPromise;
    readyPromise = (async function () {
      if (!global.firebase || !global.firebase.firestore) {
        for (var i = 0; i < SDK_FILES.length; i++) {
          await loadScript("https://www.gstatic.com/firebasejs/" + FIREBASE_VERSION + "/" + SDK_FILES[i]);
        }
      }
      var fb = global.firebase;
      if (!fb.apps.length) fb.initializeApp(firebaseConfig);
      auth = fb.auth();
      db = fb.firestore();
      try { db.settings({ experimentalAutoDetectLongPolling: true, merge: true }); } catch (e) { /* tayari imewekwa */ }
      auth.onAuthStateChanged(function (u) {
        if (u) remember(u);
        else localStorage.removeItem(LS_USER);
      });
      return true;
    })().catch(function (e) { readyPromise = null; throw e; });
    return readyPromise;
  }

  function remember(u) {
    try { localStorage.setItem(LS_USER, JSON.stringify({ uid: u.uid, email: u.email })); } catch (e) { }
  }
  function getUser() {
    try { return JSON.parse(localStorage.getItem(LS_USER) || "null"); } catch (e) { return null; }
  }

  function hash(str) {
    var h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36) + "." + str.length.toString(36);
  }

  function safe(s) {
    s = String(s).replace(/[^A-Za-z0-9_.-]/g, "_");
    return s.length > 150 ? s.slice(0, 150) : s;
  }

  function split(s) {
    var out = [], i = 0;
    while (i < s.length) {
      var end = Math.min(i + CHUNK, s.length);
      if (end < s.length) {
        var c = s.charCodeAt(end - 1);
        if (c >= 0xd800 && c <= 0xdbff) end--; // usikate jozi ya emoji katikati
      }
      out.push(s.slice(i, end));
      i = end;
    }
    return out.length ? out : [""];
  }

  function stripSecrets(data) {
    var copy = Object.assign({}, data);
    var s = copy.settings;
    if (Array.isArray(s)) {
      copy.settings = s.filter(function (x) { return !(x && SECRET_KEYS.indexOf(x.key || x.name) >= 0); });
    } else if (s && typeof s === "object") {
      s = Object.assign({}, s);
      SECRET_KEYS.forEach(function (k) { delete s[k]; });
      copy.settings = s;
    }
    return copy;
  }

  function stableScalars(scalars) {
    var o = {};
    Object.keys(scalars).sort().forEach(function (k) { if (!VOLATILE.test(k)) o[k] = scalars[k]; });
    return o;
  }

  function readLocal(uid) {
    try { return JSON.parse(localStorage.getItem(LS_LOCAL + uid) || "{}"); } catch (e) { return {}; }
  }
  function writeLocal(uid, items) {
    var m = {};
    Object.keys(items).forEach(function (b) { m[b] = items[b].h; });
    try { localStorage.setItem(LS_LOCAL + uid, JSON.stringify(m)); } catch (e) { }
  }

  function userDoc(uid) { return db.collection("users").doc(uid); }
  function itemsCol(uid) { return userDoc(uid).collection("items"); }
  function manifestRef(uid) { return userDoc(uid).collection("meta").doc("manifest"); }

  function requireDb() {
    if (!global.RescueDB || typeof global.RescueDB.exportFullBackup !== "function") {
      throw new Error("rescuedb-missing");
    }
  }

  /* ---------------- status ---------------- */
  function setStatus(s, err) {
    status = s; statusErr = err || null;
    statusCbs.forEach(function (cb) { try { cb(s, err); } catch (e) { } });
  }
  function onStatus(cb) { statusCbs.push(cb); try { cb(status, statusErr); } catch (e) { } }
  function getStatus() { return status; }

  /* ---------------- auth ---------------- */
  async function signUp(email, password) {
    await init();
    var cred = await auth.createUserWithEmailAndPassword(email, password);
    remember(cred.user);
    return cred.user;
  }
  async function signIn(email, password) {
    await init();
    var cred = await auth.signInWithEmailAndPassword(email, password);
    remember(cred.user);
    return cred.user;
  }
  async function signOut() {
    await init();
    clearTimeout(timer);
    await auth.signOut();
    localStorage.removeItem(LS_USER);
    setStatus("signedout");
  }
  async function resetPassword(email) {
    await init();
    await auth.sendPasswordResetEmail(email);
  }
  async function currentUser() {
    await init();
    return new Promise(function (resolve) {
      var off = auth.onAuthStateChanged(function (u) { off(); resolve(u); });
    });
  }

  function errorMessage(e) {
    var code = (e && e.code) || (e && e.message) || "";
    var map = {
      "auth/invalid-email": "Barua pepe si sahihi.",
      "auth/missing-email": "Weka barua pepe.",
      "auth/missing-password": "Weka password.",
      "auth/weak-password": "Password iwe na angalau herufi 6.",
      "auth/email-already-in-use": "Barua pepe hii tayari imesajiliwa. Tumia Ingia.",
      "auth/user-not-found": "Hakuna akaunti yenye barua pepe hii. Tumia Jisajili.",
      "auth/wrong-password": "Password si sahihi.",
      "auth/invalid-credential": "Barua pepe au password si sahihi.",
      "auth/invalid-login-credentials": "Barua pepe au password si sahihi.",
      "auth/too-many-requests": "Majaribio mengi sana. Subiri kidogo kisha jaribu tena.",
      "auth/network-request-failed": "Hakuna mtandao. Washa intaneti kisha jaribu tena.",
      "auth/operation-not-allowed": "Email/Password haijawashwa kwenye Firebase (Authentication → Sign-in method).",
      "auth/user-disabled": "Akaunti hii imezimwa.",
      "permission-denied": "Firestore imekataa ruhusa. Weka Firestore Rules zinazoruhusu mmiliki wa akaunti.",
      "unavailable": "Seva haipatikani kwa sasa. Jaribu tena ukiwa na intaneti.",
      "sdk-load-failed": "Imeshindikana kupakia Firebase. Hakikisha una intaneti.",
      "rescuedb-missing": "Hifadhi ya app (RescueDB) haipatikani. Hakikisha core.js imepakiwa."
    };
    for (var k in map) { if (String(code).indexOf(k) >= 0) return map[k]; }
    return "Hitilafu imetokea. Jaribu tena.";
  }

  /* ---------------- backup ---------------- */
  async function collect() {
    requireDb();
    var raw = await global.RescueDB.exportFullBackup();
    var data = stripSecrets(raw || {});
    var items = {}, scalars = {};
    Object.keys(data).forEach(function (k) {
      var v = data[k];
      if (Array.isArray(v)) {
        v.forEach(function (it) {
          var s = JSON.stringify(it);
          var h = hash(s);
          var rawId = null;
          if (it && typeof it === "object") {
            rawId = it.id != null ? it.id : it.incidentId != null ? it.incidentId :
              it.photoId != null ? it.photoId : it.key != null ? it.key : it.name != null ? it.name : null;
          }
          var base = safe(k) + "__" + safe(rawId == null ? "i" + h : rawId);
          if (items[base]) base = base + "~" + safe(h);
          if (items[base]) return; // nakala inayofanana kabisa
          items[base] = { k: k, s: s, h: h };
        });
      } else {
        scalars[k] = v;
      }
    });
    return { items: items, scalars: scalars };
  }

  async function commit(ops) {
    var batch = db.batch(), count = 0, size = 0;
    for (var i = 0; i < ops.length; i++) {
      var op = ops[i];
      if (count >= 400 || (count > 0 && size + op.size > 3000000)) {
        await batch.commit();
        batch = db.batch(); count = 0; size = 0;
      }
      if (op.type === "set") batch.set(op.ref, op.data); else batch.delete(op.ref);
      count++; size += op.size;
    }
    if (count) await batch.commit();
  }

  async function backup() {
    requireDb();
    var u = auth.currentUser;
    if (!u) throw new Error("not-signed-in");
    var c = await collect();
    var mref = manifestRef(u.uid);
    var msnap = await mref.get();
    var M = msnap.exists ? (msnap.data() || {}) : {};
    var R = M.items || {};
    var L = readLocal(u.uid);
    var ops = [], newR = Object.assign({}, R), up = 0, del = 0;

    Object.keys(c.items).forEach(function (b) {
      var it = c.items[b], r = R[b];
      if (r && r.h === it.h) return;
      var parts = split(it.s);
      parts.forEach(function (p, i) {
        ops.push({ type: "set", ref: itemsCol(u.uid).doc(b + "__" + i), data: { b: b, i: i, d: p }, size: p.length });
      });
      if (r && r.n > parts.length) {
        for (var j = parts.length; j < r.n; j++) ops.push({ type: "del", ref: itemsCol(u.uid).doc(b + "__" + j), size: 0 });
      }
      newR[b] = { k: it.k, h: it.h, n: parts.length };
      up++;
    });

    // Futa wingu kile tu kilichokuwepo kifaani wakati wa sync iliyopita na sasa hakipo.
    Object.keys(R).forEach(function (b) {
      if (c.items[b] || !L[b]) return;
      for (var j = 0; j < (R[b].n || 1); j++) ops.push({ type: "del", ref: itemsCol(u.uid).doc(b + "__" + j), size: 0 });
      delete newR[b];
      del++;
    });

    // Kifaa kipya ambacho hakijawahi kusync: usiandike juu ya settings za wingu.
    var keepCloudScalars = msnap.exists && localStorage.getItem(LS_LOCAL + u.uid) === null;
    var scalarsStr = keepCloudScalars ? (M.scalars || "{}") : JSON.stringify(c.scalars);
    var sh = keepCloudScalars ? (M.sh || "") : hash(JSON.stringify(stableScalars(c.scalars)));
    if (up || del || M.sh !== sh || !msnap.exists) {
      await commit(ops);
      await mref.set({
        items: newR,
        scalars: scalarsStr,
        sh: sh,
        count: Object.keys(newR).length,
        updatedAt: global.firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    writeLocal(u.uid, c.items);
    try { localStorage.setItem(LS_LAST + u.uid, String(Date.now())); } catch (e) { }
    return { uploaded: up, deleted: del, total: Object.keys(c.items).length };
  }

  function enqueue(fn) {
    var p = chain.then(fn);
    chain = p.catch(function () { });
    return p;
  }

  function backupNow() {
    return enqueue(async function () {
      await init();
      var u = await currentUser();
      if (!u) throw new Error("not-signed-in");
      setStatus("syncing");
      try {
        var r = await backup();
        setStatus("ok");
        return r;
      } catch (e) {
        setStatus("error", e);
        throw e;
      }
    });
  }

  function scheduleBackup(delay) {
    if (!getUser()) return;
    clearTimeout(timer);
    setStatus("pending");
    timer = setTimeout(function () {
      if (!navigator.onLine) { setStatus("offline"); return; }
      backupNow().catch(function (e) { console.warn("Cloud backup:", e); });
    }, delay == null ? 20000 : delay);
  }

  /* ---------------- restore ---------------- */
  async function cloudInfo() {
    await init();
    var u = await currentUser();
    if (!u) return null;
    var snap = await manifestRef(u.uid).get();
    if (!snap.exists) return { exists: false, count: 0, reports: 0, updatedAt: null };
    var M = snap.data() || {}, items = M.items || {}, reports = 0;
    Object.keys(items).forEach(function (b) { if (items[b].k === "reports") reports++; });
    var t = M.updatedAt && M.updatedAt.toDate ? M.updatedAt.toDate() : null;
    return { exists: true, count: Object.keys(items).length, reports: reports, updatedAt: t };
  }

  function restore(mode) {
    return enqueue(async function () {
      await init();
      requireDb();
      var u = await currentUser();
      if (!u) throw new Error("not-signed-in");
      var msnap = await manifestRef(u.uid).get();
      if (!msnap.exists) return { restored: false, count: 0, bad: 0 };
      var M = msnap.data() || {}, mItems = M.items || {};
      var snap = await itemsCol(u.uid).get();
      var parts = {};
      snap.forEach(function (d) { var x = d.data(); (parts[x.b] = parts[x.b] || [])[x.i] = x.d; });
      var data = {};
      try { data = JSON.parse(M.scalars || "{}"); } catch (e) { data = {}; }
      var bad = 0, ok = 0;
      Object.keys(mItems).forEach(function (b) {
        var m = mItems[b], arr = parts[b], good = !!arr && arr.length >= m.n;
        for (var i = 0; good && i < m.n; i++) { if (arr[i] == null) good = false; }
        if (!good) { bad++; return; }
        try {
          (data[m.k] = data[m.k] || []).push(JSON.parse(arr.slice(0, m.n).join("")));
          ok++;
        } catch (e) { bad++; }
      });
      await global.RescueDB.importFullBackup(data, mode || "keep");
      var c = await collect();
      writeLocal(u.uid, c.items);
      return { restored: true, count: ok, bad: bad };
    });
  }

  function lastSync() {
    var u = getUser();
    var t = u ? Number(localStorage.getItem(LS_LAST + u.uid) || 0) : 0;
    return t ? new Date(t) : null;
  }

  global.CloudSync = {
    init: init, signUp: signUp, signIn: signIn, signOut: signOut, resetPassword: resetPassword,
    currentUser: currentUser, getUser: getUser, errorMessage: errorMessage,
    backupNow: backupNow, scheduleBackup: scheduleBackup, restore: restore, cloudInfo: cloudInfo,
    onStatus: onStatus, getStatus: getStatus, lastSync: lastSync,
    _t: { hash: hash, split: split, collect: collect, backup: backup, setAuth: function (a, d) { auth = a; db = d; } }
  };
})(window);
