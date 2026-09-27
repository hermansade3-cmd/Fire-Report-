/*!
 * incident-ai.js — Incident AI: Msaidizi wa ndani wa "Offline Incident & Rescue Report"
 * 100% OFFLINE. Hauhitaji internet, akaunti, wala API ya nje ya aina yoyote.
 *
 * Anavyofanya kazi (kwa uwazi, hakuna "uchawi"):
 *  1) Ana hifadhi ya maswali/majibu ya jinsi app hii inavyotumika (APP_FAQ).
 *  2) Ana hifadhi ya maudhui ya Kitabu cha Sayansi ya Moto (FIRE_KB) — sura zote za
 *     fire_education.html zimehifadhiwa hapa moja kwa moja, hivyo hazihitaji kupakuliwa tena.
 *  3) Anasoma (read-only) data halisi ya ripoti kutoka RescueDB (IndexedDB) kujibu maswali
 *     kama "ripoti ngapi mwezi huu" kwa takwimu za kweli za kifaa hiki — hauandiki wala
 *     kubadilisha chochote kwenye data yako, na hatumi popote nje ya kifaa.
 *  4) Kama fire-safety-knowledge.js imepakiwa KABLA ya faili hili (window.FireSafetyKB),
 *     Incident AI pia huuliza hifadhi hiyo ya nje — ambayo ina maelezo ya kina zaidi
 *     (onyo la usalama, "usijaribu kama...", kitendo kinachopendekezwa) — na kuchagua
 *     jibu bora kati ya hifadhi hizo mbili.
 *  5) Kwa swali lolote, hutafuta ulinganifu bora kati ya maneno ya swali na (1)+(2)+(4) hapo
 *     juu, kwa "keyword/overlap scoring" ya ndani ya kivinjari — si generative AI ya nje.
 *
 * Created for Herman Sade's Fire Report app.
 */
