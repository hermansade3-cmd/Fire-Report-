/**
 * FIRE-SAFETY-KNOWLEDGE.JS  —  faili MOJA kamili
 * ----------------------------------------------
 * Weka faili hili LIMOJA kwenye repo yako (mfano: fire-safety-knowledge.js)
 * kisha lilete kwenye index.html kabla ya incident-ai.js:
 *
 *   <script src="fire-safety-knowledge.js"></script>
 *   <script src="incident-ai.js"></script>
 *
 * Faili hili linatoa object moja ya kimataifa: `window.FireSafetyKB`
 * yenye kila kitu: taarifa za usalama wa moto (records), injini ya
 * utafutaji (search), na kazi ya kutengeneza jibu tayari kwa mtumiaji
 * (getAnswer) — bila kuhitaji seva/backend nyingine kwa matumizi ya
 * msingi. Hii inafanya kazi VIZURI kwenye GitHub Pages (static) kwa
 * majibu ya moja kwa moja kutoka kwenye maarifa (bila AI model ya nje).
 *
 * Ukitaka baadaye kuunganisha na LLM (mfano Claude) kwa majibu
 * yanayotengenezwa zaidi kiasili, tumia `FireSafetyKB.buildPrompt()`
 * kutengeneza maandishi ya kutuma kwa seva yako ya nyuma (backend) —
 * usiweke API key ndani ya faili hili au kwenye ukurasa wa umma.
 *
 * MUHIMU KUHUSU USIRI: Faili hili ni la umma likiwa kwenye GitHub Pages
 * (kama .js yoyote ya static site). Kama unataka maarifa haya yasionekane
 * kabisa na mtu yeyote anayeangalia chanzo cha ukurasa (view-source),
 * yanahitaji kuhamishwa kwenye database binafsi (mfano Supabase na Row
 * Level Security) inayofikiwa na seva ya nyuma pekee — muulize kama
 * unataka toleo hilo pia.
 */
