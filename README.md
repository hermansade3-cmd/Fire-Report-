# 🚨 Offline Incident & Rescue Report

Programu ya kuandika na kuhifadhi ripoti za matukio na uokoaji (moto, ajali, uokoaji) inayofanya kazi **bila internet**. Data zote zinahifadhiwa kwenye kifaa chako. Hakuna seva wala maktaba za nje (CDN).

Imetengenezwa na **Herman Sade**.

---

## ✨ Uwezo wa Programu

- **Dashboard** — muhtasari wa ripoti zote, drafti, zilizokamilika, archived, za leo na za mwezi huu.
- **Ripoti** — kuandika ripoti hatua kwa hatua, na hali zake: `DRAFT`, `IN_PROGRESS`, `COMPLETED`, `ARCHIVED`.
- **Auto-Save** — ripoti huhifadhiwa yenyewe wakati unaandika.
- **Tafuta** na **Takwimu** — kutafuta ripoti na kuona takwimu.
- **Archive** — kuhifadhi ripoti zilizokamilika.
- **Trash** — ripoti iliyofutwa huenda Trash kwanza. Unaweza kuirejesha (Restore) au kuifuta kabisa.
- **Password ya Kufuta** — ulinzi wa ziada kabla ya kufuta ripoti.
- **PDF, Copy na Share** — kutengeneza PDF bila maktaba ya nje, kunakili ripoti, na kutuma kupitia WhatsApp, barua pepe au Share ya simu.
- **Export / Backup** — kuhamisha data zote (ripoti, picha, settings) kwenda faili moja na kuzirudisha kwenye kifaa kingine.
- **Settings** — jina la kituo, mkoa, wilaya, chombo cha kawaida, muundo wa namba ya ripoti, Dark Mode na muda wa Auto-Save.
- **Link ya SadeBooks** — kipande cha 📚 SadeBooks juu ya Archive, Trash na Settings.

---

## 📁 Muundo wa Faili

```
rescue-report/
├── index.html   → Muundo wa ukurasa (HTML tu)
├── style.css    → Mtindo wote wa programu (CSS)
├── script.js    → JavaScript yote ya programu
└── README.md    → Maelezo haya
```

Faili zote tatu lazima ziwe kwenye **folda moja**.

### Kilichomo ndani ya `script.js`

Sehemu nne zimeunganishwa kwa mpangilio huu, na kila moja ina kichwa cha maelezo:

| # | Sehemu | Kazi |
|---|--------|------|
| 1 | `db.js` | Hifadhi ya IndexedDB (`RescueDB`): reports, photos, trash, settings, auditLogs |
| 2 | `pdf-lite.js` | Kutengeneza PDF bila maktaba ya nje |
| 3 | `export.js` | Muundo wa ripoti, PDF, Copy, Share, Backup |
| 4 | `app.js` | Programu kuu: routes, skrini, fomu, nav, boot |

> Mpangilio huu ni muhimu: `db.js` lazima iwe kwanza kwa sababu sehemu zingine zinaitegemea.

---

## 🚀 Jinsi ya Kuendesha

**Njia ya haraka:** fungua `index.html` kwenye kivinjari.

**Njia bora (inashauriwa):** tumia seva ya ndani kwa sababu baadhi ya vivinjari huzuia IndexedDB kwenye `file://`.

```bash
# Kwa Python
python3 -m http.server 8080

# Kisha fungua
http://localhost:8080
```

Ili kuiweka mtandaoni, pakia faili zote tatu kwenye hosting yoyote ya static (GitHub Pages, Netlify n.k.).

---

## 🔗 Kubadilisha Link ya SadeBooks

Link imewekwa juu ya `script.js`, karibu na `buildShell()`:

```js
const SADEBOOKS_URL = "https://hermansade3-cmd.github.io/sadebooks/";
```

Badilisha anwani hapo tu. Mwonekano wake uko kwenye `style.css`, sehemu ya `.books-link`.

- **Simu:** kipande kiko juu ya bar ya chini (Home, Reports, New, Archive, Trash, Settings).
- **Kompyuta:** kipo kwenye menyu ya pembeni, juu ya vitufe vya menyu.
- Inafunguka kwenye tab mpya, kwa hiyo mtumiaji hapotezi ripoti anayoandika.
- Link hii **inahitaji internet**. Programu yenyewe inaendelea kufanya kazi offline.

---

## 💾 Kuhusu Data

- Data zinahifadhiwa kwenye **IndexedDB ya kivinjari** cha kifaa husika. Hazipo kwenye seva.
- Ukifuta data ya kivinjari (clear site data) au ukibadilisha kifaa, data zitapotea **isipokuwa** ukiwa na backup.
- Tumia **Export/Backup** mara kwa mara na uhifadhi faili mahali salama.

---

## 🛠️ Kuhariri Programu

| Unataka kubadilisha | Faili |
|---------------------|-------|
| Rangi, ukubwa, muonekano | `style.css` |
| Rangi kuu na vipimo vya nav | `:root { ... }` juu ya `style.css` |
| Skrini, fomu, vitufe vya nav | `script.js` (sehemu ya `app.js`) |
| Hifadhi ya data | `script.js` (sehemu ya `db.js`) |
| Muundo wa PDF na ripoti | `script.js` (sehemu za `pdf-lite.js` na `export.js`) |
| Title, icon, meta tags | `index.html` |

Baada ya kubadilisha `script.js`, unaweza kuangalia makosa ya syntax kwa:

```bash
node --check script.js
```

---

## 📝 Vidokezo

- Faili hii haina `service-worker.js` wala `manifest.json`. Ukitaka programu ifunguke bila internet baada ya kuipakia mtandaoni, hivyo viwili vinahitajika.
- Hifadhi ya IndexedDB ni ya kila kifaa na kila kivinjari, kwa hiyo data ya Chrome haionekani kwenye Firefox.

---

**Created by Herman Sade** · Kiswahili & English