(function () {
  "use strict";

  // ============================================================
  // 1) KNOWLEDGE: Fire-science textbook (extracted from fire_education.html)
  // ============================================================
  const FIRE_KB = [{"chapter":"Sura ya 1 Moto ni Nini? — Misingi ya Sayansi ya Moto","title":"Fire Triangle (Pembetatu ya Moto)","text":"Moto huhitaji vitu vitatu ili uwepo na kuendelea kuwaka: joto (heat) linaloanzisha mwako, oksijeni (oxygen) inayolisha mwako, na mafuta (fuel) yanayoungua. Ukiondoa kimoja kati ya vitatu hivi, moto hauwezi kuendelea — kanuni hii ndiyo msingi wa njia zote za uzimaji moto zilizopo duniani."},{"chapter":"Sura ya 1 Moto ni Nini? — Misingi ya Sayansi ya Moto","title":"Fire Tetrahedron","text":"Ni maendeleo ya kisayansi ya Fire Triangle yanayoongeza kipengele cha nne: mmenyuko wa mnyororo wa kemikali (chemical chain reaction) unaotokea wakati molekuli za mafuta zinapovunjwa na joto na kuungana na oksijeni kwa kasi. Vizima moto vya aina ya dry chemical hufanya kazi kwa kuvunja mnyororo huu badala ya kuondoa joto au oksijeni pekee."},{"chapter":"Sura ya 1 Moto ni Nini? — Misingi ya Sayansi ya Moto","title":"Joto, Oksijeni na Fuel","text":"Joto huanzisha mwako kwa kufikisha mafuta kwenye joto lake la kuwaka (ignition temperature). Hewa ya kawaida ina asilimia 21 ya oksijeni; mwako huanza kupungua kasi oksijeni ikipungua chini ya asilimia 16. Fuel ni dutu yoyote inayoweza kuungua — iwe ngumu (mbao, karatasi), kimiminika (petroli, mafuta), au gesi (propane, methane)."},{"chapter":"Sura ya 1 Moto ni Nini? — Misingi ya Sayansi ya Moto","title":"Conduction, Convection na Radiation","text":"Joto husafiri kwa njia tatu kuu. Conduction ni usafirishaji wa joto kupitia mguso wa moja kwa moja kati ya vitu, kama chuma kinachopashwa moto na kusambaza joto hilo. Convection ni usafirishaji wa joto kupitia mzunguko wa hewa au maji moto — ndiyo sababu moshi na hewa ya moto huelekea juu kila wakati. Radiation ni joto linalosafiri kwa njia ya mawimbi bila kuhitaji njia ya kimwili (kama vile jua linavyopasha dunia joto), na huweza kusababisha vitu vya karibu kuungua bila hata kugusana na moto wenyewe."},{"chapter":"Sura ya 1 Moto ni Nini? — Misingi ya Sayansi ya Moto","title":"Ignition Temperature (Joto la Kuwasha)","text":"Ni kiwango cha chini kabisa cha joto ambapo dutu huanza kuwaka lenyewe na kuendelea kuungua bila kuhitaji chanzo cha ziada cha moto. Kila dutu ina joto lake maalum la kuwaka — kwa mfano, karatasi huwaka takriban katika nyuzi joto 233°C, huku petroli ikihitaji joto la chini zaidi kufikia hatua hiyo."},{"chapter":"Sura ya 1 Moto ni Nini? — Misingi ya Sayansi ya Moto","title":"Flash Point na Fire Point","text":"Flash point ni joto la chini kabisa ambapo mvuke wa kimiminika unaweza kuwaka kwa muda mfupi ukiwa na chanzo cha moto, kisha kuzima wenyewe. Fire point ni joto la juu kidogo kuliko flash point, ambapo mwako unaendelea kwa kudumu hata baada ya chanzo cha moto kuondolewa. Vimiminika vyenye flash point ya chini (kama petroli, ambayo ina flash point chini sana ya joto la kawaida) ni hatari zaidi kwa sababu vinaweza kuwaka kwa urahisi."},{"chapter":"Sura ya 1 Moto ni Nini? — Misingi ya Sayansi ya Moto","title":"Heat Transfer (Usafirishaji wa Joto) Ndani ya Jengo","text":"Kuelewa jinsi joto linavyosafiri kupitia kuta, sakafu, na dari za jengo humsaidia mzima moto kutabiri kwa usahihi wapi moto utaenea kwa haraka zaidi, na kuchagua mahali pazuri pa kuweka vizuizi vya kuzuia kuenea kwake."},{"chapter":"Sura ya 1 Moto ni Nini? — Misingi ya Sayansi ya Moto","title":"Hatua za Ukuaji wa Moto (Fire Growth Stages)","text":"Moto hupitia hatua nne za msingi: Incipient — hatua ya mwanzo ambapo moto ni mdogo na unaweza kuzimwa kwa urahisi; Growth — moshi na joto huanza kuongezeka haraka; Fully Developed — moto mkubwa unaotumia karibu mafuta yote yaliyopo chumbani; na Decay — moto huanza kupungua mafuta yanapoisha au oksijeni inapopungua."},{"chapter":"Sura ya 1 Moto ni Nini? — Misingi ya Sayansi ya Moto","title":"Flashover","text":"Ni tukio la hatari kubwa sana ambapo vitu vyote ndani ya chumba huwaka kwa wakati mmoja kutokana na mkusanyiko wa joto kali juu ya chumba (kawaida zaidi ya nyuzi joto 500°C). Flashover hutokea kwa ghafla na inaweza kuua ndani ya sekunde chache — dalili zake ni pamoja na moshi mzito unaoshuka chini polepole, joto linaloongezeka kwa ghafla, na kuonekana kwa \"rollover\" (miali midogo inayosonga juu ya dari)."},{"chapter":"Sura ya 1 Moto ni Nini? — Misingi ya Sayansi ya Moto","title":"Backdraft","text":"Hutokea pale moto unapokosa oksijeni ya kutosha ndani ya chumba kilichofungwa vizuri, na kujaa gesi za moto zilizokuwa zikisubiri oksijeni mpya. Mlango au dirisha likifunguliwa ghafla, oksijeni mpya huingia kwa kasi na kusababisha mlipuko mkubwa. Dalili za onyo ni: madirisha yenye tabaka la rangi ya njano au kahawia, moshi unaotoka kwa mapigo (pulsing smoke) badala ya mtiririko wa kawaida, na sauti ya kuzomea inayotoka ndani ya jengo."},{"chapter":"Sura ya 1 Moto ni Nini? — Misingi ya Sayansi ya Moto","title":"Smoke Behaviour (Tabia ya Moshi)","text":"Moshi mara nyingi ni hatari zaidi ya moto wenyewe, kwa sababu una gesi za sumu (kama carbon monoxide na hydrogen cyanide) zinazoweza kuua kabla hata moto haujafika. Moshi huinuka juu kwanza kisha hujaza chumba kutoka juu kwenda chini — ndiyo maana wazima moto na wakazi wanashauriwa kutambaa chini wakati wa moshi mzito, kwani hewa safi zaidi hupatikana karibu na sakafu."},{"chapter":"Sura ya 3 Aina na Madaraja ya Moto (Fire Classes)","title":"Class A","text":"Moto wa vitu vigumu vya kawaida vinavyoacha majivu: mbao, karatasi, nguo, na plastiki nyingi. Huzimwa vizuri kwa maji, povu (foam), au dry chemical."},{"chapter":"Sura ya 3 Aina na Madaraja ya Moto (Fire Classes)","title":"Class B","text":"Moto wa vimiminika vinavyoweza kuwaka: petroli, mafuta ya taa, rangi, na solvent. KAMWE usitumie maji kwenye moto wa aina hii — maji husambaza mafuta yanayowaka na kufanya moto kuenea zaidi. Njia sahihi ni foam, CO₂, au dry powder."},{"chapter":"Sura ya 3 Aina na Madaraja ya Moto (Fire Classes)","title":"Class C","text":"Moto unaohusisha gesi zinazoweza kuwaka: propane, butane, na gesi asilia. Njia bora zaidi ni kuzima chanzo cha gesi kwanza kabla ya kujaribu kuzima moto wenyewe, kwani moto unaweza kurudi mara moja gesi ikiendelea kutoka."},{"chapter":"Sura ya 3 Aina na Madaraja ya Moto (Fire Classes)","title":"Class D","text":"Moto wa metali zinazoweza kuwaka: magnesium, titanium, na sodium. Huhitaji dry powder maalum ya metali (special powder) — maji au CO₂ ya kawaida vinaweza kusababisha mlipuko mkubwa zaidi vikigusana na metali hizi zinazowaka."},{"chapter":"Sura ya 3 Aina na Madaraja ya Moto (Fire Classes)","title":"Class F/K","text":"Moto wa mafuta ya kupikia na mafuta ya wanyama jikoni, hasa kwenye friji za kukaangia. Huzimwa kwa wet chemical extinguisher iliyoundwa mahususi kwa jiko — hupoza haraka na kuunda safu ya sabuni juu ya mafuta inayozuia moto kurudi tena."},{"chapter":"Sura ya 3 Aina na Madaraja ya Moto (Fire Classes)","title":"Moto wa Umeme (Electrical Fires)","text":"Hutokea kwenye vifaa vya umeme vilivyo hai (live equipment). KAMWE usitumie maji kwani umeme unaweza kusafiri kupitia maji na kukuua kwa mshtuko wa umeme. Zima chanzo cha umeme kwanza kama inawezekana, kisha tumia CO₂ au dry powder isiyoongoza umeme."},{"chapter":"Sura ya 3 Aina na Madaraja ya Moto (Fire Classes)","title":"Kutambua Aina ya Moto Kabla ya Kuchukua Hatua","text":"Kabla ya kuzima moto wowote, jiulize: Ni kitu gani hasa kinawaka? Kuna umeme unaohusika karibu? Kuna gesi au mafuta yanayoweza kuongeza hatari? Utambuzi sahihi wa haraka ndio unaoamua uchaguzi wa kizima moto na mbinu salama ya kuchukua."},{"chapter":"Sura ya 3 Aina na Madaraja ya Moto (Fire Classes)","title":"Kuchagua Extinguishing Agent Inayofaa","text":"Kila kizima moto huwa na lebo inayoonyesha madaraja ya moto linalofaa kuzima (kwa mfano \"ABC\" humaanisha kinafaa kwa Class A, B, na C). Kutumia kizima moto kisichofaa daraja husika ni hatari kubwa — kwa mfano maji kwenye moto wa umeme au mafuta yanaweza kuongeza hatari badala ya kuipunguza."},{"chapter":"Sura ya 4 Fire Extinguishers (Vizima Moto)","title":"Water Extinguisher","text":"Hutumika kwa moto wa Class A pekee. Hupoza (cools) vitu vinavyowaka kwa kuondoa joto haraka. Haifai kabisa kwa umeme au mafuta yanayowaka."},{"chapter":"Sura ya 4 Fire Extinguishers (Vizima Moto)","title":"Foam Extinguisher","text":"Hufunika juu ya mafuta yanayowaka na kuzuia oksijeni kufika kwenye mafuta hayo, hivyo inafaa kwa Class A na B. Haifai kwa umeme kwa sababu foam ina maji ndani yake."},{"chapter":"Sura ya 4 Fire Extinguishers (Vizima Moto)","title":"Dry Powder","text":"Huvunja mnyororo wa mmenyuko wa kikemikali (chain reaction) unaoendesha mwako. Inafaa kwa Class A, B, C, na wakati mwingine D (kwa powder maalum ya metali). Haifai sana kutumika ndani ya nyumba kwa sababu huacha vumbi jingi linaloweza kuathiri kupumua."},{"chapter":"Sura ya 4 Fire Extinguishers (Vizima Moto)","title":"CO₂ (Carbon Dioxide) Extinguisher","text":"Huondoa oksijeni kutoka eneo la moto kwa kuibadilisha na gesi ya CO₂. Inafaa vizuri kwa moto wa umeme na Class B kwa sababu haiachi mabaki yoyote baada ya matumizi. Haifai kutumika kwenye sehemu ndogo zilizofungwa bila hewa ya kutosha kwa binadamu, kwa sababu inaweza kupunguza oksijeni hadi kiwango hatari kwa mtumiaji mwenyewe."},{"chapter":"Sura ya 4 Fire Extinguishers (Vizima Moto)","title":"Wet Chemical","text":"Imeundwa mahususi kwa moto wa mafuta ya jikoni (Class F/K). Hupoza haraka na kuunda safu ya sabuni juu ya mafuta inayozuia oksijeni kufika na kuzuia moto kurudi tena baada ya kuzimwa."},{"chapter":"Sura ya 4 Fire Extinguishers (Vizima Moto)","title":"Matumizi Sahihi","text":"Simama umbali salama (angalau mita moja hadi mbili), elekeza kwenye msingi wa moto (siyo juu ya miali), na hakikisha una njia ya kutoroka nyuma yako kabla ya kuanza kuzima."},{"chapter":"Sura ya 4 Fire Extinguishers (Vizima Moto)","title":"PASS Technique","text":"P ull — vuta pini ya usalama iliyopo juu ya kizima moto. A im — elekeza bomba/nozzle chini kuelekea msingi wa moto, siyo juu ya miali. S queeze — bonyeza kishikizo taratibu kutoa dawa. S weep — sogeza mkono kwa mtindo wa kufagia kutoka upande mmoja kwenda mwingine hadi moto uzimike."},{"chapter":"Sura ya 4 Fire Extinguishers (Vizima Moto)","title":"Ukaguzi na Matengenezo","text":"Vizima moto vinapaswa kukaguliwa kila mwezi kuangalia kiwango cha shinikizo (pressure gauge), na kuhudumiwa kitaalamu angalau mara moja kwa mwaka. Kizima moto chochote kilichotumika hata kidogo lazima kijazwe upya au kubadilishwa kabla ya kutumika tena."},{"chapter":"Sura ya 4 Fire Extinguishers (Vizima Moto)","title":"Makosa ya Kawaida Wakati wa Kutumia Extinguisher","text":"Kutumia kizima moto kisichofaa kwa aina ya moto uliopo, kutosimama umbali salama, kuelekeza juu ya miali badala ya msingi wa moto, na kutokuwa na njia wazi ya kutoroka ni miongoni mwa makosa hatari zaidi yanayoweza kugharimu maisha."},{"chapter":"Sura ya 5 Firefighting Equipment (Vifaa vya Kuzimia Moto)","title":"Hose (Bomba la Maji)","text":"Hutumika kusafirisha maji kutoka chanzo (hydrant au pump) hadi mahali pa moto. Kuna hose kubwa za kusambaza maji (supply line) na ndogo za shambulizi (attack line), kila moja ikiwa na matumizi yake mahususi."},{"chapter":"Sura ya 5 Firefighting Equipment (Vifaa vya Kuzimia Moto)","title":"Nozzle","text":"Kifaa cha mwisho cha bomba kinachodhibiti mtiririko na muundo wa maji — kinaweza kutoa mkondo wa moja kwa moja (straight stream) au mvua ya matone (fog pattern) kulingana na hitaji."},{"chapter":"Sura ya 5 Firefighting Equipment (Vifaa vya Kuzimia Moto)","title":"Branch Pipe","text":"Kipande cha chuma kinachounganisha hose na nozzle, huruhusu msukumo na uelekezaji bora wa maji wakati wa shambulizi la moja kwa moja."},{"chapter":"Sura ya 5 Firefighting Equipment (Vifaa vya Kuzimia Moto)","title":"Hydrant","text":"Chanzo cha maji cha kudumu kilichowekwa mtaani au ndani ya eneo la jengo kwa matumizi ya haraka wakati wa dharura ya moto."},{"chapter":"Sura ya 5 Firefighting Equipment (Vifaa vya Kuzimia Moto)","title":"Pump","text":"Huongeza shinikizo la maji kutoka chanzo hadi kwenye hose ili kufikisha maji umbali mrefu au kwenye sakafu za juu za majengo marefu."},{"chapter":"Sura ya 5 Firefighting Equipment (Vifaa vya Kuzimia Moto)","title":"Ladder (Ngazi)","text":"Hutumika kufikia sakafu za juu za majengo kwa ajili ya uokoaji au shambulizi la moto. Kuna ngazi za mkono zinazobebwa na wazima moto, na aerial ladder kubwa zinazobebwa na gari maalum."},{"chapter":"Sura ya 5 Firefighting Equipment (Vifaa vya Kuzimia Moto)","title":"Breathing Apparatus","text":"Vifaa vinavyompatia mzima moto hewa safi ya kupumua akiwa ndani ya moshi mzito au mazingira yenye gesi za sumu — ni muhimu sana kwa usalama wa maisha wakati wa operesheni."},{"chapter":"Sura ya 5 Firefighting Equipment (Vifaa vya Kuzimia Moto)","title":"Thermal Imaging Camera","text":"Kamera maalum inayoona joto badala ya mwanga wa kawaida — husaidia kutambua vyanzo vya moto vilivyofichika ndani ya kuta au dari, na kutafuta watu ndani ya moshi mzito wenye ugumu wa kuona."},{"chapter":"Sura ya 5 Firefighting Equipment (Vifaa vya Kuzimia Moto)","title":"Halligan Bar na Zana Nyingine","text":"Zana za chuma zenye ncha maalum zinazotumika kuvunja milango, madirisha, na kuta kwa ajili ya kuingia haraka jengoni au kutoa njia ya moshi kutoka."},{"chapter":"Sura ya 5 Firefighting Equipment (Vifaa vya Kuzimia Moto)","title":"Axes na Rescue Tools","text":"Hutumika kukata, kuvunja, na kuondoa vizuizi mbalimbali wakati wa operesheni za uokoaji au kufungua njia za uingizaji hewa."},{"chapter":"Sura ya 5 Firefighting Equipment (Vifaa vya Kuzimia Moto)","title":"PPE (Vifaa vya Kujikinga)","text":"Mavazi na vifaa vyote vinavyomkinga mzima moto dhidi ya joto, moshi, na hatari nyingine — vimeelezwa kwa undani zaidi katika sura inayofuata."},{"chapter":"Sura ya 6 Vifaa vya Kujikinga (PPE)","title":"Helmet","text":"Hulinda kichwa dhidi ya vitu vinavyoanguka na joto kali. Baadhi ya helmeti za kisasa zina taa na kinga ya uso zilizoambatanishwa."},{"chapter":"Sura ya 6 Vifaa vya Kujikinga (PPE)","title":"Fire-Resistant Clothing","text":"Nguo maalum zenye tabaka nyingi zilizotengenezwa kustahimili joto kali na mguso wa moja kwa moja na moto kwa muda mfupi bila kuungua."},{"chapter":"Sura ya 6 Vifaa vya Kujikinga (PPE)","title":"Gloves","text":"Hulinda mikono dhidi ya joto, moto, na vitu vikali wakati wa kazi za uokoaji na uzimaji moto."},{"chapter":"Sura ya 6 Vifaa vya Kujikinga (PPE)","title":"Boots","text":"Viatu maalum vyenye chuma sehemu ya mbele na chini kuzuia kuungua na majeraha ya miguu yanayotokana na vitu vinavyodondoka au ncha kali."},{"chapter":"Sura ya 6 Vifaa vya Kujikinga (PPE)","title":"Hood","text":"Kifuniko cha shingo na uso kinachozuia joto na cheche kufika kwenye ngozi isiyofunikwa na helmeti au mask ya kupumua."},{"chapter":"Sura ya 6 Vifaa vya Kujikinga (PPE)","title":"Eye Protection","text":"Miwani au visor maalum vinavyolinda macho dhidi ya moshi, vumbi, na cheche zinazoweza kuruka wakati wa moto."},{"chapter":"Sura ya 6 Vifaa vya Kujikinga (PPE)","title":"Hearing Protection","text":"Hutumika kupunguza kelele kali kutoka kwa injini za magari, pump, na vifaa vingine wakati wa operesheni ndefu za dharura."},{"chapter":"Sura ya 6 Vifaa vya Kujikinga (PPE)","title":"SCBA (Self-Contained Breathing Apparatus)","text":"Mfumo kamili wa kupumua unaobebwa mgongoni ukiwa na silinda ya hewa safi, regulator, na mask — hutumika ndani ya moshi mzito au sehemu zenye gesi hatari ambapo hewa ya nje haifai kuvutwa."},{"chapter":"Sura ya 6 Vifaa vya Kujikinga (PPE)","title":"Ukaguzi wa PPE","text":"PPE lazima ikaguliwe kabla na baada ya kila operesheni kuangalia uharibifu, uchafu, au sehemu zilizochakaa zinazohitaji kubadilishwa mara moja."},{"chapter":"Sura ya 6 Vifaa vya Kujikinga (PPE)","title":"Matengenezo na Matumizi Salama","text":"PPE inapaswa kusafishwa baada ya kila matumizi, kuhifadhiwa mahali pakavu na safi, na kubadilishwa kulingana na muda wa matumizi uliopendekezwa na mtengenezaji wake."},{"chapter":"Sura ya 7 SCBA na Ulinzi wa Upumuaji","title":"SCBA ni Nini?","text":"Ni mfumo unaompatia mzima moto hewa safi ya kupumua akiwa katika mazingira yenye moshi mzito, gesi za sumu, au upungufu wa oksijeni ambao ungeweza kumdhuru bila kifaa hiki."},{"chapter":"Sura ya 7 SCBA na Ulinzi wa Upumuaji","title":"Vipengele vya SCBA — Cylinder","text":"Silinda inayohifadhi hewa iliyoshinikizwa, kawaida hudumu kati ya dakika 30 hadi 60 kutegemea kasi ya kupumua na jitihada ya mtumiaji wakati wa operesheni."},{"chapter":"Sura ya 7 SCBA na Ulinzi wa Upumuaji","title":"Regulator","text":"Kifaa kinachopunguza shinikizo la hewa kutoka silinda hadi kiwango salama cha kupumua kabla hewa haijafika kwenye mask."},{"chapter":"Sura ya 7 SCBA na Ulinzi wa Upumuaji","title":"Face Mask","text":"Hufunika uso mzima na kuhakikisha hewa safi tu ndiyo inayovutwa, huku ikizuia moshi na gesi za nje kuingia kwenye njia ya hewa."},{"chapter":"Sura ya 7 SCBA na Ulinzi wa Upumuaji","title":"Pressure Gauge","text":"Huonyesha kiasi cha hewa kilichobaki ndani ya silinda — mzima moto lazima aifuatilie mara kwa mara wakati wa operesheni ili kupanga muda wa kurudi salama."},{"chapter":"Sura ya 7 SCBA na Ulinzi wa Upumuaji","title":"Air Management","text":"Ni mpango wa kutumia hewa kwa busara ili kuhakikisha kunabaki hewa ya kutosha kwa ajili ya safari ya kurudi nje salama, siyo tu kufikia lengo la ndani."},{"chapter":"Sura ya 7 SCBA na Ulinzi wa Upumuaji","title":"Low-Air Alarm","text":"Kengele maalum inayolia hewa inapopungua chini ya kiwango cha usalama, ikimwonya mtumiaji kuanza kutoka mara moja."},{"chapter":"Sura ya 7 SCBA na Ulinzi wa Upumuaji","title":"Emergency Procedures","text":"Taratibu maalum za dharura zinazofuatwa endapo SCBA itashindwa kufanya kazi vizuri, ikiwemo matumizi ya mfumo mbadala wa hewa au kutoka haraka kwa msaada wa timu."},{"chapter":"Sura ya 7 SCBA na Ulinzi wa Upumuaji","title":"Mayday Procedures","text":"Endapo mzima moto anajikuta katika hatari kubwa — amekwama, amepotea njia, au hewa inaisha — hutumia neno \"Mayday\" mara tatu kwenye radio kuomba msaada wa haraka kutoka kwa timu nzima."},{"chapter":"Sura ya 8 Mbinu za Kuzima Moto (Fire Suppression Techniques)","title":"Direct Attack","text":"Shambulizi la moja kwa moja kwa kuelekeza maji au dawa moja kwa moja kwenye msingi wa moto — hutumika kwa moto mdogo hadi wa kati ambapo hali ni salama kuingia karibu."},{"chapter":"Sura ya 8 Mbinu za Kuzima Moto (Fire Suppression Techniques)","title":"Indirect Attack","text":"Kutumia mvuke unaozalishwa na maji kupoza chumba kizima bila kuelekeza moja kwa moja kwenye moto — hutumika hasa kwa moto mkubwa ndani ya nafasi iliyofungwa ambapo kuingia karibu ni hatari."},{"chapter":"Sura ya 8 Mbinu za Kuzima Moto (Fire Suppression Techniques)","title":"Combination Attack","text":"Mchanganyiko wa mbinu za moja kwa moja na zisizo za moja kwa moja, unaobadilika kulingana na hali ya moto inavyoendelea kubadilika wakati wa operesheni."},{"chapter":"Sura ya 8 Mbinu za Kuzima Moto (Fire Suppression Techniques)","title":"Offensive vs Defensive Operations","text":"Katika mkakati wa Offensive , timu huingia ndani ya jengo kupambana na moto moja kwa moja. Katika mkakati wa Defensive , timu hubaki nje na kudhibiti moto kutoka nje pale hali ikiwa hatari mno kuingia ndani."},{"chapter":"Sura ya 8 Mbinu za Kuzima Moto (Fire Suppression Techniques)","title":"Water Application","text":"Namna maji yanavyotumika hutofautiana — jeti kali kwa umbali mrefu, au dawa nyembamba (fog) kwa kupoza eneo pana kwa haraka."},{"chapter":"Sura ya 8 Mbinu za Kuzima Moto (Fire Suppression Techniques)","title":"Hose Management","text":"Ujuzi wa kubeba, kunyoosha, na kudhibiti hose bila kuipinda au kuzuia mtiririko wa maji, hasa wakati wa kupanda ngazi au kupita katika njia finyu."},{"chapter":"Sura ya 8 Mbinu za Kuzima Moto (Fire Suppression Techniques)","title":"Nozzle Patterns","text":"Mifumo tofauti ya utoaji maji: straight stream (mkondo mmoja wenye nguvu), fog (mvua nyembamba ya kupoza), na broken stream — kila mfumo una matumizi yake mahususi kulingana na hali ya moto."},{"chapter":"Sura ya 8 Mbinu za Kuzima Moto (Fire Suppression Techniques)","title":"Ventilation","text":"Kuondoa moshi na joto kutoka jengoni kwa kufungua njia za hewa kwa makusudi ili kuboresha mwonekano na kupunguza hatari ya flashover."},{"chapter":"Sura ya 8 Mbinu za Kuzima Moto (Fire Suppression Techniques)","title":"Cooling","text":"Kupunguza joto la eneo kwa makusudi ili kuzuia moto kuenea au kurudi tena baada ya kuonekana kuzimwa."},{"chapter":"Sura ya 8 Mbinu za Kuzima Moto (Fire Suppression Techniques)","title":"Containment","text":"Kuzuia moto usienee kwenye maeneo mengine ya jengo lile lile au majengo jirani kwa kutumia vizuizi vya asili au vya kuweka makusudi."},{"chapter":"Sura ya 8 Mbinu za Kuzima Moto (Fire Suppression Techniques)","title":"Overhaul","text":"Hatua ya mwisho ya kuhakikisha hakuna sehemu zinazoendelea kuwaka polepole (hot spots) baada ya moto mkuu kudhibitiwa na kuonekana umezimwa."},{"chapter":"Sura ya 9 Uzimaji Moto wa Majengo (Structural Firefighting)","title":"Moto wa Makazi (Residential)","text":"Hutokea majumbani — hatari kubwa zaidi ni watu waliolala au wasiojua njia sahihi za kutoka, hivyo utafutaji wa haraka wa watu huwa kipaumbele cha kwanza."},{"chapter":"Sura ya 9 Uzimaji Moto wa Majengo (Structural Firefighting)","title":"Moto wa Kibiashara (Commercial)","text":"Majengo ya biashara mara nyingi huwa na muundo mgumu zaidi na bidhaa nyingi zinazoweza kuungua kwa haraka, hivyo kuhitaji tathmini makini ya haraka."},{"chapter":"Sura ya 9 Uzimaji Moto wa Majengo (Structural Firefighting)","title":"Moto wa Viwandani (Industrial)","text":"Huweza kuhusisha kemikali hatari, mashine kubwa, na hatari za mlipuko — huhitaji tahadhari maalum na taarifa za awali kuhusu vifaa vilivyopo kwenye eneo husika."},{"chapter":"Sura ya 9 Uzimaji Moto wa Majengo (Structural Firefighting)","title":"Moto wa Paa","text":"Huhitaji tahadhari kubwa ya kuporomoka kwa muundo, hasa kwenye paa za mbao au zenye uzito mkubwa wa vifaa vilivyowekwa juu yake."},{"chapter":"Sura ya 9 Uzimaji Moto wa Majengo (Structural Firefighting)","title":"Moto wa Chini ya Ardhi (Basement)","text":"Ni hatari zaidi kwa sababu ya njia chache za kutoka na mkusanyiko wa moshi na joto kwa haraka zaidi katika nafasi ndogo iliyofungwa."},{"chapter":"Sura ya 9 Uzimaji Moto wa Majengo (Structural Firefighting)","title":"Moto wa Majengo Marefu (High-Rise)","text":"Huhitaji mikakati maalum ya uokoaji kwa sababu ngazi za kawaida na lifti haziwezi kutumika kwa usalama, na maji lazima yasukumwe juu kwa msaada wa pump maalum."},{"chapter":"Sura ya 9 Uzimaji Moto wa Majengo (Structural Firefighting)","title":"Moto wa Vyumba Vilivyofungwa (Compartment Fires)","text":"Vyumba vidogo vilivyofungwa vizuri hukusanya joto haraka zaidi, na hivyo huongeza hatari ya flashover kutokea ghafla."},{"chapter":"Sura ya 9 Uzimaji Moto wa Majengo (Structural Firefighting)","title":"Building Construction (Ujenzi wa Majengo)","text":"Kuelewa vifaa vilivyotumika kujenga (zege, mbao, chuma) husaidia kutabiri jinsi jengo litakavyoshindana na moto, na wakati gani muundo unaweza kuanza kuporomoka."},{"chapter":"Sura ya 9 Uzimaji Moto wa Majengo (Structural Firefighting)","title":"Fire Spread (Kuenea kwa Moto)","text":"Moto huenea kupitia njia za hewa, mabomba, na nyufa za ukuta zisizoonekana kwa urahisi — kujua njia hizi husaidia kuzuia kuenea mapema kabla halijawa kubwa."},{"chapter":"Sura ya 9 Uzimaji Moto wa Majengo (Structural Firefighting)","title":"Structural Collapse","text":"Hatari ya jengo kuanguka inayotokana na joto kudhoofisha vifaa vya ujenzi — wazima moto lazima wafuatilie dalili za kuporomoka wakati wote wa operesheni."},{"chapter":"Sura ya 9 Uzimaji Moto wa Majengo (Structural Firefighting)","title":"Search and Rescue","text":"Utafutaji wa watu ndani ya jengo linaloungua ni kipaumbele cha juu, kinachofanyika sambamba na operesheni za uzimaji moto, siyo baada yake."},{"chapter":"Sura ya 10 Utafutaji na Uokoaji (Search & Rescue)","title":"Primary Search","text":"Utafutaji wa haraka wa awali unaolenga kutafuta watu walio hatarini zaidi, unaofanyika wakati moto bado unaendelea kuwaka."},{"chapter":"Sura ya 10 Utafutaji na Uokoaji (Search & Rescue)","title":"Secondary Search","text":"Utafutaji wa kina zaidi unaofanyika baada ya moto kudhibitiwa, kuhakikisha hakuna aliyeachwa nyuma katika sehemu zilizoruka wakati wa search ya kwanza."},{"chapter":"Sura ya 10 Utafutaji na Uokoaji (Search & Rescue)","title":"Victim Identification","text":"Njia za kutambua na kuripoti idadi na hali ya waathirika waliopatikana ili timu ya matibabu iweze kujiandaa mapema."},{"chapter":"Sura ya 10 Utafutaji na Uokoaji (Search & Rescue)","title":"Rescue Carries","text":"Mbinu mbalimbali za kubeba mtu aliyejeruhiwa au asiye na fahamu kutoka eneo la hatari, zinazochaguliwa kulingana na uzito wa mtu na mazingira ya eneo husika."},{"chapter":"Sura ya 10 Utafutaji na Uokoaji (Search & Rescue)","title":"Drag Techniques","text":"Njia za kumvuta mtu chini bila kumdhuru zaidi, muhimu pale kubeba haiwezekani kwa sababu ya nafasi finyu au uzito mkubwa wa mtu."},{"chapter":"Sura ya 10 Utafutaji na Uokoaji (Search & Rescue)","title":"Ropes (Kamba)","text":"Hutumika kwa uokoaji wa kimo, kufunga vifaa vizito, au kujiunganisha wenyewe na wenzao wakati wa operesheni hatari."},{"chapter":"Sura ya 10 Utafutaji na Uokoaji (Search & Rescue)","title":"Confined-Space Rescue","text":"Uokoaji katika maeneo finyu kama mitaro, matangi, au vichuguu — huhitaji vifaa maalum vya hewa na mafunzo ya ziada kwa sababu ya hatari ya gesi na upungufu wa oksijeni katika maeneo hayo."},{"chapter":"Sura ya 10 Utafutaji na Uokoaji (Search & Rescue)","title":"Vehicle Rescue","text":"Uokoaji wa watu waliokwama ndani ya magari, mara nyingi baada ya ajali za barabarani zilizosababisha uharibifu mkubwa."},{"chapter":"Sura ya 10 Utafutaji na Uokoaji (Search & Rescue)","title":"Water Rescue","text":"Uokoaji wa watu wanaozama au waliokwama majini, unaohitaji mafunzo maalum ya kuogelea na vifaa vya kuelea vilivyothibitishwa."},{"chapter":"Sura ya 10 Utafutaji na Uokoaji (Search & Rescue)","title":"Height Rescue","text":"Uokoaji wa watu walio juu — kwenye majengo marefu au miamba — kwa kutumia kamba na vifaa maalum vya kimo."},{"chapter":"Sura ya 11 Uokoaji wa Ajali za Barabarani (RTC Rescue)","title":"Scene Assessment","text":"Tathmini ya haraka ya eneo la ajali kutambua hatari zilizopo — mafuta yanayovuja, waya za umeme, au magari yanayotetereka — kabla ya kuanza kazi ya uokoaji."},{"chapter":"Sura ya 11 Uokoaji wa Ajali za Barabarani (RTC Rescue)","title":"Traffic Safety","text":"Kudhibiti mwendo wa magari mengine yanayozunguka eneo la ajali ili kulinda timu ya uokoaji na waathirika dhidi ya ajali za pili."},{"chapter":"Sura ya 11 Uokoaji wa Ajali za Barabarani (RTC Rescue)","title":"Vehicle Stabilization","text":"Kuhakikisha gari haliwezi kusonga au kuanguka wakati wa operesheni ya uokoaji, kwa kutumia vizuizi maalum (stabilizers) vinavyowekwa pembeni ya gari."},{"chapter":"Sura ya 11 Uokoaji wa Ajali za Barabarani (RTC Rescue)","title":"Extrication","text":"Mchakato wa kumtoa mtu aliyekwama ndani ya gari lililobonyea kwa kutumia zana maalum za kukata na kubana chuma cha gari."},{"chapter":"Sura ya 11 Uokoaji wa Ajali za Barabarani (RTC Rescue)","title":"Hydraulic Rescue Tools","text":"Vifaa vyenye nguvu kubwa (maarufu kama \"jaws of life\") vinavyotumika kukata au kubana chuma cha gari kwa haraka na usalama wakati wa uokoaji."},{"chapter":"Sura ya 11 Uokoaji wa Ajali za Barabarani (RTC Rescue)","title":"Glass Management","text":"Njia salama za kuondoa vioo vya gari bila kumdhuru mgonjwa aliyeko ndani au wazima moto wanaofanya kazi karibu."},{"chapter":"Sura ya 11 Uokoaji wa Ajali za Barabarani (RTC Rescue)","title":"Door Removal","text":"Kuondoa mlango wa gari kabisa ili kupata nafasi kubwa zaidi ya kumtoa mgonjwa kwa usalama zaidi."},{"chapter":"Sura ya 11 Uokoaji wa Ajali za Barabarani (RTC Rescue)","title":"Roof Removal","text":"Kuondoa paa la gari kuunda nafasi ya wazi kwa ajili ya kumtoa mgonjwa mwenye majeraha makubwa ya mgongo bila kumsogeza sana."},{"chapter":"Sura ya 11 Uokoaji wa Ajali za Barabarani (RTC Rescue)","title":"Patient Protection","text":"Kumkinga mgonjwa dhidi ya vioo vilivyovunjika, moshi, na hatari nyingine wakati wote wa operesheni ya kumtoa ndani ya gari."},{"chapter":"Sura ya 11 Uokoaji wa Ajali za Barabarani (RTC Rescue)","title":"Handover kwa Timu ya Matibabu","text":"Kutoa taarifa kamili kwa timu ya afya kuhusu hali ya mgonjwa na jinsi ajali ilivyotokea, ili kuwasaidia kutoa matibabu sahihi na ya haraka."},{"chapter":"Sura ya 12 Vitu Hatari (HazMat)","title":"Maana ya HazMat","text":"Ni vitu vyovyote vinavyoweza kudhuru afya ya binadamu, mali, au mazingira — vikiwemo kemikali, gesi, mionzi, au vitu vinavyoweza kulipuka kwa urahisi."},{"chapter":"Sura ya 12 Vitu Hatari (HazMat)","title":"Identification (Utambuzi)","text":"Kutambua HazMat kwa kutumia lebo, placards, na hati za usafirishaji kabla hata ya kukaribia eneo lenye hatari."},{"chapter":"Sura ya 12 Vitu Hatari (HazMat)","title":"Chemical Hazards","text":"Kemikali zinazoweza kusababisha kuungua, sumu, au athari za muda mrefu kiafya endapo zitaguswa au kuvutwa bila kinga."},{"chapter":"Sura ya 12 Vitu Hatari (HazMat)","title":"Toxic Gases","text":"Gesi za sumu zinazoweza kusababisha kifo kwa haraka zikivutwa — huhitaji vifaa maalum vya kupumua na ufuatiliaji wa kiasi cha gesi hewani."},{"chapter":"Sura ya 12 Vitu Hatari (HazMat)","title":"Flammable Liquids","text":"Vimiminika vinavyoweza kuwaka kwa urahisi sana — huhitaji tahadhari maalum ya kuzuia chanzo chochote cha moto kuwa karibu navyo."},{"chapter":"Sura ya 12 Vitu Hatari (HazMat)","title":"Corrosive Substances","text":"Kemikali zinazoweza kuunguza ngozi au kuharibu vifaa mara tu zikigusana navyo — huhitaji PPE maalum inayozuia kupenya kwa kemikali hizo."},{"chapter":"Sura ya 12 Vitu Hatari (HazMat)","title":"PPE kwa HazMat","text":"Mavazi maalum yanayolinda dhidi ya kemikali, tofauti kabisa na PPE ya kawaida inayotumika kwa moto wa kawaida."},{"chapter":"Sura ya 12 Vitu Hatari (HazMat)","title":"Isolation (Kutenga Eneo)","text":"Kutenga eneo lililoathirika kwa mkanda maalum au vizuizi ili kuzuia watu wasio na mafunzo au vifaa sahihi kuingia."},{"chapter":"Sura ya 12 Vitu Hatari (HazMat)","title":"Decontamination","text":"Mchakato wa kusafisha wazima moto, waathirika, na vifaa baada ya kugusana na vitu hatari, ili kuzuia sumu kuenea zaidi."},{"chapter":"Sura ya 12 Vitu Hatari (HazMat)","title":"Emergency Response kwa HazMat","text":"Taratibu maalum za dharura zinazofuatwa kulingana na aina ya kemikali husika na miongozo ya kitaifa au kimataifa iliyopo."},{"chapter":"Sura ya 12 Vitu Hatari (HazMat)","title":"HazMat Signs/Placards","text":"Alama za kimataifa zinazowekwa kwenye magari na mizigo kuonyesha aina ya hatari iliyopo ndani, hata bila kufungua mzigo."},{"chapter":"Sura ya 13 Huduma ya Kwanza ya Dharura (Emergency Medical Response)","title":"Scene Safety","text":"Kuhakikisha eneo ni salama kwa mwokoaji mwenyewe kabla ya kumkaribia mgonjwa — usalama wa mwokoaji ndiyo kipaumbele cha kwanza kabla ya kumsaidia mwingine."},{"chapter":"Sura ya 13 Huduma ya Kwanza ya Dharura (Emergency Medical Response)","title":"Patient Assessment","text":"Tathmini ya haraka ya hali ya mgonjwa, ikianzia na kupumua, mzunguko wa damu, na kiwango cha fahamu alichonacho."},{"chapter":"Sura ya 13 Huduma ya Kwanza ya Dharura (Emergency Medical Response)","title":"Primary Survey","text":"Ukaguzi wa haraka wa mambo yanayohatarisha maisha moja kwa moja: njia ya hewa (Airway), kupumua (Breathing), na mzunguko wa damu (Circulation)."},{"chapter":"Sura ya 13 Huduma ya Kwanza ya Dharura (Emergency Medical Response)","title":"CPR (Ufufuaji wa Moyo na Mapafu)","text":"Mbinu ya kumfufua mtu ambaye moyo wake umesimama, kwa kubonyeza kifua kwa mdundo maalum pamoja na kutoa pumzi za msaada."},{"chapter":"Sura ya 13 Huduma ya Kwanza ya Dharura (Emergency Medical Response)","title":"AED (Kifaa cha Kurejesha Mdundo wa Moyo)","text":"Kifaa cha kielektroniki kinachotoa mshtuko wa umeme uliopimwa kwa lengo la kurekebisha mdundo wa moyo uliovurugika."},{"chapter":"Sura ya 13 Huduma ya Kwanza ya Dharura (Emergency Medical Response)","title":"Bleeding Control","text":"Njia za kuzuia damu kutoka kwa kubonyeza moja kwa moja jeraha, kufunga jeraha vizuri, au kutumia tourniquet kwa majeraha makubwa yanayotoa damu nyingi."},{"chapter":"Sura ya 13 Huduma ya Kwanza ya Dharura (Emergency Medical Response)","title":"Burns (Kuungua)","text":"Kuungua hugawanywa katika madaraja matatu: la kwanza (ngozi tu), la pili (ngozi na tishu za ndani kidogo), na la tatu (kina kirefu). Huduma ya kwanza ni kupoza jeraha kwa maji safi na kulifunika bila kupaka mafuta."},{"chapter":"Sura ya 13 Huduma ya Kwanza ya Dharura (Emergency Medical Response)","title":"Shock","text":"Hali hatari inayotokea mwili unapokosa mzunguko wa damu wa kutosha kufikia viungo muhimu — dalili ni ngozi baridi na yenye jasho, mapigo ya haraka, na kuchanganyikiwa kiakili."},{"chapter":"Sura ya 13 Huduma ya Kwanza ya Dharura (Emergency Medical Response)","title":"Fractures (Kuvunjika kwa Mifupa)","text":"Jinsi ya kutambua kiungo kilichovunjika na kukiweka katika hali thabiti (splinting) kabla ya kumpeleka mgonjwa hospitalini kupunguza maumivu na madhara zaidi."},{"chapter":"Sura ya 13 Huduma ya Kwanza ya Dharura (Emergency Medical Response)","title":"Spinal Injuries","text":"Majeraha ya uti wa mgongo huhitaji tahadhari kubwa sana — mgonjwa hatakiwi kusogezwa isipokuwa ni lazima kabisa, na akiwa ameshikiliwa vizuri ili kuepuka ulemavu wa kudumu."},{"chapter":"Sura ya 13 Huduma ya Kwanza ya Dharura (Emergency Medical Response)","title":"Casualty Transport","text":"Njia salama za kusafirisha mgonjwa kutoka eneo la tukio hadi kituo cha afya bila kuongeza madhara ya ziada kwenye jeraha lake."},{"chapter":"Sura ya 14 Kuzuia Moto (Fire Prevention)","title":"Fire Risk Assessment","text":"Tathmini ya hatari za moto katika jengo au eneo ili kubaini maeneo hatarishi mapema na kuweka mikakati sahihi ya kuzuia kabla haijatokea."},{"chapter":"Sura ya 14 Kuzuia Moto (Fire Prevention)","title":"Fire Hazards","text":"Vitu au hali zinazoongeza uwezekano wa moto kutokea — kama nyaya chakavu za umeme, uhifadhi mbaya wa mafuta, au uzembe wa jumla."},{"chapter":"Sura ya 14 Kuzuia Moto (Fire Prevention)","title":"Electrical Safety","text":"Kuepuka kuzidisha vifaa vingi kwenye soketi moja, kutumia nyaya bora zenye ubora, na kukagua mfumo wa umeme mara kwa mara."},{"chapter":"Sura ya 14 Kuzuia Moto (Fire Prevention)","title":"Gas Safety","text":"Kuhifadhi mitungi ya gesi mahali salama na penye hewa ya kutosha, kukagua uvujaji mara kwa mara, na kutumia vifaa vinavyokidhi viwango vya usalama."},{"chapter":"Sura ya 14 Kuzuia Moto (Fire Prevention)","title":"Kitchen Safety","text":"Kutosahau mafuta yanayochemka jikoni, kuweka vitu vinavyoweza kuwaka mbali na jiko, na kuwa na kizima moto cha jikoni kilicho karibu wakati wote."},{"chapter":"Sura ya 14 Kuzuia Moto (Fire Prevention)","title":"Industrial Safety","text":"Taratibu maalum za kuzuia moto viwandani zinazohusisha uhifadhi salama wa kemikali na mafunzo endelevu kwa wafanyakazi wote."},{"chapter":"Sura ya 14 Kuzuia Moto (Fire Prevention)","title":"Workplace Fire Prevention","text":"Sera na taratibu za ofisi au eneo la kazi zinazopunguza hatari ya moto, zikiwemo mazoezi ya mara kwa mara ya kutoka haraka."},{"chapter":"Sura ya 14 Kuzuia Moto (Fire Prevention)","title":"House Fire Prevention","text":"Hatua rahisi za nyumbani: kuzima mishumaa kabla ya kulala, kukagua nyaya za umeme mara kwa mara, na kuwa na smoke alarm inayofanya kazi vizuri."},{"chapter":"Sura ya 14 Kuzuia Moto (Fire Prevention)","title":"Fire Drills","text":"Mazoezi ya mara kwa mara ya kutoka jengoni haraka na kwa usalama endapo moto halisi utatokea, ili kila mtu ajue njia sahihi ya kutoka."},{"chapter":"Sura ya 14 Kuzuia Moto (Fire Prevention)","title":"Emergency Exits","text":"Njia za kutokea za dharura lazima ziwe wazi wakati wote, zenye alama zilizo wazi kuonekana, na zisiwe zimefungwa kwa kufuli au vizuizi."},{"chapter":"Sura ya 14 Kuzuia Moto (Fire Prevention)","title":"Fire Safety Inspection","text":"Ukaguzi rasmi wa mara kwa mara wa majengo kuhakikisha vinakidhi viwango vyote vya usalama wa moto vilivyowekwa kisheria."},{"chapter":"Sura ya 15 Mfumo wa Uongozi wa Tukio (Incident Command System)","title":"Incident Commander","text":"Kiongozi mkuu wa operesheni anayefanya maamuzi yote makubwa na kuratibu timu zote zilizopo katika eneo la tukio."},{"chapter":"Sura ya 15 Mfumo wa Uongozi wa Tukio (Incident Command System)","title":"Command Structure","text":"Mpangilio wa madaraka na majukumu unaohakikisha kila mtu anajua wa kuripoti kwa nani na jukumu lake mahususi ni lipi wakati wa operesheni."},{"chapter":"Sura ya 15 Mfumo wa Uongozi wa Tukio (Incident Command System)","title":"Operations","text":"Idara inayosimamia utekelezaji halisi wa kazi za uzimaji moto na uokoaji katika eneo la tukio moja kwa moja."},{"chapter":"Sura ya 15 Mfumo wa Uongozi wa Tukio (Incident Command System)","title":"Safety Officer","text":"Afisa anayefuatilia hatari zinazoweza kuwadhuru wazima moto, akiwa na mamlaka ya kusimamisha operesheni yoyote inayoonekana hatari kupita kiasi."},{"chapter":"Sura ya 15 Mfumo wa Uongozi wa Tukio (Incident Command System)","title":"Communications","text":"Mfumo wa mawasiliano kati ya timu mbalimbali eneo la tukio na kituo kikuu cha uratibu wa operesheni."},{"chapter":"Sura ya 15 Mfumo wa Uongozi wa Tukio (Incident Command System)","title":"Accountability","text":"Mfumo wa kufuatilia wapi kila mzima moto yupo wakati wowote wa operesheni ili kuhakikisha hakuna anayepotea au kuachwa nyuma."},{"chapter":"Sura ya 15 Mfumo wa Uongozi wa Tukio (Incident Command System)","title":"Sector/Group Assignments","text":"Kugawa eneo la tukio katika sehemu ndogo ndogo (sectors), kila moja ikiwa na kiongozi wake wa moja kwa moja anayeripoti kwa Incident Commander."},{"chapter":"Sura ya 15 Mfumo wa Uongozi wa Tukio (Incident Command System)","title":"Incident Objectives","text":"Malengo mahususi yanayowekwa mwanzoni mwa operesheni, mfano kuokoa watu kwanza, kisha kuzuia moto kuenea, kisha kuzima kabisa."},{"chapter":"Sura ya 15 Mfumo wa Uongozi wa Tukio (Incident Command System)","title":"Resource Management","text":"Usimamizi wa magari, vifaa, na wafanyakazi ili kuhakikisha vinatumika kwa ufanisi mkubwa bila upotevu wa muda au rasilimali."},{"chapter":"Sura ya 15 Mfumo wa Uongozi wa Tukio (Incident Command System)","title":"Emergency Evacuation","text":"Amri ya haraka ya kuwaondoa wazima moto wote eneo la ndani endapo hali inakuwa hatari sana, kwa mfano jengo linapokaribia kuanguka."},{"chapter":"Sura ya 16 Operesheni za Eneo la Moto (Fireground Operations)","title":"Size-Up","text":"Tathmini ya haraka ya hali ya moto mara tu ufikapo eneo la tukio — aina ya jengo, ukubwa wa moto, na hatari zilizopo zinazoonekana."},{"chapter":"Sura ya 16 Operesheni za Eneo la Moto (Fireground Operations)","title":"Risk Assessment","text":"Kupima hatari dhidi ya faida ya kuingia ndani ya jengo kabla ya kuamua mkakati sahihi wa operesheni utakaotumika."},{"chapter":"Sura ya 16 Operesheni za Eneo la Moto (Fireground Operations)","title":"Establishing Command","text":"Kuweka kiongozi wa tukio mara moja anapofika ili kuratibu operesheni nzima kwa mpangilio na uwazi."},{"chapter":"Sura ya 16 Operesheni za Eneo la Moto (Fireground Operations)","title":"Water Supply","text":"Kuhakikisha chanzo cha kutosha cha maji kinapatikana na kinaendelea kupatikana kwa muda wote wa operesheni."},{"chapter":"Sura ya 16 Operesheni za Eneo la Moto (Fireground Operations)","title":"Hose Deployment","text":"Kunyoosha na kuweka hose kwa mpangilio sahihi ili kufikia eneo la moto kwa haraka bila vikwazo."},{"chapter":"Sura ya 16 Operesheni za Eneo la Moto (Fireground Operations)","title":"Search (Utafutaji)","text":"Kutafuta watu waliopo ndani ya jengo sambamba na operesheni ya uzimaji, siyo baada yake kukamilika."},{"chapter":"Sura ya 16 Operesheni za Eneo la Moto (Fireground Operations)","title":"Ventilation","text":"Kutoa moshi na joto kutoka jengoni ili kuboresha mwonekano na kupunguza hatari za ziada kwa timu iliyoko ndani."},{"chapter":"Sura ya 16 Operesheni za Eneo la Moto (Fireground Operations)","title":"Suppression","text":"Uzimaji halisi wa moto kwa kutumia maji au dawa nyingine zinazofaa kwa aina ya moto uliopo."},{"chapter":"Sura ya 16 Operesheni za Eneo la Moto (Fireground Operations)","title":"Rescue","text":"Kutoa watu waliokwama au wasiojiweza kutoka eneo la hatari kwa haraka na kwa usalama iwezekanavyo."},{"chapter":"Sura ya 16 Operesheni za Eneo la Moto (Fireground Operations)","title":"Exposure Protection","text":"Kulinda majengo au vitu vya karibu visiathiriwe na moto unaoendelea kuwaka katika eneo la tukio."},{"chapter":"Sura ya 16 Operesheni za Eneo la Moto (Fireground Operations)","title":"Overhaul","text":"Hatua ya mwisho ya kuhakikisha hakuna sehemu zinazoendelea kuwaka polepole baada ya moto mkuu kudhibitiwa kikamilifu."},{"chapter":"Sura ya 17 Uchunguzi wa Moto (Fire Investigation)","title":"Scene Preservation","text":"Kutunza eneo la moto bila kubadilishwa au kuguswa ili kuruhusu uchunguzi sahihi wa chanzo halisi cha moto."},{"chapter":"Sura ya 17 Uchunguzi wa Moto (Fire Investigation)","title":"Fire Origin","text":"Kutambua mahali hasa moto ulipoanzia kwa kuchunguza mifumo ya uchomaji na kiwango cha uharibifu katika maeneo tofauti."},{"chapter":"Sura ya 17 Uchunguzi wa Moto (Fire Investigation)","title":"Fire Cause","text":"Kubaini sababu halisi ya moto — iwe ni ajali, uzembe, hitilafu ya kiufundi, au uchomaji wa makusudi."},{"chapter":"Sura ya 17 Uchunguzi wa Moto (Fire Investigation)","title":"Evidence (Ushahidi)","text":"Kukusanya na kuhifadhi vitu vinavyoweza kusaidia kubaini chanzo na sababu ya moto kwa usahihi wa hali ya juu."},{"chapter":"Sura ya 17 Uchunguzi wa Moto (Fire Investigation)","title":"Burn Patterns","text":"Mifumo ya uchomaji juu ya kuta na sakafu inayosaidia mchunguzi kutambua mwelekeo na chanzo cha moto kilipoanzia."},{"chapter":"Sura ya 17 Uchunguzi wa Moto (Fire Investigation)","title":"Witness Information","text":"Taarifa kutoka kwa watu waliojionea tukio moja kwa moja, zinazosaidia kujenga picha kamili ya jinsi tukio lilivyotokea."},{"chapter":"Sura ya 17 Uchunguzi wa Moto (Fire Investigation)","title":"Photography","text":"Kupiga picha za eneo zima kabla ya kuguswa kwa ajili ya kumbukumbu ya kudumu na ushahidi wa kisheria."},{"chapter":"Sura ya 17 Uchunguzi wa Moto (Fire Investigation)","title":"Documentation","text":"Kuandika taarifa zote za uchunguzi kwa mpangilio na usahihi mkubwa kwa matumizi ya baadaye ya kisheria au kielimu."},{"chapter":"Sura ya 17 Uchunguzi wa Moto (Fire Investigation)","title":"Chain of Custody","text":"Kufuatilia ni nani aliyeshika ushahidi na lini, ili kuhakikisha uadilifu wake unabaki salama endapo tukio litafika mahakamani."},{"chapter":"Sura ya 17 Uchunguzi wa Moto (Fire Investigation)","title":"Fire Investigation Report","text":"Ripoti rasmi ya mwisho inayoeleza matokeo yote ya uchunguzi kuhusu chanzo na sababu halisi ya moto uliotokea."},{"chapter":"Sura ya 18 Mawasiliano ya Dharura (Emergency Communication)","title":"Radio Procedures","text":"Taratibu sahihi za kutumia redio wakati wa operesheni ili kuepuka mkanganyiko na kuokoa muda muhimu wa dharura."},{"chapter":"Sura ya 18 Mawasiliano ya Dharura (Emergency Communication)","title":"Standard Terminology","text":"Msamiati maalum wa kiufundi unaotumika kuhakikisha kila mtu eneo la tukio anaelewana kwa haraka na kwa uwazi bila utata."},{"chapter":"Sura ya 18 Mawasiliano ya Dharura (Emergency Communication)","title":"Mayday","text":"Neno maalum linaloashiria dharura kubwa inayohatarisha maisha ya mzima moto mwenyewe, linalotolewa kipaumbele cha juu kabisa kwenye redio."},{"chapter":"Sura ya 18 Mawasiliano ya Dharura (Emergency Communication)","title":"Emergency Signals","text":"Ishara maalum za sauti au mwanga zinazotumika kuwasiliana katika mazingira yenye kelele nyingi ambapo redio pekee haitoshi."},{"chapter":"Sura ya 18 Mawasiliano ya Dharura (Emergency Communication)","title":"Dispatch","text":"Kituo kinachopokea taarifa za dharura kutoka kwa wananchi na kutuma timu husika haraka kuelekea eneo la tukio."},{"chapter":"Sura ya 18 Mawasiliano ya Dharura (Emergency Communication)","title":"Situation Reports","text":"Taarifa za mara kwa mara zinazotolewa na kiongozi wa tukio kuhusu maendeleo ya operesheni kwa kituo kikuu."},{"chapter":"Sura ya 18 Mawasiliano ya Dharura (Emergency Communication)","title":"Mawasiliano Kati ya Timu","text":"Uratibu wa karibu kati ya timu tofauti — uzimaji, uokoaji, na matibabu — ili kuepusha mgongano wa kazi eneo moja."},{"chapter":"Sura ya 18 Mawasiliano ya Dharura (Emergency Communication)","title":"Mawasiliano Wakati wa Matukio Makubwa","text":"Mikakati maalum ya mawasiliano inapohitajika kuratibu timu nyingi kutoka vituo tofauti wakati wa maafa makubwa."},{"chapter":"Sura ya 19 Afya na Usalama Kazini (Occupational Health & Safety)","title":"Firefighter Injuries","text":"Majeraha ya kawaida yanayowapata wazima moto kazini — kuungua, kuvunjika kwa mifupa, na majeraha ya mgongo kutokana na kubeba uzito mkubwa."},{"chapter":"Sura ya 19 Afya na Usalama Kazini (Occupational Health & Safety)","title":"Heat Stress","text":"Hali hatari inayotokana na joto kali la PPE pamoja na mazingira ya moto, inayoweza kusababisha kizunguzungu, uchovu wa haraka, au hata kuzirai."},{"chapter":"Sura ya 19 Afya na Usalama Kazini (Occupational Health & Safety)","title":"Dehydration","text":"Upungufu wa maji mwilini unaotokana na jasho jingi wakati wa operesheni ndefu — huhitaji unywaji wa maji wa mara kwa mara kabla na baada ya kazi."},{"chapter":"Sura ya 19 Afya na Usalama Kazini (Occupational Health & Safety)","title":"Smoke Exposure","text":"Madhara ya kuvuta moshi kwa muda mrefu, yakiwemo athari za mapafu na hatari ya sumu ya carbon monoxide mwilini."},{"chapter":"Sura ya 19 Afya na Usalama Kazini (Occupational Health & Safety)","title":"PPE Safety","text":"Umuhimu wa kutumia PPE kwa usahihi kila wakati ili kuepuka majeraha yasiyo ya lazima yanayoweza kuzuilika."},{"chapter":"Sura ya 19 Afya na Usalama Kazini (Occupational Health & Safety)","title":"SCBA Safety","text":"Taratibu za usalama za kutumia SCBA kwa usahihi ili kuepuka upungufu wa hewa ghafla wakati wa operesheni ndani ya moshi."},{"chapter":"Sura ya 19 Afya na Usalama Kazini (Occupational Health & Safety)","title":"Rehabilitation","text":"Muda wa mapumziko unaopatiwa mzima moto pamoja na maji na chakula baada ya operesheni ndefu ili mwili wake upone haraka."},{"chapter":"Sura ya 19 Afya na Usalama Kazini (Occupational Health & Safety)","title":"Mental Wellbeing","text":"Afya ya akili ya wazima moto baada ya kushuhudia matukio magumu — msaada wa kisaikolojia ni sehemu muhimu ya huduma kwa wafanyakazi hawa."},{"chapter":"Sura ya 19 Afya na Usalama Kazini (Occupational Health & Safety)","title":"Fatigue Management","text":"Kudhibiti uchovu wa wazima moto kwa kuhakikisha zamu na mapumziko ya kutosha yanapangwa vizuri."},{"chapter":"Sura ya 19 Afya na Usalama Kazini (Occupational Health & Safety)","title":"Post-Incident Procedures","text":"Taratibu za baada ya tukio zikiwemo kuripoti, kusafisha vifaa vilivyotumika, na kupitia tukio kwa lengo la mafunzo zaidi."},{"chapter":"Sura ya 20 Uripoti na Uandishi wa Nyaraka (Incident Reporting)","title":"Incident Report","text":"Ripoti kuu inayoeleza tukio zima kuanzia lilipoanzia, hatua zilizochukuliwa, hadi lilivyomalizika."},{"chapter":"Sura ya 20 Uripoti na Uandishi wa Nyaraka (Incident Reporting)","title":"Fire Report","text":"Ripoti mahususi kuhusu moto wenyewe — chanzo, ukubwa, muda uliotumika kuuzima, na kiwango cha uharibifu uliotokea."},{"chapter":"Sura ya 20 Uripoti na Uandishi wa Nyaraka (Incident Reporting)","title":"Rescue Report","text":"Ripoti ya operesheni za uokoaji zilizofanyika na matokeo yaliyopatikana kwa waathirika."},{"chapter":"Sura ya 20 Uripoti na Uandishi wa Nyaraka (Incident Reporting)","title":"Accident Report","text":"Ripoti ya ajali zilizotokea wakati wa operesheni, ikiwemo majeraha kwa wazima moto wenyewe."},{"chapter":"Sura ya 20 Uripoti na Uandishi wa Nyaraka (Incident Reporting)","title":"Casualty Report","text":"Taarifa kuhusu waathirika wote — idadi, hali zao za kiafya, na matibabu waliyopewa eneo la tukio."},{"chapter":"Sura ya 20 Uripoti na Uandishi wa Nyaraka (Incident Reporting)","title":"Equipment Report","text":"Taarifa ya vifaa vilivyotumika, vilivyoharibika, au vinavyohitaji matengenezo baada ya operesheni kukamilika."},{"chapter":"Sura ya 20 Uripoti na Uandishi wa Nyaraka (Incident Reporting)","title":"Damage Assessment","text":"Tathmini ya kiwango cha uharibifu uliosababishwa na moto kwa mali na miundombinu iliyoathirika."},{"chapter":"Sura ya 20 Uripoti na Uandishi wa Nyaraka (Incident Reporting)","title":"Witness Statements","text":"Maelezo rasmi yaliyoandikwa kutoka kwa mashahidi wa tukio kwa ajili ya kumbukumbu na uchunguzi zaidi."},{"chapter":"Sura ya 20 Uripoti na Uandishi wa Nyaraka (Incident Reporting)","title":"Incident Timeline","text":"Mpangilio wa matukio kwa mfuatano wa muda, tangu taarifa ya awali ilipopokelewa hadi operesheni kukamilika kabisa."},{"chapter":"Sura ya 20 Uripoti na Uandishi wa Nyaraka (Incident Reporting)","title":"Lessons Learned","text":"Mapitio ya tukio zima kubaini ni nini kilifanya kazi vizuri na ni nini kinahitaji kuboreshwa kwa matukio ya siku zijazo."},{"chapter":"Sura ya 21 Magari ya Zimamoto (Fire Service Vehicles)","title":"Fire Engine","text":"Gari kuu la zimamoto lenye pump, hose, na hifadhi ya maji kwa ajili ya uzimaji wa moto wa haraka."},{"chapter":"Sura ya 21 Magari ya Zimamoto (Fire Service Vehicles)","title":"Water Tender","text":"Gari lenye uwezo wa kubeba kiasi kikubwa cha maji kwa ajili ya maeneo yasiyo na hydrant za kutosha karibu."},{"chapter":"Sura ya 21 Magari ya Zimamoto (Fire Service Vehicles)","title":"Rescue Vehicle","text":"Gari lenye vifaa maalum vya uokoaji kama zana za kukata chuma na vifaa vya operesheni za kimo."},{"chapter":"Sura ya 21 Magari ya Zimamoto (Fire Service Vehicles)","title":"Aerial Ladder","text":"Gari lenye ngazi ndefu maalum inayoweza kufikia sakafu za juu za majengo marefu kwa uokoaji au shambulizi la moto."},{"chapter":"Sura ya 21 Magari ya Zimamoto (Fire Service Vehicles)","title":"HazMat Vehicle","text":"Gari lenye vifaa maalum vya kukabiliana na vitu hatari na kemikali mbalimbali kwa usalama."},{"chapter":"Sura ya 21 Magari ya Zimamoto (Fire Service Vehicles)","title":"Ambulance","text":"Gari la huduma ya kwanza linalotoa matibabu ya dharura mahala pa tukio na kusafirisha wagonjwa hospitalini."},{"chapter":"Sura ya 21 Magari ya Zimamoto (Fire Service Vehicles)","title":"Pump Operation","text":"Ujuzi wa kuendesha pump kwa usahihi kuhakikisha shinikizo sahihi la maji linafikishwa kwenye hose bila kupungua au kuzidi."},{"chapter":"Sura ya 21 Magari ya Zimamoto (Fire Service Vehicles)","title":"Vehicle Checks","text":"Ukaguzi wa kila siku wa magari kuhakikisha yako tayari kabisa kwa dharura wakati wowote bila kuchelewesha operesheni."},{"chapter":"Sura ya 21 Magari ya Zimamoto (Fire Service Vehicles)","title":"Equipment Inventory","text":"Orodha kamili ya vifaa vilivyopo kwenye gari kuhakikisha hakuna kinachokosekana kabla ya kuondoka kuelekea tukio."},{"chapter":"Sura ya 21 Magari ya Zimamoto (Fire Service Vehicles)","title":"Usalama wa Uendeshaji wa Dharura","text":"Taratibu za kuendesha gari kwa kasi salama wakati wa dharura bila kuhatarisha maisha ya watumiaji wengine wa barabara."},{"chapter":"Sura ya 22 Upatikanaji wa Maji na Hydraulics","title":"Hydrants","text":"Vituo vya maji vilivyowekwa mitaani kwa ajili ya matumizi ya haraka wakati wa dharura ya moto."},{"chapter":"Sura ya 22 Upatikanaji wa Maji na Hydraulics","title":"Water Sources","text":"Vyanzo mbalimbali vya maji kama mabwawa, mito, na matangi ya kuhifadhi kwa ajili ya operesheni pale hydrant hazipo karibu."},{"chapter":"Sura ya 22 Upatikanaji wa Maji na Hydraulics","title":"Pump Operations","text":"Uendeshaji sahihi wa pump kuhakikisha maji yanasukumwa kwa shinikizo linalofaa kufikia eneo la moto kwa ufanisi."},{"chapter":"Sura ya 22 Upatikanaji wa Maji na Hydraulics","title":"Pressure (Shinikizo)","text":"Kiasi cha nguvu kinachosukuma maji kupitia hose — shinikizo la chini sana au la juu mno huathiri ufanisi wa uzimaji moto."},{"chapter":"Sura ya 22 Upatikanaji wa Maji na Hydraulics","title":"Flow Rate","text":"Kiasi cha maji kinachopita kwa dakika — muhimu kwa kupanga ni hose na nozzle zipi zinazofaa kutumika kwa hali fulani."},{"chapter":"Sura ya 22 Upatikanaji wa Maji na Hydraulics","title":"Friction Loss","text":"Upotevu wa shinikizo unaotokana na msuguano wa maji ndani ya hose, unaoongezeka kadri urefu wa hose unavyoongezeka."},{"chapter":"Sura ya 22 Upatikanaji wa Maji na Hydraulics","title":"Hose Diameter","text":"Ukubwa wa kipenyo cha hose huathiri moja kwa moja kiasi cha maji kinachoweza kupita na shinikizo linalobaki mwishoni."},{"chapter":"Sura ya 22 Upatikanaji wa Maji na Hydraulics","title":"Relay Pumping","text":"Kutumia pump kadhaa kwa mfuatano kusukuma maji umbali mrefu zaidi pale chanzo kimoja hakitoshi peke yake."},{"chapter":"Sura ya 22 Upatikanaji wa Maji na Hydraulics","title":"Water Shuttle","text":"Kusafirisha maji kwa magari ya tanker kutoka chanzo hadi eneo la moto pale hydrant hazipatikani karibu na tukio."},{"chapter":"Sura ya 22 Upatikanaji wa Maji na Hydraulics","title":"Tank Operations","text":"Matumizi ya matangi ya maji yaliyobebwa na gari kwa ajili ya uzimaji wa haraka kabla ya chanzo kingine cha maji kupatikana."},{"chapter":"Sura ya 23 Dharura Maalum (Special Emergencies)","title":"Wildland/Forest Fires","text":"Moto wa misitu unaoenea kwa haraka sana kwa msaada wa upepo na mimea kavu — huhitaji mikakati tofauti kabisa na moto wa majengo."},{"chapter":"Sura ya 23 Dharura Maalum (Special Emergencies)","title":"Electrical Fires","text":"Moto unaotokana na hitilafu za umeme, huhitaji kuzimwa kwa vifaa visivyoongoza umeme ili kuepuka mshtuko."},{"chapter":"Sura ya 23 Dharura Maalum (Special Emergencies)","title":"Gas Explosions","text":"Milipuko inayotokana na uvujaji wa gesi — huhitaji tahadhari kubwa sana ya kuzuia chanzo chochote cha moto kuwa karibu."},{"chapter":"Sura ya 23 Dharura Maalum (Special Emergencies)","title":"Chemical Incidents","text":"Matukio yanayohusisha uvujaji au mlipuko wa kemikali hatari, yanayohitaji timu maalum ya HazMat kushughulikia."},{"chapter":"Sura ya 23 Dharura Maalum (Special Emergencies)","title":"Flood Rescue","text":"Uokoaji wa watu walioathiriwa na mafuriko, unaohitaji mashua maalum na vifaa vya kuelea vilivyoidhinishwa."},{"chapter":"Sura ya 23 Dharura Maalum (Special Emergencies)","title":"Building Collapse","text":"Uokoaji wa watu waliozikwa chini ya jengo lililoanguka, unaohitaji vifaa maalum vya kutafuta na kuchimbua kwa uangalifu mkubwa."},{"chapter":"Sura ya 23 Dharura Maalum (Special Emergencies)","title":"Aircraft Incidents","text":"Dharura zinazohusisha ndege — huhitaji timu maalum na vifaa vya uzimaji vya haraka sana kwa sababu ya kiasi kikubwa cha mafuta."},{"chapter":"Sura ya 23 Dharura Maalum (Special Emergencies)","title":"Industrial Emergencies","text":"Dharura viwandani zinazoweza kuhusisha mchanganyiko wa moto, kemikali, na mashine hatari kwa wakati mmoja."},{"chapter":"Sura ya 23 Dharura Maalum (Special Emergencies)","title":"Tunnel Fires","text":"Moto ndani ya vichuguu ni hatari zaidi kwa sababu ya nafasi finyu na moshi kujaa haraka bila njia rahisi ya kutoka."},{"chapter":"Sura ya 23 Dharura Maalum (Special Emergencies)","title":"High-Rise Emergencies","text":"Dharura za majengo marefu zinazohitaji mikakati maalum ya uokoaji na usafirishaji wa maji kwenda ghorofa za juu."},{"chapter":"Sura ya 24 Mafunzo ya Vitendo (Practical Training)","title":"Hose Drills","text":"Mazoezi ya kunyoosha, kubeba, na kutumia hose kwa haraka na usahihi wa hali ya juu."},{"chapter":"Sura ya 24 Mafunzo ya Vitendo (Practical Training)","title":"Ladder Drills","text":"Mazoezi ya kupandisha na kutumia ngazi kwa usalama katika hali mbalimbali za kimo."},{"chapter":"Sura ya 24 Mafunzo ya Vitendo (Practical Training)","title":"Search Drills","text":"Mazoezi ya kutafuta watu ndani ya moshi bandia au giza kwa kutumia mbinu sahihi za utafutaji."},{"chapter":"Sura ya 24 Mafunzo ya Vitendo (Practical Training)","title":"SCBA Drills","text":"Mazoezi ya kuvaa na kutumia SCBA haraka na kwa usahihi hata chini ya shinikizo la muda mfupi."},{"chapter":"Sura ya 24 Mafunzo ya Vitendo (Practical Training)","title":"Extinguisher Drills","text":"Mazoezi ya matumizi sahihi ya vizima moto kwa aina mbalimbali za moto zilizoelezwa awali."},{"chapter":"Sura ya 24 Mafunzo ya Vitendo (Practical Training)","title":"Rescue Drills","text":"Mazoezi ya mbinu za kubeba na kuvuta watu kutoka maeneo ya hatari kwa usalama."},{"chapter":"Sura ya 24 Mafunzo ya Vitendo (Practical Training)","title":"CPR Drills","text":"Mazoezi ya mara kwa mara ya ufufuaji wa moyo na mapafu kwa kutumia vifaa maalum vya mazoezi."},{"chapter":"Sura ya 24 Mafunzo ya Vitendo (Practical Training)","title":"Vehicle Extrication","text":"Mazoezi ya kutumia zana za kukata na kubana chuma kwenye magari halisi ya mazoezi."},{"chapter":"Sura ya 24 Mafunzo ya Vitendo (Practical Training)","title":"Pump Operations","text":"Mazoezi ya kuendesha pump na kudhibiti shinikizo la maji kwa usahihi wa hali ya juu."},{"chapter":"Sura ya 24 Mafunzo ya Vitendo (Practical Training)","title":"Fireground Simulations","text":"Mazoezi kamili yanayoiga hali halisi ya moto ili kujenga uzoefu na kujiamini kabla ya kukabili tukio halisi."},{"chapter":"Sura ya 25 Mitihani na Mazoezi","title":"Muundo wa Jumla","text":"Mfumo kamili unaweza kuwa na maswali zaidi ya 1,000 yaliyogawanywa katika ngazi tatu: Beginner (Mwanzo), Intermediate (Kati), na Advanced (Juu), ili kila mwanafunzi aendelee hatua kwa hatua kulingana na uwezo wake."},{"chapter":"Sura ya 25 Mitihani na Mazoezi","title":"Multiple Choice Questions","text":"Maswali ya kuchagua jibu sahihi kati ya chaguo kadhaa — hutumika kupima uelewa wa haraka wa dhana mbalimbali zilizofundishwa."},{"chapter":"Sura ya 25 Mitihani na Mazoezi","title":"True/False","text":"Maswali ya Kweli/Uongo yanayopima uelewa wa haraka wa taarifa mahususi za kiufundi bila kutoa chaguo nyingi."},{"chapter":"Sura ya 25 Mitihani na Mazoezi","title":"Scenario-Based Questions","text":"Maswali yanayoweka mwanafunzi katika hali halisi ya tukio na kumhitaji aamue hatua sahihi za kuchukua kwa wakati huo."},{"chapter":"Sura ya 25 Mitihani na Mazoezi","title":"Practical Assessment","text":"Tathmini ya vitendo inayopima uwezo wa kutumia vifaa na mbinu halisi, siyo maarifa ya kinadharia pekee."},{"chapter":"Sura ya 25 Mitihani na Mazoezi","title":"Flashcards","text":"Kadi fupi za kukariri istilahi na dhana muhimu kwa haraka wakati wa marudio."},{"chapter":"Sura ya 25 Mitihani na Mazoezi","title":"Mock Exams","text":"Mitihani ya majaribio inayofanana kabisa na mtihani halisi kumjenga mwanafunzi kiakili na kimuda kabla ya siku halisi."},{"chapter":"Sura ya 25 Mitihani na Mazoezi","title":"Answer Explanations","text":"Maelezo ya kina kwa kila jibu ili mwanafunzi aelewe sababu ya jibu sahihi, siyo kukariri tu bila uelewa."},{"chapter":"Sura ya 25 Mitihani na Mazoezi","title":"Progress Tracking","text":"Ufuatiliaji wa maendeleo ya mwanafunzi kutoka ngazi ya Beginner hadi Advanced kwa kipindi cha muda fulani."}];

  // ============================================================
  // 2) KNOWLEDGE: App usage FAQ
  // ============================================================
  const APP_FAQ = [{"id":"newreport","keys":["ripoti mpya","unda ripoti","anzisha ripoti","anza ripoti","kuandika ripoti","new report","tengeneza ripoti"],"a":"Ili kuanza ripoti mpya: bonyeza kitufe \"+ Ripoti Mpya\" kwenye Dashboard. Utaongozwa hatua kwa hatua: Taarifa za Tukio, Eneo, Muda, Vyombo, Majeruhi, Vifo, Mashahidi, Hatua Zilizochukuliwa, Chanzo, Hasara, Mafuta/Rasilimali, Vikosi Vingine, Changamoto, Picha, Wafanyakazi, kisha Kamilisha/Hakiki. Ripoti huhifadhiwa yenyewe (Auto-Save) unapoandika, hata bila internet.","action":{"label":"➕ Fungua Ripoti Mpya","hash":"#/report/new"}},{"id":"autosave","keys":["auto-save","autosave","inahifadhi yenyewe","imehifadhiwa","kuhifadhi ripoti","je ripoti inahifadhiwa lini"],"a":"Auto-Save huhifadhi ripoti yako moja kwa moja unapoandika, bila kubonyeza \"Save\". Muda wake unaweza kubadilishwa kwenye Settings → Auto-Save (defaulti ni milisekunde 600). Data zote zinabaki kwenye kifaa chako (IndexedDB), hazitumwi seva yoyote."},{"id":"status_flow","keys":["hali za ripoti","status ya ripoti","draft ni nini","in progress ni nini","completed ni nini","archived ni nini","hatua za status"],"a":"Kila ripoti ina hali (status) moja kati ya: DRAFT (bado inaandikwa), IN_PROGRESS (imeanza kujazwa), COMPLETED (imekamilika baada ya Review), na ARCHIVED (imehifadhiwa kwa kumbukumbu baada ya kukamilika). Unaweza kuona/kuchuja kwa hali kwenye ukurasa wa Ripoti."},{"id":"pdf_share","keys":["pdf","kutengeneza pdf","kupeleka whatsapp","share ripoti","kunakili ripoti","copy ripoti","tuma ripoti","export pdf"],"a":"Kwenye ripoti iliyokamilika (au wakati wowote), fungua ripoti kisha tumia vitufe vya PDF, Copy, au Share. PDF hutengenezwa moja kwa moja kwenye kifaa (hakuna maktaba ya nje inayohitaji internet). Share hukuruhusu kutuma kupitia WhatsApp, barua pepe, au chaguo lolote la Share la simu yako."},{"id":"archive","keys":["archive ni nini","kuhifadhi ripoti","jinsi ya archive","zilizohifadhiwa"],"a":"Archive huhifadhi ripoti zilizokamilika kwa ajili ya kumbukumbu ya baadaye bila kuzichanganya na ripoti zinazoendelea. Unaweza kuziona kwenye Dashboard → Archive, au Ripoti → chuja \"ARCHIVED\".","action":{"label":"🗄️ Fungua Archive","hash":"#/reports?status=ARCHIVED"}},{"id":"trash","keys":["trash","tupio","kufuta ripoti","kurejesha ripoti","restore ripoti","futa kabisa","permanent delete"],"a":"Ripoti ukiifuta, huenda kwanza Trash (haifutiki kabisa mara moja). Kwenye Trash unaweza \"Restore\" kuirejesha, au kuifuta kabisa. Kufuta kabisa kunahitaji Password ya Kufuta uliyoiweka kwenye Settings → Usalama wa Kufuta, kwa ulinzi wa ziada.","action":{"label":"🗑️ Fungua Trash","hash":"#/trash"}},{"id":"backup","keys":["backup","export","kuhamisha data","kubadilisha simu","import backup","csv","kupakua data"],"a":"Kwenye Export/Backup unaweza: (1) Export Full Backup (JSON) — inahamisha ripoti zote, picha na settings kwenye faili moja unaloweza kulihifadhi au kulihamishia kifaa kingine, (2) Import Backup — kurejesha kutoka faili la .json (huchagua Weka Iliyopo / Badilisha / Tengeneza Nakala ukigongana na data iliyopo), na (3) Export CSV ya ripoti zote. Fanya backup mara kwa mara ili usipoteze data ukibadilisha kifaa au kufuta data ya kivinjari.","action":{"label":"⬇️ Fungua Export/Backup","hash":"#/backup"}},{"id":"search_stats","keys":["tafuta ripoti","search","takwimu","statistics","kuchuja ripoti"],"a":"Search hukuruhusu kutafuta ripoti kwa namba, tarehe, eneo, au jina la anayeripoti. Statistics huonyesha muhtasari wa idadi ya ripoti kwa hali, aina ya tukio na muda. Unaweza pia kuniuliza mimi moja kwa moja, kwa mfano \"ripoti ngapi mwezi huu\" au \"matukio ngapi ya moto\", nitakupa jibu la moja kwa moja kutoka kwenye data yako.","action":{"label":"🔍 Fungua Search","hash":"#/search"}},{"id":"settings","keys":["settings","mipangilio","jina la kituo","mkoa wilaya","dark mode","muonekano wa giza","namba ya ripoti"],"a":"Settings ina: Station Defaults (jina la kituo, mkoa, wilaya, chombo cha kawaida, muundo wa namba ya ripoti), Muonekano (Dark Mode), Auto-Save (muda + Backup Reminder), na Faragha (App Lock kwa PIN, kuficha taarifa nyeti kwenye orodha, na Password ya Kufuta).","action":{"label":"⚙️ Fungua Settings","hash":"#/settings"}},{"id":"pin_lock","keys":["pin","app lock","kufunga app","password ya kufuta","nywila","kufungua app"],"a":"Kwenye Settings → Faragha unaweza kuwasha \"Enable App Lock\" na kuweka PIN ya tarakimu 4 ili kulinda ufikiaji wa app (ni ulinzi wa faragha tu, si encryption ya data). Kando na hilo, kuna \"Password ya Kufuta\" tofauti inayohitajika kabla ya kufuta ripoti kabisa kutoka Trash — hii inazuia kufuta kwa bahati mbaya."},{"id":"offline_storage","keys":["data zinahifadhiwa wapi","offline ni nini","bila internet","seva","indexeddb","je data yangu iko salama","je app inahitaji internet"],"a":"App hii hufanya kazi 100% bila internet. Data zote (ripoti, picha, settings) zinahifadhiwa ndani ya kifaa chako pekee, kwenye hifadhi ya kivinjari inayoitwa IndexedDB — hazitumwi kwenye seva yoyote wala hazipatikani kwa mtu mwingine. Ukifuta data ya kivinjari (clear site data) au kubadilisha kifaa bila kufanya Backup, data hizo zitapotea, kwa hiyo tumia Export/Backup mara kwa mara."},{"id":"install_apk","keys":["apk","kupakua app","install app","android app","pakua programu"],"a":"Kwenye Settings kuna kitufe cha \"⬇️ Pakua APK\" kinachokuruhusu kupakua toleo la Android (APK) la app hii, ili uweze kuisakinisha moja kwa moja kwenye simu bila kupitia Play Store."},{"id":"steps_list","keys":["hatua za ripoti ni zipi","sehemu za ripoti","form ina sehemu gani","je ripoti ina hatua ngapi"],"a":"Ripoti ina hatua 16 zinazofuatana: Taarifa za Tukio, Eneo la Tukio, Muda wa Operesheni, Vyombo/Vitu Vilivyohusika, Majeruhi, Vifo, Mashahidi, Hatua Zilizochukuliwa, Chanzo cha Tukio, Hasara, Mafuta/Rasilimali, Vikosi Vingine, Changamoto, Picha/Ushahidi, Wafanyakazi (Crew), na mwisho Kamilisha/Hakiki."},{"id":"sadebooks","keys":["sadebooks","link ya vitabu","maktaba ya vitabu"],"a":"Kiungo cha 📚 SadeBooks kinapatikana juu ya Archive, Trash na Settings, na hufungua tab mpya kuelekea maktaba ya vitabu ya SadeBooks. Kiungo hiki pekee kinahitaji internet — sehemu nyingine yote ya app inaendelea kufanya kazi offline."},{"id":"fire_education","keys":["kitabu cha moto","sayansi ya moto","fire education","mafunzo ya moto","masomo ya moto","elimu ya moto"],"a":"Kuna Kitabu cha Kiada cha Elimu na Mafunzo ya Moto (fire_education.html) chenye sura kuhusu Sayansi ya Moto, Madaraja ya Moto (Fire Classes), Vizima Moto, Vifaa vya Kuzimia Moto, PPE, SCBA, na mbinu za mashambulizi ya moto. Uliza swali lolote la kiufundi kuhusu moto — kwa mfano \"PASS technique ni nini\" au \"tofauti ya Class A na Class B\" — nitakujibu moja kwa moja kutoka kwenye kitabu hicho, bila internet."},{"id":"who_are_you","keys":["wewe ni nani","je wewe ni ai","unafanyaje kazi","je unatumia internet","je unatumia api","unajua nini"],"a":"Mimi ni Incident AI — msaidizi wa ndani wa app hii ya Fire Report. Sisomi wala kutuma data popote nje ya kifaa chako, na situmii huduma yoyote ya nje ya AI (hakuna API). Ninajibu maswali kwa kutumia: (1) taarifa za jinsi app hii inavyofanya kazi, (2) Kitabu cha Sayansi ya Moto kilichomo ndani ya app, na (3) takwimu halisi za ripoti zako zilizohifadhiwa kwenye kifaa hiki."}];

  // ============================================================
  // 3) LIVE DATA: read-only stats from the user's own reports (IndexedDB)
  // ============================================================
  async function getStats() {
    const db = window.RescueDB;
    if (!db) return null;
    let reports = [];
    let trash = [];
    try {
      reports = await db.getAllReports();
    } catch (e) { reports = []; }
    try {
      trash = await db.getAllTrash();
    } catch (e) { trash = []; }

    const today = new Date().toDateString();
    const thisMonth = new Date().toISOString().slice(0, 7);
    const byStatus = { DRAFT: 0, IN_PROGRESS: 0, COMPLETED: 0, ARCHIVED: 0 };
    const byType = {};
    let todayCount = 0, monthCount = 0, fatalities = 0, casualties = 0;
    let latest = null;

    reports.forEach((r) => {
      if (byStatus[r.status] !== undefined) byStatus[r.status]++;
      const type = (r.incident && r.incident.type) || "Isiyobainishwa";
      byType[type] = (byType[type] || 0) + 1;
      if (r.createdAt && new Date(r.createdAt).toDateString() === today) todayCount++;
      if ((r.createdAt || "").slice(0, 7) === thisMonth) monthCount++;
      if (r.fatality && Array.isArray(r.fatality.deceased)) fatalities += r.fatality.deceased.length;
      if (Array.isArray(r.casualties)) casualties += r.casualties.length;
      if (!latest || (r.updatedAt || "") > (latest.updatedAt || "")) latest = r;
    });

    let topType = null, topTypeCount = 0;
    Object.keys(byType).forEach((t) => {
      if (byType[t] > topTypeCount) { topType = t; topTypeCount = byType[t]; }
    });

    return {
      total: reports.length,
      byStatus, byType, todayCount, monthCount,
      fatalities, casualties, trashCount: trash.length,
      topType, topTypeCount, latest,
    };
  }

  // Each intent: a test regex + a function(stats) -> {text, action?}
  const DATA_INTENTS = [
    {
      test: /^(?!.*(vifo|wafariki|fatalit|majeruhi|casualt|waliojeruhiwa)).*((ripoti|report).*(ngapi|idadi|jumla)|jumla ya ripoti|idadi ya ripoti|total reports|how many reports)/i,
      run: (s) => ({ text: `Kwa sasa una jumla ya ${s.total} ripoti kwenye kifaa hiki: ${s.byStatus.DRAFT} Drafti, ${s.byStatus.IN_PROGRESS} zinazoendelea, ${s.byStatus.COMPLETED} zilizokamilika, na ${s.byStatus.ARCHIVED} zilizohifadhiwa (Archive). Kuna pia ${s.trashCount} kwenye Trash.` }),
    },
    {
      test: /drafti|rasimu|draft/i,
      run: (s) => ({ text: `Una ripoti ${s.byStatus.DRAFT} zilizo bado kwenye hali ya DRAFT (bado hazijakamilika).`, action: { label: "📝 Ona Drafti", hash: "#/reports?status=DRAFT" } }),
    },
    {
      test: /zinazoendelea|in.?progress/i,
      run: (s) => ({ text: `Una ripoti ${s.byStatus.IN_PROGRESS} zilizo kwenye hali ya IN_PROGRESS.` }),
    },
    {
      test: /zilizokamilika|kukamilika|completed/i,
      run: (s) => ({ text: `Una ripoti ${s.byStatus.COMPLETED} zilizokamilika (COMPLETED).`, action: { label: "✅ Ona Zilizokamilika", hash: "#/reports?status=COMPLETED" } }),
    },
    {
      test: /archived|archive|zilizohifadhiwa/i,
      run: (s) => ({ text: `Una ripoti ${s.byStatus.ARCHIVED} kwenye Archive.`, action: { label: "🗄️ Fungua Archive", hash: "#/reports?status=ARCHIVED" } }),
    },
    {
      test: /\btrash\b|tupio/i,
      run: (s) => ({ text: `Kuna ripoti ${s.trashCount} kwenye Trash kwa sasa. Zinaweza kurejeshwa (Restore) au kufutwa kabisa kwa Password ya Kufuta.`, action: { label: "🗑️ Fungua Trash", hash: "#/trash" } }),
    },
    {
      test: /\bleo\b|\btoday\b/i,
      run: (s) => ({ text: `Umeandika ripoti ${s.todayCount} leo.` }),
    },
    {
      test: /mwezi huu|this month/i,
      run: (s) => ({ text: `Umeandika ripoti ${s.monthCount} mwezi huu.` }),
    },
    {
      test: /(ripoti|takwimu|report).*(vifo|wafariki|fatalit)|((vifo|wafariki|fatalit).*(ripoti|takwimu|zilizorekodiwa|kwenye))/i,
      run: (s) => ({ text: s.fatalities > 0 ? `Jumla ya vifo vilivyorekodiwa kwenye ripoti zote ni ${s.fatalities}.` : `Hakuna vifo vilivyorekodiwa kwenye ripoti zako kwa sasa.` }),
    },
    {
      test: /(ripoti|takwimu|report).*(majeruhi|casualt)|((majeruhi|waliojeruhiwa|casualt).*(ripoti|takwimu|walioripotiwa|kwenye))/i,
      run: (s) => ({ text: s.casualties > 0 ? `Jumla ya majeruhi waliorekodiwa kwenye ripoti zote ni ${s.casualties}.` : `Hakuna majeruhi waliorekodiwa kwenye ripoti zako kwa sasa.` }),
    },
    {
      test: /aina (ya|za) (matukio|tukio|ripoti) (yangu|zangu|niliyoripoti)|takwimu (za|ya) aina za matukio|mgawanyo wa (aina za )?matukio/i,
      run: (s) => {
        if (!s.total) return { text: "Bado hakuna ripoti za kutosha kuonyesha aina za matukio." };
        const lines = Object.keys(s.byType).sort((a, b) => s.byType[b] - s.byType[a])
          .map((t) => `• ${t}: ${s.byType[t]}`).join("\n");
        return { text: `Mgawanyo wa aina za matukio kwenye ripoti zako:\n${lines}` };
      },
    },
    {
      test: /matukio (mengi zaidi|makubwa) (kwenye ripoti|niliyoripoti)|aina inayoongoza kwenye ripoti|tukio linaloongoza kwenye ripoti/i,
      run: (s) => ({ text: s.topType ? `Aina ya tukio inayojitokeza zaidi kwenye ripoti zako ni "${s.topType}" (mara ${s.topTypeCount}).` : "Bado hakuna ripoti za kutosha kubaini hilo." }),
    },
    {
      test: /ripoti ya mwisho|ripoti ya hivi karibuni|latest report|ripoti ya karibuni/i,
      run: (s) => {
        if (!s.latest) return { text: "Bado hakuna ripoti iliyoandikwa." };
        const t = (s.latest.incident && s.latest.incident.type) || "Aina haijabainishwa";
        return { text: `Ripoti ya hivi karibuni kuguswa ni ya aina "${t}" (namba: ${s.latest.reportNumber || s.latest.incidentId}), hali: ${s.latest.status}.`, action: { label: "📄 Fungua Ripoti", hash: "#/report/" + s.latest.incidentId } };
      },
    },
  ];

  // ============================================================
  // 4) Matching engine (local keyword/overlap scoring — no network)
  // ============================================================
  const STOP = new Set(["na","ya","wa","la","kwa","ni","je","nini","gani","vipi","namna","maana","kwenye","katika","hii","hiyo","huu","huo","zangu","yangu","wangu","hili","hilo","zake","yake","kama","au","si","tafadhali","naomba","nataka","ninataka","ningependa","the","is","a","an","of","to","in","on","and","for","how","what","do","does","can","i","you","me","my","please","tell","about"]);

  function normalize(str) {
    return (str || "")
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOP.has(w));
  }

  function buildCorpus() {
    const corpus = [];
    APP_FAQ.forEach((item) => {
      const tokens = new Set();
      normalize(item.keys.join(" ")).forEach((t) => tokens.add(t));
      corpus.push({ type: "faq", tokens, titleTokens: new Set(), raw: item.keys.join(" ").toLowerCase(), item });
    });
    FIRE_KB.forEach((item) => {
      const tokens = new Set();
      const titleTokens = new Set();
      normalize(item.title + " " + item.chapter).forEach((t) => { tokens.add(t); titleTokens.add(t); });
      normalize(item.text).forEach((t) => tokens.add(t));
      corpus.push({ type: "kb", tokens, titleTokens, raw: (item.title + " " + item.text).toLowerCase(), item });
    });
    // Document-frequency map so generic words that appear almost everywhere
    // ("kabisa", "moto", "ripoti"...) count for less than rare, specific words
    // ("backdraft", "hydrant", "sadebooks"...). This is a lightweight local
    // form of TF-IDF weighting — still pure keyword scoring, no external model.
    const df = Object.create(null);
    corpus.forEach((entry) => {
      entry.tokens.forEach((t) => { df[t] = (df[t] || 0) + 1; });
    });
    return { corpus, df, total: corpus.length };
  }
  let CORPUS = null;

  function scoreEntry(queryTokens, queryRaw, entry, df, total) {
    let score = 0;
    queryTokens.forEach((qt) => {
      if (entry.tokens.has(qt)) {
        const freq = df[qt] || total;
        let weight = Math.log(1 + total / freq); // rarer token => higher weight
        // A query word naming the actual topic/section title (e.g. "moto" in
        // "Fire Triangle (Pembetatu ya Moto)") is a much stronger signal than
        // the same word appearing once in the middle of unrelated body text
        // (e.g. an incidental "...ndiyo maana..." aside) — weight it higher
        // so short, generic questions ("Moto ni nini?") land on the entry
        // that is actually ABOUT that word, not just one that mentions it.
        if (entry.titleTokens.has(qt)) weight *= 2;
        score += weight;
      }
    });
    if (queryRaw.length >= 4 && entry.raw.includes(queryRaw)) score += 3;
    return score;
  }

  function findBestAnswer(query) {
    if (!CORPUS) CORPUS = buildCorpus();
    const { corpus, df, total } = CORPUS;
    const qTokens = normalize(query);
    const qRaw = query.toLowerCase().trim();
    if (!qTokens.length) return null;
    let best = null, bestScore = 0;
    corpus.forEach((entry) => {
      const s = scoreEntry(qTokens, qRaw, entry, df, total);
      if (s > bestScore) { bestScore = s; best = entry; }
    });
    if (!best || bestScore < 0.9) return null;
    if (best.type === "faq") {
      return { text: best.item.a, action: best.item.action || null };
    }
    return { text: `**${best.item.title}**\n\n${best.item.text}`, score: bestScore };
  }

  // ============================================================
  // 5) Answer dispatcher
  // ============================================================
  // Priority order:
  //   a) Own-report statistics — ONLY when the question is clearly about
  //      the user's own saved reports (avoids generic words like "vifo"
  //      or "majeruhi" hijacking a fire-science question).
  //   b) External Fire Safety Knowledge Base (window.FireSafetyKB, loaded
  //      from fire-safety-knowledge.js) — richer records with safety
  //      warnings and recommended actions.
  //   c) Built-in APP_FAQ + FIRE_KB (this file's own knowledge).
  //   d) Fallback "sijapata jibu" message.
  async function answerQuestion(query) {
    // (a) own-report stats — intents below are now scoped to report context
    for (const intent of DATA_INTENTS) {
      if (intent.test.test(query)) {
        const stats = await getStats();
        if (stats) return intent.run(stats);
      }
    }

    // (b) external Fire Safety Knowledge Base, if fire-safety-knowledge.js
    // was loaded before this script (see header comment / <script> order)
    let fskResult = null;
    if (typeof window !== "undefined" && window.FireSafetyKB && typeof window.FireSafetyKB.getAnswer === "function") {
      try {
        const r = window.FireSafetyKB.getAnswer(query);
        if (r && r.answer && r.confidence !== "low") {
          fskResult = { text: r.answer, confidence: r.confidence };
        }
      } catch (e) {
        // FireSafetyKB failed for some reason — fall through silently to built-in KB
        fskResult = null;
      }
    }

    // (c) built-in FAQ + fire-science book
    const kbAnswer = findBestAnswer(query);

    // Prefer whichever source matched with higher confidence. The external
    // KB reports "high"/"medium"/"low"; the built-in KB reports a raw score.
    // If the external KB matched with "high" confidence, prefer it (it has
    // structured safety_warning / recommended_action fields the built-in
    // FIRE_KB summaries don't carry). Otherwise prefer the built-in KB if it
    // matched, and fall back to the external one.
    if (fskResult && fskResult.confidence === "high") return fskResult;
    if (kbAnswer) return kbAnswer;
    if (fskResult) return fskResult;

    return {
      text: "Samahani, sijapata jibu sahihi la hilo. Unaweza kuniuliza kuhusu: jinsi ya kutumia app hii (ripoti mpya, backup, archive, trash, settings), takwimu za ripoti zako (mfano: \"ripoti ngapi mwezi huu\"), au maswali ya Sayansi ya Moto (mfano: \"PASS technique ni nini\", \"tofauti ya Class A na B\").",
    };
  }

  // ============================================================
  // 6) UI — floating launcher + chat panel (pure DOM, no iframe, no CDN)
  // ============================================================
  const SUGGESTIONS = [
    "Ripoti ngapi mwezi huu?",
    "Ninawezaje kuunda ripoti mpya?",
    "PASS Technique ni nini?",
    "Tofauti ya Class A na Class B ni nini?",
  ];

  function escapeHtml(s) {
    return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  function formatBubbleText(text) {
    let html = escapeHtml(text);
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\n/g, "<br>");
    return html;
  }

  function injectStyles() {
    document.head.insertAdjacentHTML("beforeend", `
    <style>
      #iai-launcher {
        position: fixed; right: 16px; bottom: calc(var(--nav-h, 64px) + 12px);
        width: 32px; height: 32px; border-radius: 50%; border: none;
        background: transparent; padding: 0; color: inherit; font-size: 22px;
        line-height: 1; display: flex; align-items: center; justify-content: center;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));
        cursor: pointer; z-index: 999998; transition: transform .15s ease;
      }
      #iai-launcher:active { transform: scale(0.88); }
      @media (min-width: 760px) { #iai-launcher { bottom: 16px; } }
      #iai-panel {
        position: fixed; right: 12px; left: 12px; bottom: calc(var(--nav-h, 64px) + 52px);
        max-width: 400px; margin-left: auto; height: min(70vh, 560px);
        background: var(--bg-raised, #161f30); border: 1px solid var(--line, #2a3650);
        border-radius: var(--radius, 10px); box-shadow: 0 10px 40px rgba(0,0,0,0.35);
        display: none; flex-direction: column; overflow: hidden; z-index: 999999;
        font-family: var(--font, sans-serif);
      }
      @media (min-width: 760px) { #iai-panel { bottom: 60px; } }
      #iai-panel.open { display: flex; }
      #iai-head {
        background: var(--accent, #e05a2f); color: #fff; padding: 12px 14px;
        display: flex; align-items: center; justify-content: space-between; flex: none;
      }
      #iai-head .t { font-weight: 700; font-size: 15px; }
      #iai-head .s { font-size: 11px; opacity: .85; font-weight: 400; }
      #iai-close { background: none; border: none; color: #fff; font-size: 20px; cursor: pointer; line-height: 1; padding: 4px 6px; }
      #iai-msgs { flex: 1; overflow-y: auto; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
      .iai-bubble { max-width: 88%; padding: 9px 12px; border-radius: 12px; font-size: 13.5px; line-height: 1.45; white-space: normal; }
      .iai-bubble.bot { background: var(--bg-raised-2, #1c283d); color: var(--text, #eef2f8); align-self: flex-start; border-bottom-left-radius: 3px; }
      .iai-bubble.user { background: var(--accent, #e05a2f); color: #fff; align-self: flex-end; border-bottom-right-radius: 3px; }
      .iai-action-btn {
        align-self: flex-start; margin-top: -2px; background: transparent; border: 1px solid var(--accent, #e05a2f);
        color: var(--accent, #e05a2f); border-radius: 8px; padding: 6px 10px; font-size: 12.5px; cursor: pointer;
      }
      #iai-suggestions { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 12px 10px; flex: none; }
      .iai-chip { background: var(--bg-raised-2, #1c283d); color: var(--text-dim, #9fb0c9); border: 1px solid var(--line, #2a3650);
        border-radius: 14px; padding: 6px 10px; font-size: 12px; cursor: pointer; }
      #iai-inputrow { display: flex; gap: 8px; padding: 10px; border-top: 1px solid var(--line, #2a3650); flex: none; }
      #iai-input { flex: 1; background: var(--bg, #0e1420); color: var(--text, #eef2f8); border: 1px solid var(--line, #2a3650);
        border-radius: 20px; padding: 9px 14px; font-size: 13.5px; outline: none; }
      #iai-send { background: var(--accent, #e05a2f); color: #fff; border: none; border-radius: 50%; width: 38px; height: 38px;
        font-size: 16px; cursor: pointer; flex: none; }
      .iai-typing { font-size: 12px; color: var(--text-faint, #6b7a94); align-self: flex-start; padding-left: 4px; }
    </style>`);
  }

  function scrollToBottom(el) { el.scrollTop = el.scrollHeight; }

  function addBubble(container, role, text, action) {
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = role === "user" ? "flex-end" : "flex-start";
    wrap.style.gap = "6px";
    const bubble = document.createElement("div");
    bubble.className = "iai-bubble " + (role === "user" ? "user" : "bot");
    bubble.innerHTML = formatBubbleText(text);
    wrap.appendChild(bubble);
    if (action && action.hash) {
      const btn = document.createElement("button");
      btn.className = "iai-action-btn";
      btn.textContent = action.label || "Fungua";
      btn.addEventListener("click", () => {
        window.location.hash = action.hash;
      });
      wrap.appendChild(btn);
    }
    container.appendChild(wrap);
    scrollToBottom(container);
  }

  function buildWidget() {
    injectStyles();
    document.body.insertAdjacentHTML("beforeend", `
      <button id="iai-launcher" title="Incident AI" aria-label="Incident AI">🧠</button>
      <div id="iai-panel">
        <div id="iai-head">
          <div><div class="t">Incident AI</div><div class="s">Msaidizi wa ndani · Offline · Hakuna internet</div></div>
          <button id="iai-close" aria-label="Funga">✕</button>
        </div>
        <div id="iai-msgs"></div>
        <div id="iai-suggestions"></div>
        <div id="iai-inputrow">
          <input id="iai-input" type="text" placeholder="Andika swali lako..." autocomplete="off">
          <button id="iai-send" aria-label="Tuma">➤</button>
        </div>
      </div>
    `);

    const launcher = document.getElementById("iai-launcher");
    const panel = document.getElementById("iai-panel");
    const closeBtn = document.getElementById("iai-close");
    const msgs = document.getElementById("iai-msgs");
    const input = document.getElementById("iai-input");
    const sendBtn = document.getElementById("iai-send");
    const suggestBox = document.getElementById("iai-suggestions");

    let greeted = false;
    function openPanel() {
      panel.classList.add("open");
      if (!greeted) {
        greeted = true;
        addBubble(msgs, "bot", "Habari! Mimi ni Incident AI, msaidizi wa ndani wa Fire Report. Niulize chochote kuhusu app hii, ripoti zako, au Sayansi ya Moto — nafanya kazi bila internet.");
        SUGGESTIONS.forEach((s) => {
          const chip = document.createElement("button");
          chip.className = "iai-chip";
          chip.textContent = s;
          chip.addEventListener("click", () => { input.value = s; sendMessage(); });
          suggestBox.appendChild(chip);
        });
      }
      input.focus();
    }
    function closePanel() { panel.classList.remove("open"); }

    launcher.addEventListener("click", () => {
      panel.classList.contains("open") ? closePanel() : openPanel();
    });
    closeBtn.addEventListener("click", closePanel);

    async function sendMessage() {
      const text = input.value.trim();
      if (!text) return;
      addBubble(msgs, "user", text);
      input.value = "";
      const typing = document.createElement("div");
      typing.className = "iai-typing";
      typing.textContent = "Incident AI inafikiri…";
      msgs.appendChild(typing);
      scrollToBottom(msgs);
      let result;
      try {
        result = await answerQuestion(text);
      } catch (e) {
        result = { text: "Samahani, kuna hitilafu ya ndani. Jaribu tena." };
      }
      typing.remove();
      addBubble(msgs, "bot", result.text, result.action);
    }

    sendBtn.addEventListener("click", sendMessage);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(buildWidget, 50);
  } else {
    window.addEventListener("DOMContentLoaded", () => setTimeout(buildWidget, 50));
  }
})();
