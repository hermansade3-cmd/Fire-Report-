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
    "answer": "Fire is a chemical reaction (combustion) that needs three things at once, known as the fire triangle: heat, fuel, and oxygen. A fourth element, an uninterrupted chemical chain reaction, completes the 'fire tetrahedron.' Removing any one of these can stop a fire — this is the basis of every extinguishing method (cooling, smothering oxygen, removing fuel, or interrupting the chemical reaction).",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Understanding the fire triangle helps you choose the right response: cool with water where safe, smother to cut off oxygen, remove fuel, or use a chemical agent to break the reaction.",
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
    "answer": "Fire spreads through direct flame contact, radiant heat, convection (hot smoke and gases rising and moving through a building), and conduction through materials. In enclosed spaces, heat and smoke can build up rapidly and cause 'flashover' — a sudden, near-simultaneous ignition of everything in a room. This is why early evacuation, before smoke and heat build up, is critical.",
    "safety_warning": "Flashover can happen within minutes in a small, enclosed room. Do not delay evacuation to gather belongings.",
    "when_not_to_attempt": null,
    "recommended_action": "Leave immediately once a fire is confirmed; do not wait to assess how big it will get.",
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
    "answer": "Fires are generally grouped by what is burning: ordinary combustibles such as wood, paper and cloth; flammable liquids such as petrol, paint and solvents; flammable gases such as LPG and methane; fires involving live electrical equipment; cooking oils and fats; and combustible metals. Exact class letters and extinguisher color-coding differ between standards (for example, US NFPA vs European/ISO systems), so always check the labeling on the specific extinguisher and local regulations rather than assuming one system applies everywhere.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Identify what is burning before choosing an extinguishing method, since the wrong method (e.g. water on burning oil or on live electrical equipment) can make a fire far worse.",
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
    "question": [
      "water extinguisher",
      "water fire extinguisher"
    ],
    "keywords_en": [
      "kizima moto cha maji"
    ],
    "keywords_sw": "Water extinguishers cool ordinary combustible materials (wood, paper, cloth, most plastics) below their ignition temperature. They work by removing heat.",
    "answer": "Never use water on burning cooking oil/fat, on flammable liquid fires, or on live electrical equipment — it can cause violent splashing, spread the fire, or cause electrocution.",
    "safety_warning": "Do not use on oil/grease fires, fuel fires, or any fire near live electricity.",
    "when_not_to_attempt": "Use only on ordinary combustible material fires (wood, paper, textiles) where the area is not near live electrical equipment.",
    "recommended_action": null,
    "emergency_action": "high",
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
    "question": [
      "foam extinguisher"
    ],
    "keywords_en": [
      "kizima moto cha povu"
    ],
    "keywords_sw": "Foam extinguishers smother the fire with a foam blanket, cutting off oxygen. They are effective on ordinary combustibles and on many flammable-liquid fires because the foam floats on the liquid surface and suppresses vapor.",
    "answer": "Not generally suitable for fires involving live electrical equipment (foam contains water and conducts electricity) or for cooking-oil fires.",
    "safety_warning": "Do not use on live electrical equipment or on hot cooking-oil fires.",
    "when_not_to_attempt": "Apply in a sweeping motion at the base of the fire, letting the foam build up and cover the burning surface.",
    "recommended_action": null,
    "emergency_action": "medium",
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
    "question": [
      "dry powder extinguisher",
      "dry chemical extinguisher",
      "abc powder extinguisher"
    ],
    "keywords_en": [
      "kizima moto cha unga"
    ],
    "keywords_sw": "Dry powder (dry chemical) extinguishers interrupt the chemical chain reaction and can also smother small areas of fuel. Multi-purpose (ABC) powder types can be used on ordinary combustibles, flammable liquids, and some electrical fires when de-energized.",
    "answer": "Powder can obscure vision and is not ideal in small enclosed spaces or near sensitive electronics. It generally does not cool the fuel, so reignition is possible.",
    "safety_warning": "Avoid prolonged use in small unventilated rooms; avoid on delicate electronics if alternatives exist.",
    "when_not_to_attempt": "Aim at the base of the flames and sweep side to side; watch for reignition.",
    "recommended_action": null,
    "emergency_action": "medium",
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
    "question": [
      "co2 extinguisher",
      "carbon dioxide extinguisher"
    ],
    "keywords_en": [
      "kizima moto cha co2"
    ],
    "keywords_sw": "CO2 extinguishers displace oxygen around the fire and are well suited to fires involving live electrical equipment because CO2 leaves no residue and does not conduct electricity.",
    "answer": "CO2 can reduce breathable oxygen in the immediate area, especially in small enclosed spaces; the discharge horn also becomes extremely cold.",
    "safety_warning": "Do not use in very small, poorly ventilated rooms without ensuring you can exit immediately; avoid direct skin contact with the discharge horn.",
    "when_not_to_attempt": "Aim at the base of the fire and keep a clear route to exit; ventilate the area afterward.",
    "recommended_action": null,
    "emergency_action": "medium",
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
    "question": [
      "wet chemical extinguisher",
      "kitchen extinguisher"
    ],
    "keywords_en": [
      "kizima moto cha kemikali maji kwa jikoni"
    ],
    "keywords_sw": "Wet chemical extinguishers are specifically designed for cooking-oil and fat fires. They create a soapy layer (saponification) over the burning oil that cools it and seals it from oxygen.",
    "answer": "This is the recommended extinguisher type for deep-fat fryer and cooking-oil fires; other extinguisher types are less effective or dangerous on burning oil.",
    "safety_warning": null,
    "when_not_to_attempt": "Apply slowly and at a safe distance following the extinguisher's instructions, since oil fires can flare when first disturbed.",
    "recommended_action": null,
    "emergency_action": "high",
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
    "answer": "Recognized basic procedure: (1) assess whether the fire is small and containable; (2) raise the alarm / alert others; (3) make sure you have a clear escape route behind you; (4) select the correct extinguisher type for what is burning; (5) keep a safe distance; (6) aim at the base of the fire, squeeze the handle, and sweep side to side; (7) watch for reignition and be ready to retreat; (8) if the fire does not respond quickly or grows, leave immediately and close the door behind you if possible; (9) call emergency services.",
    "safety_warning": "Only attempt this on a small, contained fire with a clear escape route. If in doubt, evacuate instead of fighting the fire.",
    "when_not_to_attempt": "Do not attempt if the fire is large, spreading fast, producing heavy smoke, blocking your only exit, or if you are untrained or unsure how the extinguisher works.",
    "recommended_action": "Stop and evacuate immediately if the fire does not go out within a few seconds of correct use, or if conditions become unsafe.",
    "emergency_action": "Call Fire & Rescue services immediately if the fire is not extinguished quickly or is beyond a small, contained size.",
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
    "answer": "Common home fire-prevention steps: never leave cooking unattended; keep flammable items away from stoves and heaters; avoid overloading electrical sockets; check wiring and appliances regularly; use certified electrical equipment; store fuel and gas cylinders safely and upright in ventilated areas away from ignition sources; keep matches/lighters away from children; install and test smoke alarms; keep a basic fire extinguisher accessible; have an escape plan and know your nearest exits.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Do a simple home safety check periodically: outlets, cords, kitchen habits, gas connections, and clear escape routes.",
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
    "answer": "Workplaces should maintain clear evacuation routes and exits, service electrical systems and equipment regularly, control combustible storage and waste (good housekeeping), enforce safe practices around hot work, train staff and appoint fire wardens, keep extinguishers inspected and accessible, hold regular fire drills, and maintain a written emergency evacuation plan.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Assign responsibility for fire safety (a fire warden/officer), inspect equipment on a schedule, and drill staff regularly.",
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
    "answer": "Never leave hot oil or an active stove unattended; keep a lid nearby to smother small pan fires; keep flammable materials (cloths, packaging) away from burners; clean grease buildup from surfaces and extraction systems regularly; keep a wet-chemical extinguisher or fire blanket accessible; ensure good ventilation.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Stay within reach of cooking oil at all times; if you must step away, turn off the heat.",
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
    "answer": "Control combustible and flammable material storage with proper separation and ventilation; maintain clear aisles and exits; service electrical and machinery systems; control hot-work (welding/cutting) with permits; maintain fire detection and suppression systems; train staff and conduct drills; keep emergency contact information visible.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Follow a documented hot-work permit process and routine equipment maintenance schedule.",
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
    "answer": "Control ignition sources (welding, cutting, temporary electrics) away from combustible materials; store fuels and gas cylinders securely; keep site clear of debris buildup; provide accessible extinguishers; brief workers on emergency procedures and assembly points.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Use a hot-work permit system and keep an extinguisher near any hot-work activity.",
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
    "answer": "No. Water conducts electricity and can cause severe electric shock or electrocution if used on a fire involving live equipment. If it is safe to do so, cut off the power supply first; then use a CO2 or dry powder extinguisher rated for electrical fires. If the power cannot be safely isolated, evacuate and call emergency services.",
    "safety_warning": "Never pour water on a fire involving live electrical equipment.",
    "when_not_to_attempt": "Do not attempt to extinguish if you cannot safely reach the power isolation point, or if there is visible arcing or the equipment is high-voltage.",
    "recommended_action": "If safe, switch off the power source at the breaker/isolator, then use a CO2 or dry powder extinguisher. Otherwise, evacuate.",
    "emergency_action": "Call emergency services immediately if the fire involves high-voltage equipment or you cannot isolate power safely.",
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
    "answer": "Common causes include overloaded sockets and extension cords, damaged or old wiring, faulty appliances, loose connections, overheating chargers left plugged in, damaged generators, and overheating batteries (including phone/solar batteries).",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Regularly inspect cords and outlets, avoid daisy-chaining extension cords, and unplug chargers/appliances when not in use.",
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
    "answer": "Keep generators well-ventilated and away from combustible materials; never refuel a hot generator; have batteries and solar installations installed and inspected by qualified technicians; watch for swelling, overheating, or unusual smells from batteries and stop using them immediately if these occur.",
    "safety_warning": "Swollen or overheating lithium batteries can ignite suddenly and are difficult to extinguish with water.",
    "when_not_to_attempt": null,
    "recommended_action": "If a battery is overheating or swelling, move it away from combustibles if safe to do so and monitor; if it ignites, treat as an electrical/chemical fire and evacuate if it grows.",
    "emergency_action": "Call emergency services if a battery fire is producing heavy smoke or growing.",
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
    "answer": "No — never pour water onto burning cooking oil or fat. Water is denser than hot oil and instantly turns to steam, which can violently eject burning oil outward, spreading the fire and causing severe burns. Instead: turn off the heat source if you can do so safely, and smother the fire by carefully sliding a metal lid or fire blanket over the pan, or use a wet-chemical extinguisher designed for cooking-oil fires. Never move a burning pan.",
    "safety_warning": "NEVER use water on burning oil or fat under any circumstances.",
    "when_not_to_attempt": "Do not attempt if the fire is already large, has spread beyond the pan, or you cannot safely reach the stove controls.",
    "recommended_action": "Turn off the heat if safe, cover the pan with a lid or fire blanket, and leave it covered and undisturbed until fully cooled. Use a wet-chemical extinguisher if available and you are trained to use it.",
    "emergency_action": "If the fire spreads beyond the pan or produces heavy smoke, evacuate and call emergency services immediately.",
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
    "answer": "A wet-chemical extinguisher is purpose-built for cooking-oil and fat fires and is the preferred choice. A fire blanket is also effective for small pan fires. Water, and generally foam, should not be used on hot oil fires.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Keep a wet-chemical extinguisher or fire blanket in or near the kitchen and know how to use it before an emergency happens.",
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
    "answer": "Unattended cooking, especially with oil, is one of the leading causes of home and restaurant fires. Oil left on high heat can reach its ignition point within minutes with no one present to notice or respond.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Never leave a stove unattended while oil or fat is heating; if you must step away, turn off the heat first.",
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
    "answer": "If a gas cylinder is on fire and you can safely and immediately reach the valve without exposing yourself to flame or heat, closing the valve can stop the fuel supply and extinguish the flame. If you cannot reach it safely, or the fire is already established and growing, do not approach it — evacuate the area immediately to a safe distance, keep others away, and call emergency services. A burning gas leak is often safer left burning under professional control than extinguished in a way that lets unburned gas accumulate and re-ignite explosively.",
    "safety_warning": "Do not attempt to move a burning or leaking cylinder. Do not spray water directly onto a pressurized burning cylinder valve. Stay well back if you cannot safely reach the shutoff.",
    "when_not_to_attempt": "Do not approach if there is visible cylinder damage, discoloration/bulging (sign of overheating), a hissing/roaring sound, or if flames are large or the cylinder is in a confined space.",
    "recommended_action": "Evacuate to a safe distance, keep bystanders and any ignition sources away, and cool surrounding exposed cylinders/structures from a safe distance with water if trained professionals are not yet present and it can be done without approaching the burning cylinder.",
    "emergency_action": "Call Fire & Rescue services immediately for any gas cylinder fire — this should always involve professional responders.",
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
    "answer": "Do not switch any electrical switches, lights, or appliances on or off (this can create a spark). Do not light matches, lighters, or naked flames. Turn off the gas supply at the cylinder/valve if you can do so quickly and safely. Open doors and windows to ventilate if safe. Leave the area and get everyone else out. Call emergency services from outside, away from the leak.",
    "safety_warning": "Any spark near a gas leak can cause an explosion — avoid all ignition sources including electrical switches.",
    "when_not_to_attempt": "Do not attempt to search for the leak with an open flame.",
    "recommended_action": "Ventilate if safe, isolate the supply if safe, and evacuate.",
    "emergency_action": "Call Fire & Rescue / emergency services immediately from a safe location.",
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
    "answer": "Raise the alarm immediately so others are aware. Use the nearest safe emergency exit — never use elevators/lifts during a fire, as they can fail or open onto the fire floor. Move calmly but quickly to your building's designated assembly point. If there is smoke, stay low where visibility and air are usually better. Help vulnerable people (children, elderly, people with disabilities) if you can do so without endangering yourself. Once out, do not re-enter the building until officially cleared by Fire & Rescue personnel.",
    "safety_warning": "Never use lifts/elevators during a fire evacuation.",
    "when_not_to_attempt": null,
    "recommended_action": "Follow your building's marked evacuation routes to the designated assembly point and remain there until an official count/clearance is given.",
    "emergency_action": "Call emergency services as soon as possible if not already done.",
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
    "answer": "A designated assembly point lets responders quickly confirm whether everyone made it out safely, and keeps evacuees away from the danger zone and out of the way of responding fire crews.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Go directly to the assembly point and report any missing person to Fire & Rescue personnel or the fire warden immediately — do not attempt to search for them yourself.",
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
    "answer": "Smoke contains toxic gases and reduces visibility and breathable air; smoke inhalation is a leading cause of fire deaths, often before flames reach a person. If smoke is present, stay low to the ground where air is typically clearer and cooler, cover your nose and mouth with cloth if possible, and move toward the nearest exit using a wall to guide you if visibility is very poor. Before opening any door, check if it feels hot — if so, use another route.",
    "safety_warning": "Do not stand upright in heavy smoke; do not attempt to run through thick smoke without covering your airway.",
    "when_not_to_attempt": "Do not open a door that feels hot to the touch — use an alternative exit.",
    "recommended_action": "Move low and fast toward the nearest known safe exit; do not stop to collect belongings.",
    "emergency_action": "Call emergency services once you are safely out.",
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
    "answer": "Do not enter a burning building to attempt a rescue unless you are trained and equipped for firefighting/rescue — most civilian rescue attempts result in additional casualties. Call Fire & Rescue services immediately and give them the exact location and number of people trapped. If you can safely communicate with the trapped person from outside (by phone or shouting), advise them to stay low, cover their airway, seal gaps under doors with cloth if smoke is entering, and signal their location at a window if possible, while waiting for professional rescuers.",
    "safety_warning": "Do not enter a burning structure without training, protective equipment, and backup — this significantly increases the risk of injury or death for both the rescuer and the person trapped.",
    "when_not_to_attempt": "Do not attempt entry if you have no fire training, protective gear, or if conditions include heavy smoke, structural instability, or intense heat.",
    "recommended_action": "Call Fire & Rescue immediately with exact location details; guide the trapped person by phone/voice if possible to a safer room with a sealed door and a window signal.",
    "emergency_action": "This is always an emergency — call Fire & Rescue / emergency services immediately.",
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
    "answer": "Assist only if you can do so without seriously endangering yourself. Guide or carry those who cannot move quickly toward the nearest safe exit, staying low if there is smoke. If a person cannot be safely moved before conditions become dangerous, move them to a room with a door that can be sealed, near a window, and immediately alert Fire & Rescue to their exact location.",
    "safety_warning": null,
    "when_not_to_attempt": "Do not attempt to carry someone through heavy smoke or flame if it would put you both at serious risk — prioritize alerting rescuers to their location instead.",
    "recommended_action": "Guide to nearest exit if safe; otherwise shelter in place near a window and signal for help.",
    "emergency_action": "Notify Fire & Rescue of the exact location of anyone who could not be evacuated.",
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
    "answer": "1) Raise the alarm so others nearby are aware. 2) Ensure everyone begins evacuating. 3) Call Fire & Rescue / emergency services, giving a clear location and description. 4) Only if the fire is small, you have suitable equipment, you are trained, and you have a clear escape route, consider using an extinguisher — otherwise evacuate and let professionals handle it.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Alert, evacuate, call for help — attempt firefighting only under safe, limited conditions.",
    "emergency_action": "Call Fire & Rescue / emergency services as your default response to any fire beyond an immediately controllable, small flame.",
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
    "answer": "Fire investigation is a specialized field. Investigators typically examine burn patterns to help locate the area of origin, look for ignition sources, document the scene with photographs and notes before anything is disturbed, interview witnesses, and preserve physical evidence (such as damaged electrical components) for further analysis. Conclusions about cause and responsibility require trained investigators and a full review of evidence — no automatic or preliminary determination should be treated as final.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Preserve the scene as much as possible until investigators arrive; avoid moving or cleaning up debris.",
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
    "answer": "A typical fire-safety inspection reviews: emergency exits (unobstructed, clearly marked, functioning), fire extinguishers (present, charged, inspected/tagged, accessible), fire and smoke alarms (functioning, tested), emergency lighting, electrical systems and panels (condition, no overloading), LPG/gas installations (secure, no leaks), general housekeeping (combustible material storage, clutter), evacuation plans and signage, and records of fire drills.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Schedule inspections regularly and document findings and corrective actions.",
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
    "answer": "If you notice smoke or fire while driving, pull over safely, turn off the engine, and get everyone out of the vehicle and to a safe distance (well away from traffic and the vehicle itself — fuel fires can spread or the vehicle can explode). Do not open the hood/bonnet if you see flames or heavy smoke from the engine compartment — fresh oxygen can intensify the fire. Call emergency services immediately.",
    "safety_warning": "Never open a smoking hood/bonnet if flames are visible or smoke is heavy — added oxygen can cause flare-up.",
    "when_not_to_attempt": "Do not attempt to fight a vehicle fire involving the fuel system or a growing engine fire without proper training and equipment.",
    "recommended_action": "Move everyone away from the vehicle and oncoming traffic to a safe distance.",
    "emergency_action": "Call emergency services immediately for any vehicle fire.",
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
    "answer": "Move away from the fire's path, accounting for wind direction (fire spreads fastest with the wind). Alert neighbors and call emergency services. If time allows and it is safe, clear dry, flammable material away from structures. Do not attempt to fight a spreading outdoor fire without proper equipment and training — outdoor fires can change direction and speed quickly with wind.",
    "safety_warning": "Wind can shift outdoor fire direction and speed suddenly — do not position yourself in the fire's likely path.",
    "when_not_to_attempt": "Do not attempt to fight a large or wind-driven vegetation fire yourself.",
    "recommended_action": "Evacuate away from the fire's path and notify others in the area.",
    "emergency_action": "Call Fire & Rescue / emergency services immediately for any uncontrolled outdoor fire.",
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
    "answer": "A fire warden is a trained staff member responsible for helping coordinate evacuation, checking their assigned area is clear, and reporting to a headcount point. A written emergency plan sets out evacuation routes, assembly points, alarm procedures, and responsibilities so that everyone knows what to do without confusion during an actual emergency. Regular fire drills test and reinforce this plan.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Appoint and train fire wardens, document the plan clearly, and conduct drills at regular intervals.",
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
    "answer": "Know your nearest two exits wherever you are. Never block exits or fire equipment. Test smoke alarms regularly. Never leave cooking or open flames unattended. Keep flammable materials away from heat sources. Know how and when to use a fire extinguisher — and know when to evacuate instead. If in doubt, get out and call for help.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Learn your building's exits and evacuation plan before an emergency happens, not during one.",
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
    "answer": "Fire drills build familiarity with evacuation routes and procedures so people respond quickly and calmly during a real emergency rather than hesitating or panicking. They also reveal weaknesses in a building's evacuation plan (blocked exits, confusing routes, unclear assembly points) before those weaknesses matter in a real fire.",
    "safety_warning": null,
    "when_not_to_attempt": null,
    "recommended_action": "Hold fire drills at regular intervals and review lessons learned afterward.",
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
