/* ================================================================
 * settings.js  —  Theme + Settings Store (Independent, Single File)
 * ----------------------------------------------------------------
 * Faili MOJA inayojumuisha:
 *   1. Theme Engine   (dark/light mode kwa mafaili YOTE)
 *   2. Settings Store (mipangilio yote ya app)
 *
 * Inajitegemea: haitegemei db.js, script.js, wala CDN yoyote.
 * Inatumia localStorage kama hifadhi kuu (cross-file bridge).
 *
 * API:
 *   Settings.get(key)                       -> thamani
 *   Settings.set(key, value)                -> Promise
 *   Settings.all()                          -> snapshot yote
 *   Settings.onChange(cb)                   -> sikiliza mabadiliko
 *
 *   Settings.getTheme()                     -> "dark" | "light"
 *   Settings.setTheme("light")              -> Promise
 *   Settings.toggleTheme()                  -> Promise
 *   Settings.applyTheme()                   -> Promise (tumia iliyohifadhiwa)
 *
 *   Settings.hashSecret("123456")           -> Promise<string>
 *   Settings.setDeletePassword("123456")    -> Promise
 *   Settings.verifyDeletePassword("123456") -> Promise<boolean>
 * ================================================================ */
(function () {
  "use strict";

  /* ============================================================
   * 1) CONSTANTS
   * ============================================================ */
  const SETTINGS_KEY = "rescue_settings";
  const THEME_KEY = "rescue_theme";
  const DEFAULT_THEME = "dark";

  const DEFAULTS = {
    defaultStation: "",
    defaultRegion: "",
    defaultDistrict: "",
    defaultVehicle: "",
    reportNumberFormat: "RPT-{YYYY}{MM}{DD}-{SEQ}",
    theme: DEFAULT_THEME,
    autoSaveInterval: 600,
    backupReminder: false,
    lastBackupReminderShown: 0,
    appLockEnabled: false,
    appPin: "",
    hideSensitiveInList: false,
    deletePasswordHash: "",
  };

  /* ============================================================
   * 2) STATE + LISTENERS
   * ============================================================ */
  let cache = null;
  const listeners = [];

  /* ============================================================
   * 3) STORAGE HELPERS
   * ============================================================ */
  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }
  function safeSet(key, val) {
    try { localStorage.setItem(key, val); return true; } catch (e) { return false; }
  }

  function load() {
    if (cache) return cache;
    let parsed = {};
    try {
      const raw = safeGet(SETTINGS_KEY);
      parsed = raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn("settings.js: parse failed, using defaults", e);
      parsed = {};
    }
    cache = Object.assign({}, DEFAULTS, parsed);

    // Theme inaishi kwenye key yake mwenyewe (inaendana na THEME_KEY)
    const theme = safeGet(THEME_KEY);
    if (theme === "light" || theme === "dark") {
      cache.theme = theme;
    } else {
      // Hakuna theme iliyohifadhiwa — hifadhi default
      safeSet(THEME_KEY, cache.theme);
    }
    return cache;
  }

  function persist() {
    safeSet(SETTINGS_KEY, JSON.stringify(cache));
    notify();
  }

  function notify() {
    const snapshot = all();
    listeners.forEach(function (cb) {
      try { cb(snapshot); } catch (e) { console.error(e); }
    });
  }

  /* ============================================================
   * 4) THEME ENGINE
   * ============================================================ */
  function getTheme() {
    load();
    return cache.theme === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    const t = (theme === "light" || theme === "dark") ? theme : getTheme();
    document.documentElement.setAttribute("data-theme", t);

    // Meta theme-color kwa mobile browsers
    let meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.name = "theme-color";
      document.head.appendChild(meta);
    }
    meta.content = t === "light" ? "#ffffff" : "#0e1420";

    // Body classes kwa CSS hooks
    if (document.body) {
      document.body.classList.toggle("theme-light", t === "light");
      document.body.classList.toggle("theme-dark", t === "dark");
    }
    return t;
  }

  function setTheme(theme) {
    const t = theme === "light" ? "light" : "dark";
    load();
    cache.theme = t;
    safeSet(THEME_KEY, t);
    persist();
    applyTheme(t);
    return t;
  }

  function toggleTheme() {
    return setTheme(getTheme() === "light" ? "dark" : "light");
  }

  /* ============================================================
   * 5) SETTINGS API
   * ============================================================ */
  function get(key) {
    load();
    return cache[key];
  }

  function all() {
    load();
    return Object.assign({}, cache);
  }

  function set(key, value) {
    load();
    cache[key] = value;

    if (key === "theme") {
      return Promise.resolve(setTheme(value));
    }
    persist();
    return Promise.resolve(value);
  }

  function onChange(cb) {
    if (typeof cb === "function") listeners.push(cb);
  }

  /* ============================================================
   * 6) CROSS-TAB / CROSS-FILE SYNC
   * ============================================================ */
  window.addEventListener("storage", function (e) {
    if (e.key === SETTINGS_KEY) {
      cache = null;
      load();
      notify();
    } else if (e.key === THEME_KEY) {
      cache = null;
      load();
      applyTheme();
      notify();
    }
  });

  // Wakati ukurasa unarudi kuwa visible, hakikisha theme ni sahihi
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") {
      // Re-load theme tu (si settings zote) ili kuepuka flash
      const theme = safeGet(THEME_KEY);
      if (theme === "light" || theme === "dark") {
        document.documentElement.setAttribute("data-theme", theme);
      }
    }
  });

  /* ============================================================
   * 7) PASSWORD HASHING (kwa delete password)
   * ============================================================ */
  async function hashSecret(value) {
    const data = new TextEncoder().encode(String(value));
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map(function (b) { return b.toString(16).padStart(2, "0"); })
      .join("");
  }

  async function setDeletePassword(plain) {
    if (!plain || plain.length < 6 || !/^\d+$/.test(plain)) {
      throw new Error("Password iwe na angalau tarakimu 6.");
    }
    const hash = await hashSecret(plain);
    await set("deletePasswordHash", hash);
    return hash;
  }

  async function verifyDeletePassword(plain) {
    const hash = get("deletePasswordHash");
    if (!plain || !hash) return false;
    return (await hashSecret(plain)) === hash;
  }

  /* ============================================================
   * 8) INIT
   * ============================================================ */
  function init() {
    load();
    applyTheme(); // tumia theme iliyohifadhiwa mara moja
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ============================================================
   * 9) EXPOSE GLOBAL
   * ============================================================ */
  window.Settings = {
    // Settings API
    get: get,
    set: set,
    all: all,
    onChange: onChange,

    // Theme API
    getTheme: getTheme,
    setTheme: setTheme,
    toggleTheme: toggleTheme,
    applyTheme: applyTheme,

    // Password helpers
    hashSecret: hashSecret,
    setDeletePassword: setDeletePassword,
    verifyDeletePassword: verifyDeletePassword,

    // Constants
    SETTINGS_KEY: SETTINGS_KEY,
    THEME_KEY: THEME_KEY,
    DEFAULTS: DEFAULTS,
  };
})();