(function (global) {
  "use strict";

  // ---- 1. MAARIFA (records) ------------------------------------------
  const RECORDS = [
  {
    "id": "FS-001",
    "category": "Fire Basics",
    "subcategory": "Fire Triangle",
    "topic": "What is fire and the fire triangle",
    "question": "What is fire and what makes it burn?",
    "keywords_en": [
      "what is fire",
      "fire triangle",
      "fire tetrahedron",
      "heat fuel oxygen",
      "combustion"
    ],
    "keywords_sw": [
      "moto ni nini",
      "pembetatu ya moto",
      "joto mafuta oksijeni",
      "mwako"
    ],
    "answer": "Moto ni mmenyuko wa kikemikali (mwako) unaohitaji vitu vitatu kwa wakati mmoja, vinavyojulikana kama pembetatu ya moto: joto, mafuta, na oksijeni. Kipengele cha nne, mmenyuko wa mnyororo wa kemikali usiokatika, hukamilisha \"fire tetrahedron\". Kuondoa kimoja kati ya vitu hivi kunaweza kusimamisha moto — huu ndio msingi wa njia zote za kuzima moto (kupoza, kuzuia oksijeni, kuondoa mafuta, au kukatiza mmenyuko wa kemikali).",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Kuelewa pembetatu ya moto kunakusaidia kuchagua hatua sahihi: poza kwa maji pale ni salama, zuia oksijeni, ondoa mafuta, au tumia dawa ya kemikali kukatiza mmenyuko.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "low",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-002",
    "category": "Fire Basics",
    "subcategory": "Fire Behavior",
    "topic": "How fire spreads",
    "question": "How does fire spread inside a building?",
    "keywords_en": [
      "fire spread",
      "fire behavior",
      "flashover",
      "fire growth"
    ],
    "keywords_sw": [
      "moto unavyoenea",
      "tabia ya moto",
      "kuenea kwa moto jengoni"
    ],
    "answer": "Moto huenea kwa mguso wa moja kwa moja wa miali, joto la mionzi (radiant heat), convection (moshi na hewa ya moto ikipanda na kusafiri jengoni), na conduction kupitia vifaa. Katika maeneo yaliyofungwa, joto na moshi vinaweza kujaa kwa kasi na kusababisha \"flashover\" — mwako wa ghafla, wa karibu wakati mmoja, wa kila kitu chumbani. Ndiyo sababu kutoka mapema, kabla moshi na joto havijajaa, ni jambo muhimu sana.",
    "safety_warning": "Flashover inaweza kutokea ndani ya dakika chache kwenye chumba kidogo kilichofungwa. Usisubiri kukusanya vitu — toka mara moja.",
    "when_not_to_attempt": null,
    "recommended_action": "Toka mara moja mara moto ukithibitishwa; usisubiri kupima jinsi utakavyokuwa mkubwa.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-010",
    "category": "Fire Classes",
    "subcategory": "Classification",
    "topic": "Fire classes overview",
    "question": "What are the different classes/types of fire?",
    "keywords_en": [
      "fire classes",
      "class a fire",
      "class b fire",
      "class c fire",
      "class d fire",
      "class f fire",
      "class k fire",
      "types of fire"
    ],
    "keywords_sw": [
      "madaraja ya moto",
      "aina za moto"
    ],
    "answer": "Moto kwa kawaida hugawanywa kulingana na kinachowaka: vitu vigumu vya kawaida kama mbao, karatasi na nguo; vimiminika vinavyoweza kuwaka kama petroli, rangi na solvent; gesi zinazoweza kuwaka kama LPG na methane; moto unaohusisha vifaa vya umeme vilivyo hai; mafuta ya kupikia; na metali zinazoweza kuwaka. Herufi za madaraja na rangi za vizima moto hutofautiana kati ya viwango (mfano mfumo wa NFPA wa Marekani dhidi ya mfumo wa Ulaya/ISO), hivyo angalia daima lebo ya kizima moto chenyewe na kanuni za eneo lako badala ya kudhani mfumo mmoja unatumika kila mahali.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Tambua kinachowaka kabla ya kuchagua njia ya kuzima, kwa sababu njia isiyofaa (mfano maji kwenye mafuta yanayowaka au kwenye umeme ulio hai) inaweza kuufanya moto kuwa mbaya zaidi.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "high",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-020",
    "category": "Water",
    "subcategory": "Water extinguishers",
    "topic": "What is a water fire extinguisher used for?",
    "question": "water extinguisher, water fire extinguisher",
    "keywords_en": [
      "water extinguisher",
      "water fire extinguisher",
      "class a extinguisher"
    ],
    "keywords_sw": [
      "kizima moto cha maji"
    ],
    "answer": "Vizima moto vya maji hupoza vitu vigumu vya kawaida (mbao, karatasi, nguo, plastiki nyingi) chini ya joto lake la kuwaka. Hufanya kazi kwa kuondoa joto.",
    "safety_warning": "Usitumie kwenye moto wa mafuta/grisi, moto wa vimiminika vinavyoweza kuwaka, au moto wowote karibu na umeme ulio hai — unaweza kusababisha kurushwa kwa nguvu kwa kimiminika, kusambaza moto, au mshtuko wa umeme.",
    "when_not_to_attempt": "Usitumie kwenye moto wa vimiminika vinavyoweza kuwaka, moto wa mafuta ya kupikia, au moto wowote karibu na vifaa vya umeme vilivyo hai.",
    "recommended_action": "Tumia tu kwenye moto wa vitu vigumu vya kawaida (mbao, karatasi, nguo) ambapo eneo si karibu na vifaa vya umeme vilivyo hai.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-021",
    "category": "Foam",
    "subcategory": "Foam extinguishers",
    "topic": "What is a foam fire extinguisher used for?",
    "question": "foam extinguisher, afff extinguisher",
    "keywords_en": [
      "foam extinguisher",
      "afff extinguisher"
    ],
    "keywords_sw": [
      "kizima moto cha povu"
    ],
    "answer": "Vizima moto vya povu (foam) hufunika moto kwa blanketi ya povu, kukata oksijeni. Vinafanya kazi vizuri kwenye vitu vigumu vya kawaida na kwenye moto mingi ya vimiminika vinavyoweza kuwaka kwa sababu povu huelea juu ya kimiminika na kuzuia mvuke.",
    "safety_warning": "Kwa kawaida havifai kwa moto unaohusisha vifaa vya umeme vilivyo hai (povu lina maji na huongoza umeme) au kwa moto wa mafuta ya kupikia.",
    "when_not_to_attempt": "Usitumie kwenye vifaa vya umeme vilivyo hai au kwenye moto wa mafuta ya kupikia yanayochemka.",
    "recommended_action": "Tumia kwa mtindo wa kufagia kwenye msingi wa moto, ukiruhusu povu likusanyike na kufunika uso unaowaka.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-022",
    "category": "Dry Powder",
    "subcategory": "Dry chemical / dry powder extinguishers",
    "topic": "What is a dry powder fire extinguisher used for?",
    "question": "dry powder extinguisher, dry chemical extinguisher, abc powder extinguisher",
    "keywords_en": [
      "dry powder extinguisher",
      "dry chemical extinguisher",
      "abc powder extinguisher"
    ],
    "keywords_sw": [
      "kizima moto cha unga"
    ],
    "answer": "Vizima moto vya unga (dry powder/dry chemical) hukatiza mmenyuko wa mnyororo wa kemikali na vinaweza pia kufunika maeneo madogo ya mafuta. Aina za unga za matumizi mengi (ABC) zinaweza kutumika kwenye vitu vigumu vya kawaida, vimiminika vinavyoweza kuwaka, na baadhi ya moto wa umeme ukiwa umezimwa chanzo cha nguvu.",
    "safety_warning": "Unga unaweza kuzuia mwonekano na haufai vizuri kwenye nafasi ndogo zilizofungwa au karibu na vifaa vya kielektroniki vyembamba. Kwa kawaida hauondoi joto kwenye mafuta, hivyo kuwaka tena kunawezekana. Epuka matumizi ya muda mrefu kwenye vyumba vidogo visivyo na hewa; epuka kwenye vifaa vya kielektroniki dhaifu kama kuna njia mbadala.",
    "when_not_to_attempt": "Epuka kutumia kwenye nafasi ndogo, zisizo na hewa ya kutosha, au karibu na vifaa vya kielektroniki dhaifu kama kizima moto mbadala kipo.",
    "recommended_action": "Elekeza kwenye msingi wa miali na fagia kutoka upande mmoja kwenda mwingine; angalia dalili za moto kurudi.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-023",
    "category": "CO2",
    "subcategory": "Carbon dioxide (CO2) extinguishers",
    "topic": "What is a CO2 fire extinguisher used for?",
    "question": "co2 extinguisher, carbon dioxide extinguisher",
    "keywords_en": [
      "co2 extinguisher",
      "carbon dioxide extinguisher"
    ],
    "keywords_sw": [
      "kizima moto cha co2"
    ],
    "answer": "Vizima moto vya CO2 huondoa oksijeni karibu na moto na vinafaa vizuri kwa moto unaohusisha vifaa vya umeme vilivyo hai kwa sababu CO2 haiachi mabaki na haiongozi umeme.",
    "safety_warning": "CO2 inaweza kupunguza oksijeni ya kupumua karibu na eneo hilo, hasa kwenye nafasi ndogo zilizofungwa; pia mdomo wa kutolea (discharge horn) huwa baridi sana. Usitumie kwenye vyumba vidogo sana, visivyo na hewa ya kutosha bila kuhakikisha unaweza kutoka mara moja; epuka ngozi yako kugusa mdomo wa kutolea.",
    "when_not_to_attempt": "Epuka kutumia kwenye vyumba vidogo sana, visivyo na hewa ya kutosha, isipokuwa unaweza kutoka mara moja baada ya kutumia.",
    "recommended_action": "Elekeza kwenye msingi wa moto na hakikisha una njia wazi ya kutoka; peperusha hewa eneo hilo baadaye.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-024",
    "category": "Wet Chemical",
    "subcategory": "Wet chemical extinguishers for cooking fires",
    "topic": "What is a wet chemical fire extinguisher used for?",
    "question": "wet chemical extinguisher, kitchen extinguisher",
    "keywords_en": [
      "wet chemical extinguisher",
      "kitchen extinguisher"
    ],
    "keywords_sw": [
      "kizima moto cha kemikali maji kwa jikoni"
    ],
    "answer": "Vizima moto vya kemikali maji (wet chemical) vimeundwa mahususi kwa moto wa mafuta ya kupikia na mafuta ya wanyama. Huunda safu ya sabuni (saponification) juu ya mafuta yanayowaka inayopoza na kuzuia oksijeni. Hii ndiyo aina inayopendekezwa kwa moto wa friji za kukaangia na mafuta ya kupikia; aina nyingine za vizima moto hazifanyi kazi vizuri au ni hatari kwenye mafuta yanayowaka.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Tumia taratibu na kwa umbali salama ukifuata maelekezo ya kizima moto, kwa sababu moto wa mafuta unaweza kuwaka zaidi ukisumbuliwa mara ya kwanza.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-030",
    "category": "Firefighting",
    "subcategory": "Extinguisher Use",
    "topic": "How to use a fire extinguisher (basic procedure)",
    "question": "How do I use a fire extinguisher?",
    "keywords_en": [
      "how to use a fire extinguisher",
      "operate extinguisher",
      "paas technique"
    ],
    "keywords_sw": [
      "jinsi ya kutumia kizima moto"
    ],
    "answer": "Utaratibu wa msingi unaokubalika: (1) tathmini kama moto ni mdogo na unadhibitika; (2) toa taarifa/onya wengine; (3) hakikisha una njia wazi ya kutoroka nyuma yako; (4) chagua kizima moto sahihi kwa kinachowaka; (5) simama umbali salama; (6) elekeza kwenye msingi wa moto, bonyeza kishikizo, na fagia kutoka upande mmoja kwenda mwingine; (7) angalia dalili za moto kurudi na uwe tayari kurudi nyuma; (8) kama moto haujibu haraka au unakua, toka mara moja na funga mlango nyuma yako ikiwa inawezekana; (9) piga simu huduma za dharura.",
    "safety_warning": "Jaribu hili tu kwenye moto mdogo, uliodhibitika, ukiwa na njia wazi ya kutoroka. Ukiwa na wasiwasi, toka badala ya kupambana na moto.",
    "when_not_to_attempt": "Usijaribu kama moto ni mkubwa, unasambaa kwa kasi, unatoa moshi mzito, unazuia njia yako pekee ya kutoka, au wewe hujafunzwa au huna uhakika jinsi kizima moto kinavyofanya kazi.",
    "recommended_action": "Simama na toka mara moja kama moto haujazimika ndani ya sekunde chache za matumizi sahihi, au hali ikawa si salama.",
    "emergency_action": "Piga simu Zimamoto/Fire & Rescue mara moja kama moto haujazimika haraka au ni mkubwa kuliko kiwango kidogo kinachodhibitika.",
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "high",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-040",
    "category": "Fire Prevention",
    "subcategory": "Residential",
    "topic": "Home fire prevention",
    "question": "How can I prevent fires at home?",
    "keywords_en": [
      "home fire prevention",
      "house fire prevention",
      "residential fire safety"
    ],
    "keywords_sw": [
      "kuzuia moto nyumbani"
    ],
    "answer": "Hatua za kawaida za kuzuia moto nyumbani: usiache upishi bila kusimamia; weka vitu vinavyoweza kuwaka mbali na majiko na hita; epuka kuzidisha vifaa vingi kwenye soketi moja; kagua nyaya na vifaa mara kwa mara; tumia vifaa vya umeme vilivyoidhinishwa; hifadhi mafuta na mitungi ya gesi kwa usalama na wima kwenye maeneo yenye hewa ya kutosha mbali na chanzo cha moto; weka mechi/lighters mbali na watoto; funga na jaribu smoke alarm; weka kizima moto cha msingi kilicho karibu; kuwa na mpango wa kutoroka na kujua njia zako za karibu za kutoka.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Fanya ukaguzi rahisi wa usalama wa nyumba mara kwa mara: soketi, nyaya, tabia za jikoni, muunganisho wa gesi, na njia wazi za kutoroka.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-041",
    "category": "Fire Prevention",
    "subcategory": "Workplace",
    "topic": "Workplace/office fire prevention",
    "question": "How can a workplace or office prevent fires?",
    "keywords_en": [
      "workplace fire prevention",
      "office fire safety"
    ],
    "keywords_sw": [
      "kuzuia moto ofisini/kazini"
    ],
    "answer": "Sehemu za kazi zinapaswa kudumisha njia na milango ya kutoroka iliyo wazi, kuhudumia mifumo ya umeme na vifaa mara kwa mara, kudhibiti uhifadhi wa vitu vinavyoweza kuwaka na taka (usafi mzuri), kuweka taratibu salama za kazi za moto (hot work), kufundisha wafanyakazi na kuteua walinzi wa moto, kukagua vizima moto na kuviweka karibu, kufanya mazoezi ya moto mara kwa mara, na kudumisha mpango ulioandikwa wa uokoaji wa dharura.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Weka jukumu la usalama wa moto kwa mtu mmoja (mlinzi/afisa wa moto), kagua vifaa kwa ratiba, na fanya mazoezi kwa wafanyakazi mara kwa mara.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-042",
    "category": "Fire Prevention",
    "subcategory": "Kitchens & Restaurants",
    "topic": "Kitchen and restaurant fire prevention",
    "question": "How can a kitchen or restaurant prevent fires?",
    "keywords_en": [
      "kitchen fire prevention",
      "restaurant fire safety"
    ],
    "keywords_sw": [
      "kuzuia moto jikoni/mkahawani"
    ],
    "answer": "Usiache mafuta yanayochemka au jiko linalowaka bila kusimamia; weka kifuniko karibu kufunika moto mdogo wa sufuria; weka vitu vinavyoweza kuwaka (vitambaa, vifungashio) mbali na majiko; safisha mrundikano wa mafuta kwenye nyuso na mifumo ya kutoa hewa mara kwa mara; weka kizima moto cha kemikali maji au blanketi la moto karibu; hakikisha hewa ya kutosha.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Kaa karibu na mafuta ya kupikia wakati wote; kama lazima uende mbali, zima jiko kwanza.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-043",
    "category": "Fire Prevention",
    "subcategory": "Warehouses & Factories",
    "topic": "Warehouse and factory fire prevention",
    "question": "How can a warehouse or factory reduce fire risk?",
    "keywords_en": [
      "warehouse fire safety",
      "factory fire prevention"
    ],
    "keywords_sw": [
      "kuzuia moto ghalani/kiwandani"
    ],
    "answer": "Dhibiti uhifadhi wa vitu vinavyoweza kuwaka kwa mgawanyo na hewa ya kutosha; dumisha njia na milango ya kutoka iliyo wazi; hudumia mifumo ya umeme na mashine; dhibiti kazi za moto (kulehemu/kukata) kwa vibali; dumisha mifumo ya kugundua na kuzima moto; fundisha wafanyakazi na fanya mazoezi; weka taarifa za mawasiliano ya dharura zionekane wazi.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Fuata mfumo wa vibali vya kazi za moto ulioandikwa na ratiba ya kawaida ya matengenezo ya vifaa.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-044",
    "category": "Fire Prevention",
    "subcategory": "Construction Sites",
    "topic": "Construction site fire prevention",
    "question": "How can a construction site prevent fires?",
    "keywords_en": [
      "construction site fire safety"
    ],
    "keywords_sw": [
      "kuzuia moto eneo la ujenzi"
    ],
    "answer": "Dhibiti vyanzo vya moto (kulehemu, kukata, umeme wa muda) mbali na vitu vinavyoweza kuwaka; hifadhi mafuta na mitungi ya gesi kwa usalama; weka eneo la ujenzi safi bila mrundikano wa uchafu; weka vizima moto vinavyofikika; elekeza wafanyakazi kuhusu taratibu za dharura na maeneo ya kukusanyikia.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Tumia mfumo wa vibali vya kazi za moto na weka kizima moto karibu na shughuli yoyote ya kazi za moto.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-050",
    "category": "Electrical",
    "subcategory": "Electrical Fires",
    "topic": "Can I use water on an electrical fire?",
    "question": "Can I use water to extinguish an electrical fire?",
    "keywords_en": [
      "water on electrical fire",
      "electrical fire water"
    ],
    "keywords_sw": [
      "maji kwenye moto wa umeme"
    ],
    "answer": "Hapana. Maji huongoza umeme na yanaweza kusababisha mshtuko mkali wa umeme au kifo kwa mshtuko wa umeme ikitumiwa kwenye moto unaohusisha vifaa vilivyo hai. Ikiwa ni salama, zima chanzo cha umeme kwanza; kisha tumia kizima moto cha CO2 au unga kilichokadiriwa kwa moto wa umeme. Kama nguvu haiwezi kutenganishwa kwa usalama, toka na piga simu huduma za dharura.",
    "safety_warning": "Kamwe usimwage maji kwenye moto unaohusisha vifaa vya umeme vilivyo hai.",
    "when_not_to_attempt": "Usijaribu kuzima kama hauwezi kufikia sehemu ya kutenganisha nguvu kwa usalama, au kuna dalili za mionzi ya umeme (arcing) au vifaa ni vya voltage kubwa.",
    "recommended_action": "Ikiwa ni salama, zima chanzo cha nguvu kwenye breaker/isolator, kisha tumia kizima moto cha CO2 au unga. La sivyo, toka.",
    "emergency_action": "Piga simu huduma za dharura mara moja kama moto unahusisha vifaa vya voltage kubwa au hauwezi kutenganisha nguvu kwa usalama.",
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "high",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-051",
    "category": "Electrical",
    "subcategory": "Causes",
    "topic": "Common electrical fire causes",
    "question": "What commonly causes electrical fires?",
    "keywords_en": [
      "electrical fire causes",
      "overloaded socket",
      "faulty wiring"
    ],
    "keywords_sw": [
      "chanzo cha moto wa umeme"
    ],
    "answer": "Vyanzo vya kawaida ni pamoja na soketi na nyaya za ziada zilizozidishwa mzigo, nyaya zilizoharibika au za zamani, vifaa vibovu, muunganisho legelege, chaja zinazopashwa moto zikiwa bado zimeunganishwa, jenereta zilizoharibika, na betri zinazopashwa moto (ikiwemo betri za simu/sola).",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Kagua nyaya na soketi mara kwa mara, epuka kuunganisha nyaya za ziada mfululizo, na tenganisha chaja/vifaa visivyotumika.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-052",
    "category": "Electrical",
    "subcategory": "Generators & Solar",
    "topic": "Generator, battery and solar system fire safety",
    "question": "How do I reduce fire risk from generators, batteries or solar systems?",
    "keywords_en": [
      "generator fire safety",
      "battery fire safety",
      "solar system fire"
    ],
    "keywords_sw": [
      "usalama wa jenereta/betri/sola dhidi ya moto"
    ],
    "answer": "Weka jenereta na hewa ya kutosha mbali na vitu vinavyoweza kuwaka; kamwe usiongeze mafuta kwenye jenereta iliyo moto; hakikisha betri na mifumo ya sola vinawekwa na kukaguliwa na mafundi wenye ujuzi; angalia dalili za kuvimba, kupashwa moto kupindukia, au harufu isiyo ya kawaida kutoka betri na acha kuzitumia mara moja dalili hizo zikitokea.",
    "safety_warning": "Betri za lithium zilizovimba au zinazopashwa moto zinaweza kuwaka ghafla na ni ngumu kuzima kwa maji.",
    "when_not_to_attempt": null,
    "recommended_action": "Kama betri inapashwa moto au kuvimba, isogeze mbali na vitu vinavyoweza kuwaka kama ni salama na ifuatilie; ikiwaka, ichukulie kama moto wa umeme/kemikali na toka kama unakua.",
    "emergency_action": "Piga simu huduma za dharura kama moto wa betri unatoa moshi mzito au unakua.",
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-060",
    "category": "Cooking Fires",
    "subcategory": "Oil/Grease Fires",
    "topic": "Can I use water on a cooking-oil fire?",
    "question": "Can I use water to put out a cooking-oil or grease fire?",
    "keywords_en": [
      "water on oil fire",
      "cooking oil fire water",
      "grease fire water",
      "deep fryer fire"
    ],
    "keywords_sw": [
      "maji kwenye moto wa mafuta ya kupikia",
      "moto wa mafuta jikoni"
    ],
    "answer": "Hapana — kamwe usimwage maji kwenye mafuta au grisi yanayowaka. Maji ni mazito zaidi kuliko mafuta ya moto na hubadilika mvuke papo hapo, ambayo inaweza kurusha mafuta yanayowaka kwa nguvu, kusambaza moto na kusababisha kuungua kikali. Badala yake: zima chanzo cha joto kama ni salama, na fukiza moto kwa kuweka kifuniko cha chuma au blanketi la moto juu ya sufuria kwa uangalifu, au tumia kizima moto cha kemikali maji kilichoundwa kwa moto wa mafuta ya kupikia. Kamwe usisogeze sufuria inayowaka.",
    "safety_warning": "KAMWE usitumie maji kwenye mafuta au grisi inayowaka katika hali yoyote.",
    "when_not_to_attempt": "Usijaribu kama moto tayari ni mkubwa, umesambaa nje ya sufuria, au hauwezi kufikia vidhibiti vya jiko kwa usalama.",
    "recommended_action": "Zima joto kama ni salama, funika sufuria na kifuniko au blanketi la moto, na iache imefunikwa bila kusumbuliwa mpaka ipoe kabisa. Tumia kizima moto cha kemikali maji kama unacho na umefundishwa kukitumia.",
    "emergency_action": "Kama moto umesambaa nje ya sufuria au unatoa moshi mzito, toka na piga simu huduma za dharura mara moja.",
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "high",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-061",
    "category": "Cooking Fires",
    "subcategory": "Kitchen Safety",
    "topic": "What extinguisher should be used for a kitchen fire?",
    "question": "Which fire extinguisher should be used for a cooking-oil fire?",
    "keywords_en": [
      "extinguisher for oil fire",
      "kitchen fire extinguisher choice"
    ],
    "keywords_sw": [
      "kizima moto gani kwa moto wa jikoni"
    ],
    "answer": "Kizima moto cha kemikali maji (wet chemical) kimeundwa mahususi kwa moto wa mafuta ya kupikia na mafuta ya wanyama, na ndicho chaguo linalopendekezwa. Blanketi la moto pia linafaa kwa moto mdogo wa sufuria. Maji, na kwa kawaida povu, havipaswi kutumika kwenye moto wa mafuta yanayochemka.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Weka kizima moto cha kemikali maji au blanketi la moto ndani au karibu na jikoni na jifunze jinsi ya kukitumia kabla dharura haijatokea.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "high",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-062",
    "category": "Cooking Fires",
    "subcategory": "Unattended Cooking",
    "topic": "Unattended cooking risk",
    "question": "Why is unattended cooking dangerous?",
    "keywords_en": [
      "unattended cooking fire risk"
    ],
    "keywords_sw": [
      "kupika bila kusimamia"
    ],
    "answer": "Kupika bila kusimamia, hasa kwa mafuta, ni moja ya sababu kubwa za moto wa nyumbani na mikahawa. Mafuta yaliyoachwa kwenye joto kali yanaweza kufikia kiwango chake cha kuwaka ndani ya dakika chache bila mtu wa kuona au kujibu.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Kamwe usiache jiko bila kusimamia wakati mafuta au grisi inapashwa; kama lazima uende mbali, zima joto kwanza.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-070",
    "category": "LPG/Gas",
    "subcategory": "Cylinder Fire",
    "topic": "What to do if a gas cylinder catches fire",
    "question": "What should I do if a gas cylinder catches fire?",
    "keywords_en": [
      "gas cylinder fire",
      "lpg cylinder fire",
      "cylinder catches fire"
    ],
    "keywords_sw": [
      "mtungi wa gesi umeshika moto"
    ],
    "answer": "Kama mtungi wa gesi umeshika moto na unaweza kufikia bomba (valve) kwa usalama na haraka bila kujiweka karibu na miali au joto, kufunga valve kunaweza kusimamisha mtiririko wa mafuta na kuzima moto. Kama hauwezi kufikia kwa usalama, au moto tayari umejiimarisha na unakua, usikaribie — toka eneo hilo mara moja hadi umbali salama, waondoe wengine mbali, na piga simu huduma za dharura. Uvujaji wa gesi unaowaka mara nyingi ni salama zaidi ukiachwa ukiwaka chini ya udhibiti wa kitaalamu kuliko kuzimwa kwa njia inayoruhusu gesi isiyowaka kujikusanya na kuwaka tena kwa mlipuko.",
    "safety_warning": "Usijaribu kusogeza mtungi unaowaka au unaovuja. Usinyunyize maji moja kwa moja kwenye valve ya mtungi unaowaka wenye shinikizo. Kaa mbali sana kama hauwezi kufikia sehemu ya kuzima kwa usalama.",
    "when_not_to_attempt": "Usikaribie kama kuna uharibifu unaoonekana wa mtungi, kubadilika rangi/kuvimba (dalili ya kupashwa moto kupindukia), sauti ya kuzomea/kunguruma, au kama miali ni mikubwa au mtungi upo mahali finyu.",
    "recommended_action": "Toka hadi umbali salama, waondoe watazamaji na vyanzo vyovyote vya moto mbali, na poza mitungi/miundo iliyo karibu kutoka umbali salama kwa maji kama wataalamu bado hawajafika na inaweza kufanyika bila kukaribia mtungi unaowaka.",
    "emergency_action": "Piga simu Zimamoto/Fire & Rescue mara moja kwa moto wowote wa mtungi wa gesi — hii inapaswa daima kuhusisha waokozi wa kitaalamu.",
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "high",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-071",
    "category": "LPG/Gas",
    "subcategory": "Gas Leak",
    "topic": "What to do if you smell gas / suspect an LPG leak",
    "question": "What should I do if I smell gas or suspect a gas leak?",
    "keywords_en": [
      "gas leak smell",
      "lpg leak",
      "smell of gas"
    ],
    "keywords_sw": [
      "harufu ya gesi",
      "uvujaji wa gesi"
    ],
    "answer": "Usibofye swichi zozote za umeme, taa, au vifaa kuzima au kuwasha (hii inaweza kutoa cheche). Usiwashe mechi, lighters, au moto wazi. Zima usambazaji wa gesi kwenye mtungi/valve kama unaweza kufanya hivyo kwa haraka na usalama. Fungua milango na madirisha kupitisha hewa kama ni salama. Toka eneo hilo na uwaondoe wengine wote. Piga simu huduma za dharura ukiwa nje, mbali na uvujaji.",
    "safety_warning": "Cheche yoyote karibu na uvujaji wa gesi inaweza kusababisha mlipuko — epuka vyanzo vyote vya moto ikiwemo swichi za umeme.",
    "when_not_to_attempt": "Usijaribu kutafuta chanzo cha uvujaji ukitumia moto wazi.",
    "recommended_action": "Pitisha hewa kama ni salama, zima usambazaji kama ni salama, na toka.",
    "emergency_action": "Piga simu Zimamoto/huduma za dharura mara moja ukiwa mahali salama.",
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "high",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-080",
    "category": "Evacuation",
    "subcategory": "General Procedure",
    "topic": "How to evacuate during a fire",
    "question": "How should I evacuate a building during a fire?",
    "keywords_en": [
      "fire evacuation",
      "how to evacuate"
    ],
    "keywords_sw": [
      "jinsi ya kutoka wakati wa moto"
    ],
    "answer": "Toa taarifa mara moja ili wengine wafahamu. Tumia njia ya karibu salama ya dharura — kamwe usitumie lifti wakati wa moto, kwani zinaweza kuharibika au kufunguka kwenye ghorofa inayowaka. Songa kwa utulivu lakini kwa haraka hadi eneo la kukusanyikia lililowekwa la jengo lako. Kama kuna moshi, kaa chini ambapo mwonekano na hewa kwa kawaida ni bora. Wasaidie watu walio hatarini zaidi (watoto, wazee, watu wenye ulemavu) kama unaweza kufanya hivyo bila kujiweka wewe mwenyewe hatarini. Ukiwa nje, usiingie tena jengoni mpaka uruhusiwe rasmi na wafanyakazi wa Zimamoto/Fire & Rescue.",
    "safety_warning": "Kamwe usitumie lifti wakati wa kutoka kwa dharura ya moto.",
    "when_not_to_attempt": null,
    "recommended_action": "Fuata njia za uokoaji zilizowekwa alama za jengo lako hadi eneo la kukusanyikia lililowekwa na subiri hapo mpaka hesabu/kibali rasmi kitolewe.",
    "emergency_action": "Piga simu huduma za dharura haraka iwezekanavyo kama bado hazijapigiwa.",
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "high",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-081",
    "category": "Evacuation",
    "subcategory": "Assembly & Headcount",
    "topic": "Assembly points and accounting for people",
    "question": "Why are assembly points and headcounts important during evacuation?",
    "keywords_en": [
      "assembly point",
      "headcount fire evacuation"
    ],
    "keywords_sw": [
      "eneo la kukusanyikia",
      "kuhesabu watu baada ya moto"
    ],
    "answer": "Eneo la kukusanyikia lililowekwa huwawezesha waokozi kuthibitisha haraka kama kila mtu ametoka salama, na huwazuia walioondoka kutoka eneo la hatari na kutozuia njia za timu za zimamoto zinazokabili tukio.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Nenda moja kwa moja eneo la kukusanyikia na ripoti mtu yeyote aliyekosekana kwa wafanyakazi wa Zimamoto au mlinzi wa moto mara moja — usijaribu kumtafuta wewe mwenyewe.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-090",
    "category": "Smoke Safety",
    "subcategory": "Smoke Hazards",
    "topic": "Dangers of smoke and how to move through it",
    "question": "What should I do if there is heavy smoke?",
    "keywords_en": [
      "heavy smoke",
      "smoke safety",
      "smoke inhalation"
    ],
    "keywords_sw": [
      "moshi mzito",
      "usalama wa moshi"
    ],
    "answer": "Moshi una gesi za sumu na hupunguza mwonekano na hewa ya kupumua; kuvuta moshi ni chanzo kikuu cha vifo vya moto, mara nyingi kabla miali kumfikia mtu. Kama kuna moshi, kaa chini karibu na sakafu ambapo hewa kwa kawaida ni safi zaidi na baridi zaidi, funika pua na mdomo wako na kitambaa kama inawezekana, na songa kuelekea njia ya karibu ya kutoka ukitumia ukuta kukuelekeza kama mwonekano ni mbaya sana. Kabla ya kufungua mlango wowote, angalia kama unahisi joto — kama ndiyo, tumia njia nyingine.",
    "safety_warning": "Usisimame wima kwenye moshi mzito; usijaribu kukimbia kupitia moshi mzito bila kufunika njia yako ya hewa.",
    "when_not_to_attempt": "Usifungue mlango unaohisi joto ukiugusa — tumia njia mbadala ya kutoka.",
    "recommended_action": "Songa chini na kwa kasi kuelekea njia ya karibu ya kutoka inayojulikana kuwa salama; usisimame kukusanya vitu.",
    "emergency_action": "Piga simu huduma za dharura ukiwa umetoka salama.",
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "high",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-100",
    "category": "Rescue",
    "subcategory": "Trapped Occupants",
    "topic": "What to do if someone is trapped inside a burning building",
    "question": "What should I do if someone is trapped inside a burning building?",
    "keywords_en": [
      "someone trapped fire",
      "trapped inside burning building",
      "rescue trapped person"
    ],
    "keywords_sw": [
      "mtu amenaswa ndani ya jengo linalowaka"
    ],
    "answer": "Usiingie jengo linalowaka kufanya uokoaji isipokuwa umefunzwa na una vifaa vya kuzima moto/uokoaji — majaribio mengi ya uokoaji wa raia yanasababisha majeruhi zaidi. Piga simu huduma za Zimamoto/Fire & Rescue mara moja ukitoa eneo halisi na idadi ya watu walionaswa. Kama unaweza kuwasiliana kwa usalama na mtu aliyenaswa kutoka nje (kwa simu au kupiga kelele), mshauri akae chini, afunike njia yake ya hewa, azibe nafasi chini ya mlango kwa kitambaa kama moshi unaingia, na aonyeshe mahali alipo kwenye dirisha kama inawezekana, wakati akisubiri waokozi wa kitaalamu.",
    "safety_warning": "Usiingie muundo unaowaka bila mafunzo, vifaa vya kujikinga, na msaada wa timu — hii inaongeza kwa kiasi kikubwa hatari ya majeraha au kifo kwa mwokoaji na mtu aliyenaswa.",
    "when_not_to_attempt": "Usijaribu kuingia kama hauna mafunzo ya moto, vifaa vya kujikinga, au kama hali inahusisha moshi mzito, muundo usio thabiti, au joto kali.",
    "recommended_action": "Piga simu Zimamoto mara moja ukitoa maelezo sahihi ya eneo; mwongoze mtu aliyenaswa kwa simu/sauti kama inawezekana kuelekea chumba salama zaidi chenye mlango uliozibwa na ishara kwenye dirisha.",
    "emergency_action": "Hii ni dharura daima — piga simu Zimamoto/huduma za dharura mara moja.",
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "high",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-101",
    "category": "Rescue",
    "subcategory": "Vulnerable People",
    "topic": "Assisting children, elderly, or people with disabilities during a fire",
    "question": "How do I help vulnerable people evacuate during a fire?",
    "keywords_en": [
      "evacuating elderly",
      "evacuating disabled person",
      "children fire evacuation"
    ],
    "keywords_sw": [
      "kuwasaidia watoto/wazee/walemavu kutoka"
    ],
    "answer": "Wasaidie tu kama unaweza kufanya hivyo bila kujiweka wewe mwenyewe hatarini kwa kiasi kikubwa. Waongoze au wabebe wale wasioweza kusonga kwa kasi kuelekea njia ya karibu salama ya kutoka, ukikaa chini kama kuna moshi. Kama mtu hawezi kusogezwa kwa usalama kabla hali kuwa hatari, msogeze chumba chenye mlango unaoweza kuzibwa, karibu na dirisha, na mjulishe Zimamoto mahali pake halisi mara moja.",
    "safety_warning": null,
    "when_not_to_attempt": "Usijaribu kumbeba mtu kupitia moshi mzito au miali kama itawaweka nyote wawili hatarini kwa kiasi kikubwa — pa kipaumbele kuwajulisha waokozi mahali walipo badala yake.",
    "recommended_action": "Waongoze kwenye njia ya karibu ya kutoka kama ni salama; la sivyo wapatie hifadhi karibu na dirisha na uwaonyeshe kuomba msaada.",
    "emergency_action": "Wajulishe Zimamoto mahali halisi pa mtu yeyote asiyeweza kuokolewa.",
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "high",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-110",
    "category": "Fire Response",
    "subcategory": "First Response",
    "topic": "What to do first when you discover a fire",
    "question": "What is the first thing I should do when I discover a fire?",
    "keywords_en": [
      "first response to fire",
      "what to do when fire starts",
      "discover a fire"
    ],
    "keywords_sw": [
      "cha kwanza cha kufanya ukiona moto"
    ],
    "answer": "1) Toa taarifa ili wengine walio karibu wafahamu. 2) Hakikisha kila mtu anaanza kutoka. 3) Piga simu Zimamoto/huduma za dharura, ukitoa eneo na maelezo wazi. 4) Kama moto ni mdogo tu, una vifaa vinavyofaa, umefunzwa, na una njia wazi ya kutoroka, fikiria kutumia kizima moto — vinginevyo toka na waachie wataalamu washughulikie.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Onya, toka, piga simu kuomba msaada — jaribu kuzima moto tu chini ya hali salama, zenye kikomo.",
    "emergency_action": "Piga simu Zimamoto/huduma za dharura kama hatua yako ya kawaida kwa moto wowote unaozidi mwali mdogo unaodhibitika mara moja.",
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "high",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-120",
    "category": "Fire Investigation",
    "subcategory": "Education",
    "topic": "Basics of fire origin and cause investigation",
    "question": "How is the cause of a fire generally investigated?",
    "keywords_en": [
      "fire investigation",
      "fire cause",
      "fire origin evidence"
    ],
    "keywords_sw": [
      "uchunguzi wa chanzo cha moto"
    ],
    "answer": "Uchunguzi wa moto ni fani maalum. Wachunguzi kwa kawaida huchunguza mifumo ya uchomaji kusaidia kupata eneo la asili, kutafuta vyanzo vya kuwasha, kuandika tukio kwa picha na maelezo kabla kitu chochote hakijasumbuliwa, kuhoji mashahidi, na kuhifadhi ushahidi wa kimwili (kama vipengele vya umeme vilivyoharibika) kwa uchambuzi zaidi. Hitimisho kuhusu chanzo na wajibu vinahitaji wachunguzi waliofunzwa na ukaguzi kamili wa ushahidi — hitimisho lolote la haraka au la awali halipaswi kuchukuliwa kama la mwisho.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Hifadhi eneo kadri inavyowezekana mpaka wachunguzi wafike; epuka kusogeza au kusafisha uchafu.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-130",
    "category": "Fire Inspection",
    "subcategory": "Checklist",
    "topic": "What is checked during a fire-safety inspection",
    "question": "What should be checked during a fire-safety inspection?",
    "keywords_en": [
      "fire safety inspection checklist",
      "fire inspection items"
    ],
    "keywords_sw": [
      "ukaguzi wa usalama wa moto"
    ],
    "answer": "Ukaguzi wa kawaida wa usalama wa moto hukagua: njia za dharura za kutoka (zisizozuiliwa, zenye alama wazi, zinazofanya kazi), vizima moto (vipo, vimejazwa, vimekaguliwa/vimewekwa tag, vinafikika), smoke alarm na alarm za moto (zinafanya kazi, zimejaribiwa), taa za dharura, mifumo na paneli za umeme (hali, hakuna kuzidishwa mzigo), mifumo ya LPG/gesi (salama, hakuna uvujaji), usafi wa jumla (uhifadhi wa vitu vinavyoweza kuwaka, uchafu), mipango ya uokoaji na alama, na kumbukumbu za mazoezi ya moto.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Panga ukaguzi mara kwa mara na andika matokeo na hatua za kurekebisha.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-140",
    "category": "Vehicle Fires",
    "subcategory": "General",
    "topic": "What to do if your vehicle catches fire",
    "question": "What should I do if my vehicle catches fire?",
    "keywords_en": [
      "car fire",
      "vehicle fire safety",
      "engine fire"
    ],
    "keywords_sw": [
      "moto wa gari"
    ],
    "answer": "Kama unagundua moshi au moto ukiwa unaendesha, egesha kwa usalama, zima injini, na wape kila mtu kutoka gari na kwenda umbali salama (mbali kabisa na magari mengine na gari lenyewe — moto wa mafuta unaweza kusambaa au gari kulipuka). Usifungue boneti kama unaona miali au moshi mzito kutoka sehemu ya injini — oksijeni mpya inaweza kuongeza nguvu ya moto. Piga simu huduma za dharura mara moja.",
    "safety_warning": "Kamwe usifungue boneti linalotoa moshi kama miali inaonekana au moshi ni mzito — oksijeni ya ziada inaweza kusababisha moto kuwaka zaidi.",
    "when_not_to_attempt": "Usijaribu kupambana na moto wa gari unaohusisha mfumo wa mafuta au moto wa injini unaokua bila mafunzo na vifaa sahihi.",
    "recommended_action": "Waondoe watu wote mbali na gari na magari yanayokuja hadi umbali salama.",
    "emergency_action": "Piga simu huduma za dharura mara moja kwa moto wowote wa gari.",
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-150",
    "category": "Outdoor Fires",
    "subcategory": "Vegetation Fires",
    "topic": "Grass/vegetation fire and wildfire safety",
    "question": "What should I do about a grass or vegetation fire near my property?",
    "keywords_en": [
      "grass fire",
      "vegetation fire",
      "wildfire safety",
      "bush fire"
    ],
    "keywords_sw": [
      "moto wa nyasi",
      "moto wa porini"
    ],
    "answer": "Songa mbali na njia ya moto, ukizingatia mwelekeo wa upepo (moto husambaa haraka zaidi ukiwa na upepo). Waonye majirani na piga simu huduma za dharura. Kama muda unaruhusu na ni salama, ondoa vitu vikavu vinavyoweza kuwaka mbali na miundo. Usijaribu kupambana na moto wa nje unaosambaa bila vifaa na mafunzo sahihi — moto wa nje unaweza kubadilisha mwelekeo na kasi kwa haraka pamoja na upepo.",
    "safety_warning": "Upepo unaweza kubadilisha mwelekeo na kasi ya moto wa nje kwa ghafla — usijiweke kwenye njia inayoweza kupitiwa na moto.",
    "when_not_to_attempt": "Usijaribu kupambana wewe mwenyewe na moto mkubwa wa mimea unaoongozwa na upepo.",
    "recommended_action": "Toka mbali na njia ya moto na uwajulishe wengine eneo hilo.",
    "emergency_action": "Piga simu Zimamoto/huduma za dharura mara moja kwa moto wowote wa nje usiodhibitiwa.",
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-160",
    "category": "Workplace Safety",
    "subcategory": "Fire Wardens",
    "topic": "Role of a fire warden and emergency plans",
    "question": "What does a fire warden do and why does a workplace need an emergency plan?",
    "keywords_en": [
      "fire warden role",
      "workplace emergency plan",
      "fire drill"
    ],
    "keywords_sw": [
      "jukumu la mlinzi wa moto",
      "mpango wa dharura kazini"
    ],
    "answer": "Mlinzi wa moto ni mfanyakazi aliyefunzwa anayehusika kusaidia kuratibu uokoaji, kuangalia eneo lake lililopangiwa ni tupu, na kuripoti kwenye sehemu ya kuhesabu watu. Mpango ulioandikwa wa dharura huweka njia za uokoaji, maeneo ya kukusanyikia, taratibu za alarm, na majukumu ili kila mtu afahamu la kufanya bila mkanganyiko wakati wa dharura halisi. Mazoezi ya moto ya mara kwa mara hujaribu na kuimarisha mpango huu.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Teua na fundisha walinzi wa moto, andika mpango kwa uwazi, na fanya mazoezi kwa vipindi vya kawaida.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "medium",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-170",
    "category": "Training",
    "subcategory": "Beginners",
    "topic": "Basic fire safety rules for beginners",
    "question": "What are the most basic fire safety rules everyone should know?",
    "keywords_en": [
      "basic fire safety rules",
      "fire safety for beginners"
    ],
    "keywords_sw": [
      "kanuni za msingi za usalama wa moto"
    ],
    "answer": "Jua njia zako mbili za karibu za kutoka popote ulipo. Kamwe usizuie njia za kutoka au vifaa vya moto. Jaribu smoke alarm mara kwa mara. Kamwe usiache upishi au miali wazi bila kusimamia. Weka vitu vinavyoweza kuwaka mbali na vyanzo vya joto. Jua jinsi na wakati wa kutumia kizima moto — na jua wakati wa kutoka badala yake. Ukiwa na wasiwasi, toka na piga simu kuomba msaada.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Jifunze njia za kutoka za jengo lako na mpango wa uokoaji kabla dharura haijatokea, si wakati wa dharura.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "low",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  },
  {
    "id": "FS-171",
    "category": "Training",
    "subcategory": "Fire Drills",
    "topic": "Why fire drills matter",
    "question": "Why are fire drills important?",
    "keywords_en": [
      "fire drill importance",
      "why fire drills"
    ],
    "keywords_sw": [
      "umuhimu wa mazoezi ya moto"
    ],
    "answer": "Mazoezi ya moto hujenga ufahamu wa njia na taratibu za uokoaji ili watu wajibu kwa kasi na kwa utulivu wakati wa dharura halisi badala ya kusitasita au kuogopa. Pia yanafichua udhaifu katika mpango wa uokoaji wa jengo (njia zilizozuiliwa, njia zenye mkanganyiko, maeneo ya kukusanyikia yasiyo wazi) kabla udhaifu huo kujali kwenye moto halisi.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Fanya mazoezi ya moto kwa vipindi vya kawaida na pitia mafunzo yaliyopatikana baadaye.",
    "emergency_action": null,
    "source_name": "Fire & Rescue Force (Tanzania) general guidance / recognized international fire-safety practice (e.g. NFPA, ISO 3941 fire classification) — verify and replace with a specific citation before publishing",
    "source_url": null,
    "priority": "low",
    "language": "bilingual",
    "last_verified": "2026-09-27",
    "version": 1,
    "active": true
  }
];

  // ---- 2. Kamusi ya visawe (Kiswahili <-> Kiingereza) ------------------
  const SYNONYMS = [
    ["oil fire", "grease fire", "cooking oil fire", "deep fryer fire", "moto wa mafuta", "moto wa mafuta ya kupikia"],
    ["electrical fire", "electric fire", "wiring fire", "moto wa umeme", "umeme moto"],
    ["gas cylinder", "lpg cylinder", "gas bottle", "mtungi wa gesi", "gesi"],
    ["extinguisher", "fire extinguisher", "kizima moto"],
    ["evacuate", "evacuation", "get out", "leave building", "kutoka", "kuondoka jengoni"],
    ["smoke", "moshi"],
    ["trapped", "stuck inside", "amenaswa", "amekwama"],
    ["water", "maji"],
    ["overload", "overloaded socket", "soketi kupakia mzigo"],
    ["generator", "jenereta"],
    ["vehicle fire", "car fire", "moto wa gari"],
    ["prevention", "prevent fires", "kuzuia moto"],
    ["inspection", "ukaguzi"],
  ];
  const SYN_INDEX = new Map();
  for (const group of SYNONYMS) {
    for (const term of group) SYN_INDEX.set(term.toLowerCase(), group.map(t => t.toLowerCase()));
  }

  const STOPWORDS = new Set([
    "the","a","an","is","are","do","does","did","can","could","should","i","my","me","to","of","in","on",
    "for","and","or","what","how","when","which","if","it","this","that","with","be","use",
    "ni","na","kwa","je","nini","gani","au","ya","wa","la","kama","mimi","yangu"
  ]);

  function normalize(text) {
    return (text || "")
      .toLowerCase()
      .normalize("NFKC")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractKeywords(text) {
    const norm = normalize(text);
    const tokens = norm.split(" ").filter(t => t && !STOPWORDS.has(t));
    const expanded = new Set(tokens);
    const bigrams = [];
    for (let i = 0; i < tokens.length - 1; i++) bigrams.push(tokens[i] + " " + tokens[i + 1]);
    for (const term of [...tokens, ...bigrams]) {
      if (SYN_INDEX.has(term)) for (const syn of SYN_INDEX.get(term)) expanded.add(syn);
    }
    return { tokens, expanded: [...expanded] };
  }

  const CATEGORY_HINTS = {
    "Cooking Fires": ["oil", "grease", "kitchen", "fryer", "mafuta", "jikoni"],
    "LPG/Gas": ["gas", "lpg", "cylinder", "gesi", "mtungi"],
    "Electrical": ["electric", "electrical", "wiring", "socket", "umeme"],
    "Evacuation": ["evacuate", "exit", "assembly", "kutoka"],
    "Smoke Safety": ["smoke", "moshi"],
    "Rescue": ["trapped", "rescue", "amenaswa", "okoa"],
    "Fire Extinguishers": ["extinguisher", "kizima moto"],
    "Vehicle Fires": ["car", "vehicle", "gari"],
    "Fire Prevention": ["prevent", "prevention", "kuzuia"],
    "Fire Inspection": ["inspection", "ukaguzi"],
  };

  function detectCategory(expanded) {
    let best = null, bestScore = 0;
    for (const [cat, hints] of Object.entries(CATEGORY_HINTS)) {
      const s = hints.filter(h => expanded.includes(h)).length;
      if (s > bestScore) { best = cat; bestScore = s; }
    }
    return best;
  }

  function scoreRecord(record, expanded, category) {
    const recKeywords = [...(record.keywords_en || []), ...(record.keywords_sw || [])].map(k => k.toLowerCase());
    const haystack = normalize([record.question, record.topic, record.category, record.subcategory, recKeywords.join(" ")].join(" "));
    let score = 0;
    for (const kw of recKeywords) if (expanded.includes(kw)) score += 3;
    for (const term of expanded) if (term.length > 2 && haystack.includes(term)) score += 1;
    if (category && record.category && record.category.toLowerCase().includes(category.toLowerCase())) score += 2;
    if (record.priority === "high") score += 0.5;
    return score;
  }

  // ---- 3. Utafutaji (search) -------------------------------------------
  function search(userQuestion, opts) {
    opts = opts || {};
    const active = RECORDS.filter(r => r.active !== false);
    const { expanded } = extractKeywords(userQuestion);
    const category = detectCategory(expanded);
    const scored = active
      .map(r => ({ record: r, score: scoreRecord(r, expanded, category) }))
      .filter(s => s.score > 0)
      .sort((a, b) => b.score - a.score);
    const top = scored.slice(0, opts.limit || 3);
    const topScore = top[0]?.score || 0;
    let confidence = "low";
    if (topScore >= 6) confidence = "high";
    else if (topScore >= 3) confidence = "medium";
    return { query: userQuestion, category, matches: top.map(s => ({ id: s.record.id, score: s.score, record: s.record })), confidence };
  }

  // ---- 4. Ukaguzi wa hatari (safety filter) -----------------------------
  const HIGH_RISK_TERMS = [
    "explosion", "explode", "lpg", "gas cylinder", "gesi", "mtungi",
    "trapped", "amenaswa", "unconscious", "amepoteza fahamu",
    "collapse", "kuporomoka", "confined space", "chemical", "kemikali",
    "electrical panel", "high voltage", "umeme mkubwa",
  ];
  function safetyFilter(question) {
    const q = (question || "").toLowerCase();
    const matched = HIGH_RISK_TERMS.filter(t => q.includes(t));
    return { high_risk: matched.length > 0, matched_terms: matched };
  }

  // ---- 5. Jibu la moja kwa moja (bila LLM) — hufanya kazi bila seva ------
  // Hutumia rekodi bora zaidi kutengeneza jibu la kueleweka moja kwa moja
  // kutoka kwenye maarifa yaliyohifadhiwa — salama, halibuni taarifa.
  function getAnswer(userQuestion, opts) {
    opts = opts || {};
    const safety = safetyFilter(userQuestion);
    const result = search(userQuestion, { limit: opts.limit || 1 });

    if (!result.matches.length) {
      return {
        answer: "Sina taarifa za kutosha kuhusu hilo kwenye Fire Safety Knowledge Base kwa sasa. " +
                "Kama hii ni dharura, piga simu Zimamoto/Fire & Rescue mara moja.",
        confidence: "low",
        matches: [],
        safety
      };
    }

    const best = result.matches[0].record;
    let parts = [];
    if (safety.high_risk) {
      parts.push("⚠️ Hii inaweza kuwa hali ya hatari kubwa: hakikisha usalama wako kwanza, toka eneo hilo, na piga simu Zimamoto/Fire & Rescue mara moja.");
    }
    parts.push(best.answer);
    if (best.safety_warning) parts.push("Onyo: " + best.safety_warning);
    if (best.when_not_to_attempt) parts.push("Usijaribu kama: " + best.when_not_to_attempt);
    if (best.recommended_action) parts.push("Kitendo kinachopendekezwa: " + best.recommended_action);
    if (best.emergency_action) parts.push("Kama ni dharura: " + best.emergency_action);

    return {
      answer: parts.join("\n\n"),
      confidence: result.confidence,
      matches: result.matches.map(m => m.id),
      safety
    };
  }

  // ---- 6. Andiko la LLM (hiari, kwa siku zijazo) -------------------------
  // Tengeneza 'prompt' ya kutuma kwa seva yako ya nyuma inayozungumza na
  // Claude/LLM nyingine, ikijumuisha maarifa yaliyopatikana pekee (si
  // uzushi). Tumia hii ukiwa na backend — vinginevyo `getAnswer()` juu
  // inatosha peke yake bila seva yoyote.
  function buildPrompt(userQuestion, incidentRecordsText) {
    const result = search(userQuestion, { limit: 3 });
    const safety = safetyFilter(userQuestion);
    const kbText = result.matches.map(m => {
      const r = m.record;
      return `[KB ${r.id}] ${r.topic}\nJibu: ${r.answer}` +
        (r.safety_warning ? `\nOnyo: ${r.safety_warning}` : "") +
        (r.when_not_to_attempt ? `\nUsijaribu kama: ${r.when_not_to_attempt}` : "") +
        (r.recommended_action ? `\nKitendo kinachopendekezwa: ${r.recommended_action}` : "") +
        (r.emergency_action ? `\nKama ni dharura: ${r.emergency_action}` : "");
    }).join("\n\n");

    return `Wewe ni msaidizi wa Fire Report. Jibu swali la mtumiaji ukitumia TU maarifa
yaliyopatikana chini. Usibuni taarifa, vyanzo, takwimu, au maelezo ya matukio
yasiyokuwepo humu. Kama maarifa hayatoshi kujibu kikamilifu, sema hivyo wazi.

Jibu kwa lugha aliyotumia mtumiaji (Kiswahili, Kiingereza, au mchanganyiko).

Kanuni: Kipa kipaumbele usalama; kama hali ni dharura, anza na uokoaji na
kupiga simu Zimamoto kabla ya hatua nyingine yoyote. Usimshawishi mtu
kupambana na moto mkubwa, unaosambaa, wenye moshi mzito, au unaozuia njia
ya kutokea.

${safety.high_risk ? "TAHADHARI: swali hili lina dalili za hatari kubwa (maneno: " + safety.matched_terms.join(", ") + ")." : ""}

MAARIFA YALIYOPATIKANA:
${kbText || "(hakuna taarifa zinazolingana vizuri)"}

TAARIFA ZA MATUKIO HALISI (Fire Report), kama zipo:
${incidentRecordsText || "(hakuna)"}

SWALI LA MTUMIAJI: ${userQuestion}`;
  }

  global.FireSafetyKB = {
    records: RECORDS,
    search,
    safetyFilter,
    getAnswer,
    buildPrompt,
    version: "1.0.0",
    recordCount: RECORDS.length,
  };
})(typeof window !== "undefined" ? window : globalThis);
