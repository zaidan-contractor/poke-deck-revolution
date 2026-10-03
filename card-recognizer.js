// ═════════════════════════════════════════════════════════════════
//  Card Recognizer Engine
//  Multi-tier recognition: AI Vision (Gemini) + Smart OCR + 1025 Pokémon Fuzzy Matcher
//  With Token Quota Protection, Caching, and Automatic Failover
// ═════════════════════════════════════════════════════════════════

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const Tesseract = require('tesseract.js');
const { BUILTIN_CARDS } = require('./public/js/cards-data.js');
const PokemonAPI = require('./public/js/api.js');

// ─── 1. Load All 1025 Pokémon Names ───
let ALL_POKEMON = [];
try {
  const rawNames = JSON.parse(fs.readFileSync(path.join(__dirname, 'pokemon-names.json'), 'utf8'));
  ALL_POKEMON = rawNames.map(n => {
    // Format name properly: 'charizard' -> 'Charizard', 'ho-oh' -> 'Ho-Oh', 'mr-mime' -> 'Mr. Mime'
    let formatted = n.split('-').map(part => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
    if (n === 'ho-oh') formatted = 'Ho-Oh';
    if (n === 'porygon-z') formatted = 'Porygon-Z';
    if (n === 'mr-mime') formatted = 'Mr. Mime';
    if (n === 'mime-jr') formatted = 'Mime Jr.';
    if (n === 'type-null') formatted = 'Type: Null';
    if (n === 'tapu-koko') formatted = 'Tapu Koko';
    if (n === 'tapu-lele') formatted = 'Tapu Lele';
    if (n === 'tapu-bulu') formatted = 'Tapu Bulu';
    if (n === 'tapu-fini') formatted = 'Tapu Fini';
    if (n === 'iron-valiant') formatted = 'Iron Valiant';
    if (n === 'roaring-moon') formatted = 'Roaring Moon';
    if (n === 'great-tusk') formatted = 'Great Tusk';
    if (n === 'scream-tail') formatted = 'Scream Tail';
    if (n === 'brute-bonnet') formatted = 'Brute Bonnet';
    if (n === 'flutter-mane') formatted = 'Flutter Mane';
    if (n === 'slither-wing') formatted = 'Slither Wing';
    if (n === 'sandy-shocks') formatted = 'Sandy Shocks';
    if (n === 'iron-treads') formatted = 'Iron Treads';
    if (n === 'iron-bundle') formatted = 'Iron Bundle';
    if (n === 'iron-hands') formatted = 'Iron Hands';
    if (n === 'iron-jugulis') formatted = 'Iron Jugulis';
    if (n === 'iron-moth') formatted = 'Iron Moth';
    if (n === 'iron-thorns') formatted = 'Iron Thorns';
    if (n === 'wo-chien') formatted = 'Wo-Chien';
    if (n === 'chien-pao') formatted = 'Chien-Pao';
    if (n === 'ting-lu') formatted = 'Ting-Lu';
    if (n === 'chi-yu') formatted = 'Chi-Yu';
    return {
      raw: n.toLowerCase(),
      clean: n.replace(/[^a-z0-9]/g, '').toLowerCase(),
      display: formatted
    };
  });
} catch (e) {
  console.warn('Could not load pokemon-names.json, using fallback names', e);
  ALL_POKEMON = [
    { raw: 'charizard', clean: 'charizard', display: 'Charizard' },
    { raw: 'pikachu', clean: 'pikachu', display: 'Pikachu' },
    { raw: 'mewtwo', clean: 'mewtwo', display: 'Mewtwo' },
    { raw: 'rayquaza', clean: 'rayquaza', display: 'Rayquaza' },
    { raw: 'lucario', clean: 'lucario', display: 'Lucario' },
    { raw: 'gengar', clean: 'gengar', display: 'Gengar' },
    { raw: 'blastoise', clean: 'blastoise', display: 'Blastoise' },
    { raw: 'venusaur', clean: 'venusaur', display: 'Venusaur' }
  ];
}

// ─── 2. Suffixes & Types ───
const SUFFIXES = [
  'VMAX', 'VSTAR', 'V-UNION', 'V',
  'ex', 'EX', 'GX', 'MEGA', 'Mega',
  'Radiant', 'Tera', 'Break', 'Tag Team', 'Prism Star'
];

// ─── 3. Token Quota & AI Caching ───
const recognitionCache = new Map(); // hash -> recognized card
const apiSearchCache = new Map();   // baseName -> API results (persistent across scans)
let lastGeminiCallTime = 0;
const GEMINI_MIN_INTERVAL_MS = 2000; // Rate limit protection: 1 call per 2s max

// Persistent Tesseract Worker for fast OCR
let tesseractWorker = null;
async function getTesseractWorker() {
  if (!tesseractWorker) {
    tesseractWorker = await Tesseract.createWorker('eng');
  }
  return tesseractWorker;
}

// Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// ─── 4. Smart OCR Card Text Parser ───
function parseCardOCRText(text) {
  if (!text) return { name: '', baseName: '', suffix: '', hp: null, cardNumber: '', setTotal: '' };

  const cleanText = text.replace(/\r/g, ' ');
  const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const words = cleanText.split(/[\s,;|:]+/).map(w => w.trim()).filter(w => w.length > 1);

  // 1. Collector number: pattern like "125/197", "025/165", "4/102", "SWSH050"
  let cardNumber = '';
  let setTotal = '';
  const slashMatch = cleanText.match(/(\d{1,3})\s*[\/\\]\s*(\d{1,3})/);
  if (slashMatch) {
    cardNumber = slashMatch[1];
    setTotal = slashMatch[2];
  } else {
    const promoMatch = cleanText.match(/\b(SWSH|SVP|SM|XY|BW|DP)\s*[\-]?\s*(\d{1,3})\b/i);
    if (promoMatch) {
      cardNumber = `${promoMatch[1].toUpperCase()}${promoMatch[2]}`;
    }
  }

  // 2. HP: pattern like "HP 330", "330 HP", "HP330"
  let hp = null;
  const hpMatch = cleanText.match(/(?:HP\s*|H\s*P\s*)(\d{2,3})\b/i) || cleanText.match(/\b(\d{2,3})\s*HP\b/i);
  if (hpMatch) {
    hp = parseInt(hpMatch[1], 10);
  } else {
    // Look for plausible HP numbers (30 to 340, usually multiples of 10)
    for (const w of words) {
      const num = parseInt(w, 10);
      if (num >= 40 && num <= 340 && num % 10 === 0 && num !== parseInt(cardNumber, 10) && num !== parseInt(setTotal, 10)) {
        hp = num;
        break;
      }
    }
  }

  // 3. Suffix Detection: VMAX, VSTAR, ex, EX, GX, V, Mega, etc.
  let detectedSuffix = '';
  for (const suf of SUFFIXES) {
    const regex = new RegExp(`\\b${suf.replace('-', '\\-')}\\b`, 'i');
    if (regex.test(cleanText)) {
      detectedSuffix = suf;
      break;
    }
  }

  // 4. Pokémon Name Matching
  // First attempt: Exact match in words or lines
  let matchedPokemon = null;
  let bestScore = 0;

  for (const p of ALL_POKEMON) {
    // Check if full Pokémon name is in text as a distinct word
    const nameRegex = new RegExp(`\\b${p.raw}\\b`, 'i');
    if (nameRegex.test(cleanText)) {
      matchedPokemon = p;
      bestScore = 1.0;
      break;
    }
  }

  // Second attempt: Substring search in lines (top lines preferred where card name sits)
  if (!matchedPokemon) {
    const topLines = lines.slice(0, 5).join(' ').toLowerCase();
    for (const p of ALL_POKEMON) {
      if (p.raw.length >= 4 && topLines.includes(p.raw)) {
        matchedPokemon = p;
        bestScore = 0.9;
        break;
      }
    }
  }

  // Third attempt: Fuzzy matching on words (Levenshtein distance)
  if (!matchedPokemon) {
    let minDistance = 999;
    let candidate = null;

    // Check words in top half of the text
    const searchWords = words.slice(0, 30);
    for (const w of searchWords) {
      const cleanW = w.toLowerCase().replace(/[^a-z]/g, '');
      if (cleanW.length < 4) continue;

      for (const p of ALL_POKEMON) {
        // Skip comparing wildly different length words
        if (Math.abs(cleanW.length - p.clean.length) > 2) continue;

        const dist = levenshtein(cleanW, p.clean);
        // Tolerable distance: 1 edit for 4-5 chars, 2 edits for 6+ chars
        const maxDist = p.clean.length >= 6 ? 2 : 1;
        if (dist <= maxDist && dist < minDistance) {
          minDistance = dist;
          candidate = p;
        }
      }
    }

    if (candidate) {
      matchedPokemon = candidate;
      bestScore = 0.75;
    }
  }

  const baseName = matchedPokemon ? matchedPokemon.display : '';
  let fullName = baseName;
  if (baseName && detectedSuffix) {
    fullName = `${baseName} ${detectedSuffix}`;
  }

  return {
    name: fullName,
    baseName,
    suffix: detectedSuffix,
    hp,
    cardNumber,
    setTotal,
    confidence: bestScore
  };
}

// ─── 5. AI Vision Engine (Gemini) with Token Quota Safeguards ───
async function recognizeWithGemini(base64Image, mimeType = 'image/jpeg', clientApiKey = '') {
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null; // No API key, proceed to OCR
  }

  // Rate Limiting Protection: Throttling calls to avoid hitting 429 quota
  const now = Date.now();
  if (now - lastGeminiCallTime < GEMINI_MIN_INTERVAL_MS) {
    console.log('⚡ [AI Throttle] Skipping AI call to protect token quota, using fast OCR');
    return null;
  }
  lastGeminiCallTime = now;

  try {
    // Strip header if present
    const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');

    const prompt = `You are analyzing a physical Pokémon trading card photo. Read ALL printed text with extreme precision.

CRITICAL — GOLDEN / METALLIC / RAINBOW CARDS:
Many counterfeit cards are printed in GOLD, SILVER, METALLIC, or RAINBOW coloring but are copies of real official cards. LOOK PAST THE COLOR TREATMENT and read the actual card name, attacks, HP, collector number, and set info printed on the card. The gold/metallic coating does NOT make it a different card — identify which REAL official card it is a copy of.

IMPORTANT RULES FOR isFanArtOrCustom:
- Set to FALSE if this card name + suffix combination exists as a real official Pokémon TCG card (even if the physical copy is gold, metallic, rainbow, counterfeit, or bootleg).
- Set to TRUE ONLY if you are confident this exact card name + suffix combination was NEVER officially printed. For example "Aegislash GX" was never an official card, so that would be true. But "Chesnaught V" IS a real card from Silver Tempest, so that would be false.
- When in doubt, set to FALSE. The database lookup will handle verification.

Return ONLY a single valid raw JSON object (no markdown, no backticks) with this schema:
{
  "name": "Full card title as printed, e.g. 'Chesnaught V' or 'Charizard VMAX'",
  "baseName": "Base Pokémon name only, e.g. 'Chesnaught' or 'Charizard'",
  "suffix": "V, GX, EX, ex, VMAX, VSTAR, or null",
  "hp": 230,
  "primaryType": "Grass or Metal or Fire or Water or Lightning or Psychic or Fighting or Darkness or Dragon or Colorless",
  "cardNumber": "Collector number as printed, e.g. '171/195' or '85/124'",
  "cleanNumber": "Digits only without leading zeros, e.g. '171'",
  "setName": "Set name if printed or null",
  "isFanArtOrCustom": false,
  "isGoldenOrMetallic": false,
  "attacks": [
    {
      "name": "Attack name as printed",
      "damage": "damage as printed e.g. 130, 60+, or 0 if status only",
      "cost": ["Grass", "Grass", "Colorless"],
      "text": "Card effect text if visible",
      "isGx": false
    }
  ],
  "weakness": {"type": "Fire", "value": "x2"},
  "resistance": {"type": "Psychic", "value": "-20"},
  "retreatCost": 2,
  "confidence": 0.99
}`;

    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3-flash-preview', 'gemini-3.5-flash'];
    let lastErr = null;

    for (const model of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000); // 7s timeout

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inlineData: {
                      mimeType: mimeType || 'image/jpeg',
                      data: cleanBase64
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 600
            }
          }),
          signal: controller.signal
        });

        clearTimeout(timeout);

        if (!response.ok) {
          if (response.status === 429) {
            console.warn(`⚠️ [Gemini ${model} Quota Exceeded (429)] Trying next model or local fallback.`);
            continue;
          }
          console.warn(`[Gemini ${model} Error ${response.status}] Trying next model.`);
          continue;
        }

        const data = await response.json();
        const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJson);

        return {
          name: parsed.name || parsed.baseName || '',
          baseName: parsed.baseName || '',
          suffix: parsed.suffix || '',
          hp: parsed.hp ? parseInt(parsed.hp, 10) : null,
          primaryType: parsed.primaryType || 'Colorless',
          cardNumber: parsed.cardNumber ? String(parsed.cardNumber) : '',
          cleanNumber: parsed.cleanNumber ? String(parsed.cleanNumber) : '',
          setName: parsed.setName || '',
          isFanArtOrCustom: !!parsed.isFanArtOrCustom,
          attacks: Array.isArray(parsed.attacks) ? parsed.attacks : [],
          weakness: parsed.weakness || null,
          resistance: parsed.resistance || null,
          retreatCost: parsed.retreatCost || 2,
          confidence: parsed.confidence || 0.98,
          method: `ai-vision (${model})`
        };
      } catch (err) {
        lastErr = err;
        console.warn(`Model ${model} attempt failed:`, err.message);
      }
    }

    return null; // Fall through to OCR
  } catch (err) {
    console.warn('⚠️ Gemini recognition skipped/failed:', err.message);
    return null;
  }
}

// ─── 6. Card Search & Candidate Matcher ───
async function findMatchingCards(cardInfo, rawImage = '') {
  const { name, baseName, suffix, hp, cardNumber, cleanNumber } = cardInfo;
  const searchName = name || baseName || 'Charizard';
  const targetBase = (baseName || searchName.split(' ')[0]).toLowerCase();

  // Normalize numbers for search (e.g. "006/165" -> "6" and "006")
  const numDigits = (cleanNumber || (cardNumber ? cardNumber.replace(/\D/g, '') : '')).replace(/^0+/, '');
  const numPadded = numDigits ? numDigits.padStart(3, '0') : '';

  // 1. Search Built-in Database (Prioritized)
  let localMatches = [];
  if (typeof BUILTIN_CARDS !== 'undefined' && Array.isArray(BUILTIN_CARDS)) {
    // First: exact name/baseName AND exact collector number match
    localMatches = BUILTIN_CARDS.filter(c => {
      const cName = c.name.toLowerCase();
      const cNum = (c.number || '').toLowerCase();
      const nameMatch = cName.includes(targetBase) || targetBase.includes(cName.split(' ')[0]);
      if (!nameMatch) return false;

      if (numDigits) {
        return cNum.includes(numDigits) || cNum.includes(numPadded) || (c.id && (c.id.endsWith(`-${numDigits}`) || c.id.endsWith(`-${numPadded}`)));
      }
      return false;
    });

    // Second: if no exact number match, match all cards of this Pokémon!
    if (localMatches.length === 0) {
      localMatches = BUILTIN_CARDS.filter(c => {
        const cName = c.name.toLowerCase();
        return cName.includes(targetBase) || targetBase.includes(cName.split(' ')[0]);
      });
    }
  }

  // 2. Query Online Pokémon TCG API (with retry + persistent cache)
  let apiCards = [];
  const cacheKey = (baseName || searchName).toLowerCase();

  // Check persistent API cache first (survives across scans of same Pokémon)
  if (apiSearchCache.has(cacheKey)) {
    apiCards = apiSearchCache.get(cacheKey);
    console.log(`⚡ [API Cache] Using ${apiCards.length} cached results for "${cacheKey}"`);
  } else {
    try {
      let queries = [];
      // Start with baseName wildcard (most reliable, always returns results)
      if (baseName) {
        queries.push(`name:${baseName.replace(/["\\]/g, '')}*`);
      }
      // Then try exact full name
      queries.push(`name:"${searchName.replace(/["\\]/g, '')}"`);
      // Then try exact name + collector number for pinpoint match
      if (numDigits) {
        queries.push(`name:"${searchName.replace(/["\\]/g, '')}" number:${numDigits}`);
      }
      // Fallback: exact baseName if different
      if (baseName && baseName !== searchName) {
        queries.push(`name:"${baseName.replace(/["\\]/g, '')}"`);
      }

      // Helper: fetch with timeout + retry
      const fetchWithRetry = async (url, retries = 2) => {
        for (let attempt = 1; attempt <= retries; attempt++) {
          try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 5000); // 5s timeout per request
            const res = await fetch(url, {
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 PokemonCardBattle/1.0',
                'Accept-Encoding': 'identity'
              }
            });
            clearTimeout(timer);
            return res;
          } catch (e) {
            if (attempt < retries) {
              console.log(`🔄 [API Retry] Attempt ${attempt} failed, retrying... (${e.message})`);
              await new Promise(r => setTimeout(r, 300 * attempt)); // 300ms, 600ms backoff
            } else {
              throw e;
            }
          }
        }
      };

      for (const q of queries) {
        try {
          const apiRes = await fetchWithRetry(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&pageSize=15&orderBy=set.releaseDate`);
          if (apiRes.ok) {
            const text = await apiRes.text();
            if (!text.startsWith('<')) {
              const json = JSON.parse(text);
              if (json.data && json.data.length > 0) {
                apiCards = json.data;
                console.log(`🌐 [API] Found ${apiCards.length} cards with query: ${q}`);
                break; // Got good cards!
              }
            }
          }
        } catch (fetchErr) {
          console.warn(`API query "${q}" failed:`, fetchErr.message);
        }
      }

      // Persist in API cache for instant re-scans
      if (apiCards.length > 0) {
        apiSearchCache.set(cacheKey, apiCards);
        // Cap cache at 50 entries
        if (apiSearchCache.size > 50) {
          const oldKey = apiSearchCache.keys().next().value;
          apiSearchCache.delete(oldKey);
        }
      }
    } catch (err) {
      console.warn('API card search warning:', err.message);
    }
  }

  // 3. Normalize & Deduplicate
  const combined = [];
  const seenIds = new Set();

  for (const c of localMatches) {
    if (!seenIds.has(c.id)) {
      seenIds.add(c.id);
      combined.push(PokemonAPI.normalizeCard ? PokemonAPI.normalizeCard(c) : c);
    }
  }

  for (const c of apiCards) {
    if (!seenIds.has(c.id)) {
      seenIds.add(c.id);
      combined.push(PokemonAPI.normalizeCard ? PokemonAPI.normalizeCard(c) : c);
    }
  }

  // 4. Score and Rank Candidates
  const scored = combined.map(card => {
    let score = 50;
    const cName = (card.name || '').toLowerCase();
    const cNum = (card.number || '').toLowerCase();
    const cSubtypes = (card.subtypes || []).map(s => s.toLowerCase());

    // Full name match
    if (cName === searchName.toLowerCase()) score += 35;

    // Number match: Massive boost
    if (numDigits) {
      if (cNum.includes(numDigits) || cNum.includes(numPadded) || (card.id && card.id.endsWith(`-${numDigits}`))) {
        score += 70; // Pinpoint card match!
      }
    }

    // Subtype match (ex, VMAX, GX, V)
    if (suffix) {
      const sufLower = suffix.toLowerCase();
      if (cName.includes(sufLower) || cSubtypes.includes(sufLower)) {
        score += 30;
      }
    }

    // HP match
    if (hp && card.hp && parseInt(card.hp, 10) === hp) {
      score += 20;
    }

    return { card, score };
  });

  scored.sort((a, b) => b.score - a.score);
  let rankedCards = scored.map(s => s.card);

  // ═══════════════════════════════════════════════════════════════
  //  SMART CARD CLASSIFICATION ENGINE (3-Tier)
  //
  //  TIER 1 — OFFICIAL MATCH: The database found a card with
  //           matching name + suffix. Use that official card.
  //           Example: "Chesnaught V" → found in Silver Tempest → use it.
  //
  //  TIER 2 — PHYSICAL ADAPTATION: The base Pokémon exists officially
  //           but with a DIFFERENT suffix (e.g., your card says "GX"
  //           but official is "EX"). Adapt the official card keeping
  //           its art but updating rule box/suffix/HP.
  //           Example: "Rayquaza GX" with Dragons Exalted art → adapt from Rayquaza-EX.
  //
  //  TIER 3 — TRUE FAN-ART: No official card with this name+suffix
  //           exists in ANY database. Synthesize a playable card from
  //           the attacks/stats Gemini extracted from the photo.
  //           Example: "Aegislash GX" → doesn't exist → fan-art synthesis.
  // ═══════════════════════════════════════════════════════════════

  const userSuffix = (cardInfo.suffix || '').toLowerCase();
  const userNameLower = (cardInfo.name || '').toLowerCase().trim();
  const userBaseLower = (cardInfo.baseName || '').toLowerCase().trim();
  const hasExtractedAttacks = Array.isArray(cardInfo.attacks) && cardInfo.attacks.length > 0;
  const topOfficial = rankedCards.length > 0 ? rankedCards[0] : null;
  const topScore = scored.length > 0 ? scored[0].score : 0;

  // ── Helper: format Gemini-extracted attacks into game-ready format ──
  const formatExtractedAttacks = () => {
    if (!hasExtractedAttacks) return null;
    return cardInfo.attacks.map((a, idx) => {
      let dmgNum = 0;
      if (typeof a.damage === 'number') dmgNum = a.damage;
      else if (a.damage) dmgNum = parseInt(String(a.damage).replace(/\D/g, ''), 10) || 0;

      const costArr = Array.isArray(a.cost) && a.cost.length > 0
        ? a.cost
        : [cardInfo.primaryType || 'Colorless', 'Colorless'];
      const isGxMove = !!(a.isGx || (a.name && a.name.toUpperCase().includes('GX')));
      return {
        name: a.name || `Attack ${idx + 1}`,
        cost: costArr,
        convertedEnergyCost: costArr.length,
        damage: dmgNum,
        damageRaw: String(a.damage || dmgNum || '—'),
        text: a.text || '',
        isGX: isGxMove,
        isVSTAR: false
      };
    });
  };

  // ── Check: Does the top official match actually correspond to the user's card? ──
  // A "name match" means the official card's name matches the scanned name closely.
  // We check: does the official card's name contain the base Pokémon AND the same suffix?
  const checkNameSuffixMatch = (officialCard) => {
    if (!officialCard) return false;
    const offName = (officialCard.name || '').toLowerCase();
    const offSubtypes = (officialCard.subtypes || []).map(s => s.toLowerCase());

    // Base Pokémon name must be present
    if (!offName.includes(userBaseLower) && !userBaseLower.includes(offName.split(' ')[0])) {
      return false;
    }

    // Suffix must match (V, GX, EX, etc.)
    if (!userSuffix) return true; // No suffix on user's card = any match is fine

    // For suffix "v", we need exact " v" word match, not just the letter v
    if (userSuffix === 'v') {
      return offName.endsWith(' v') || offSubtypes.includes('v');
    }
    return offName.includes(userSuffix) || offSubtypes.includes(userSuffix);
  };

  // ── TIER 1: Check if we have an exact official match ──
  // Scan ALL candidates (not just #1) for an exact name+suffix match, then promote it
  let bestOfficialIdx = -1;
  for (let i = 0; i < rankedCards.length; i++) {
    if (checkNameSuffixMatch(rankedCards[i])) {
      bestOfficialIdx = i;
      break;
    }
  }
  const hasExactOfficialMatch = bestOfficialIdx >= 0 && (bestOfficialIdx === 0 ? topScore >= 80 : true);

  if (hasExactOfficialMatch) {
    // Promote the best suffix-matching card to #1 if it isn't already
    if (bestOfficialIdx > 0) {
      const promoted = rankedCards.splice(bestOfficialIdx, 1)[0];
      rankedCards.unshift(promoted);
      console.log(`⬆️ [Promoted] "${promoted.name}" moved from #${bestOfficialIdx + 1} to #1 (exact suffix match)`);
    }
    // ✅ OFFICIAL CARD — Use the database version directly
    const matchedCard = rankedCards[0];
    const isGold = !!(cardInfo.isGoldenOrMetallic);
    console.log(`✅ [TIER 1 — Official Match] "${matchedCard.name}" matched.${isGold ? ' (Golden/Metallic counterfeit → showing original card)' : ''}`);
    // If golden counterfeit detected, mark it so UI can show the user
    if (isGold) {
      rankedCards[0] = { ...matchedCard, isGoldenCopy: true, goldenTag: '🥇 GOLD COPY → ' + matchedCard.name };
    }
  }

  // ── TIER 2: Same Pokémon with DIFFERENT rule-box suffix ──
  // Only adapts between rule-box variants (EX↔GX, V↔VMAX, etc.)
  // NOT when official is a plain regular card and user has GX/V/VMAX
  else if (topOfficial && topScore >= 50 && userSuffix) {
    const offName = (topOfficial.name || '').toLowerCase();
    const offSubtypes = (topOfficial.subtypes || []).map(s => s.toLowerCase());
    const topHasDifferentSuffix = !offName.includes(userSuffix) && !offSubtypes.includes(userSuffix);

    // Check if official card ALSO has a rule-box suffix (EX, GX, V, VMAX, etc.)
    const officialHasRuleBox = ['ex', 'gx', 'v', 'vmax', 'vstar'].some(suf =>
      offName.includes(` ${suf}`) || offName.includes(`-${suf}`) || offSubtypes.includes(suf)
    );

    if (topHasDifferentSuffix && officialHasRuleBox) {
      // 🔄 PHYSICAL ADAPTATION — Same Pokémon, swapped rule box (e.g., Rayquaza-EX → Rayquaza GX)
      const adaptedCard = {
        ...topOfficial,
        id: `${topOfficial.id}-adapted-${userSuffix}`,
        name: cardInfo.name,
        hp: cardInfo.hp || topOfficial.hp,
        cardType: userSuffix.includes('gx') ? 'gx' :
                  userSuffix.includes('vmax') ? 'vmax' :
                  userSuffix.includes('vstar') ? 'vstar' :
                  userSuffix === 'v' ? 'v' :
                  userSuffix.includes('ex') ? 'ex-lower' : topOfficial.cardType,
        prizeCards: (userSuffix.includes('gx') || userSuffix.includes('ex') || userSuffix === 'v' || userSuffix.includes('vstar')) ? 2 :
                    (userSuffix.includes('vmax') ? 3 : 1),
        isPhysicalAdapted: true,
        adaptedFrom: topOfficial.name
      };
      console.log(`🔄 [TIER 2 — Physical Adaptation] "${cardInfo.name}" adapted from official "${topOfficial.name}" (suffix: ${userSuffix})`);
      rankedCards.unshift(adaptedCard);
    } else if (topHasDifferentSuffix) {
      // Official card is a regular/basic card, user has GX/V/VMAX → TIER 3 fan-art
      console.log(`🎨 [TIER 2→3 Escalation] Official "${topOfficial.name}" is regular, user has suffix "${userSuffix}" → treating as fan-art`);
      // Fall through to TIER 3 below
      _buildFanArtCard();
    }
  }

  // ── TIER 3: TRUE FAN-ART — No official card exists for this name+suffix ──
  else if ((rankedCards.length === 0 || (topOfficial && topScore < 50)) && cardInfo.name) {
    _buildFanArtCard();
  }

  // ── Fan-Art Card Builder (shared by TIER 2 escalation and TIER 3) ──
  function _buildFanArtCard() {
    const formattedAttacks = formatExtractedAttacks();
    const defaultHp = userSuffix.includes('vmax') ? 320 :
                      userSuffix.includes('vstar') ? 270 :
                      userSuffix.includes('gx') ? 170 :
                      userSuffix === 'v' ? 210 :
                      userSuffix.includes('ex') ? 180 : 120;

    const chosenAttacks = formattedAttacks || [
      { name: 'Power Strike', cost: [cardInfo.primaryType || 'Colorless', 'Colorless'], convertedEnergyCost: 2, damage: 60, damageRaw: '60', text: '', isGX: false, isVSTAR: false },
      userSuffix.includes('gx') ?
        { name: `${cardInfo.baseName || 'Strike'} GX`, cost: [cardInfo.primaryType || 'Colorless', cardInfo.primaryType || 'Colorless', 'Colorless'], convertedEnergyCost: 3, damage: 180, damageRaw: '180', text: 'GX Attack: Once per game.', isGX: true, isVSTAR: false } :
        { name: 'Giga Impact', cost: [cardInfo.primaryType || 'Colorless', cardInfo.primaryType || 'Colorless', 'Colorless'], convertedEnergyCost: 3, damage: 120, damageRaw: '120', text: '', isGX: false, isVSTAR: false }
    ];

    // Use official art if available (for counterfeits of real Pokémon), user photo for truly unique fan-art
    const useOfficialArt = topOfficial && !rawImage;

    const fanArtCard = {
      id: `fanart-${(cardInfo.baseName || 'card').toLowerCase()}-${userSuffix || 'custom'}-${Date.now()}`,
      name: cardInfo.name,
      hp: cardInfo.hp || defaultHp,
      types: [cardInfo.primaryType || (topOfficial ? topOfficial.primaryType : 'Colorless')],
      primaryType: cardInfo.primaryType || (topOfficial ? topOfficial.primaryType : 'Colorless'),
      cardType: userSuffix.includes('gx') ? 'gx' :
                userSuffix.includes('vmax') ? 'vmax' :
                userSuffix.includes('vstar') ? 'vstar' :
                userSuffix === 'v' ? 'v' :
                userSuffix.includes('ex') ? 'ex-lower' : 'regular',
      subtypes: [cardInfo.suffix || 'Fan-Art', 'Basic'],
      supertype: 'Pokémon',
      attacks: chosenAttacks,
      weaknesses: cardInfo.weakness ? [cardInfo.weakness] : (topOfficial ? (topOfficial.weaknesses || []) : []),
      resistances: cardInfo.resistance ? [cardInfo.resistance] : (topOfficial ? (topOfficial.resistances || []) : []),
      retreatCost: Array(cardInfo.retreatCost || 2).fill('Colorless'),
      convertedRetreatCost: cardInfo.retreatCost || 2,
      prizeCards: (userSuffix.includes('gx') || userSuffix.includes('ex') || userSuffix === 'v' || userSuffix.includes('vstar')) ? 2 :
                  (userSuffix.includes('vmax') ? 3 : 1),
      images: {
        small: rawImage || (useOfficialArt ? topOfficial.images.small : ''),
        large: rawImage || (useOfficialArt ? topOfficial.images.large : '')
      },
      set: {
        name: cardInfo.setName || 'Fan-Art Custom Collection',
        series: 'Fan-Art Series'
      },
      number: cardInfo.cardNumber || 'Custom',
      rarity: 'Fan-Art Holographic',
      isFanArt: true,
      isCustomCard: true,
      customTag: '⭐ FAN-ART'
    };

    console.log(`🎨 [TIER 3 — Fan-Art] Synthesized custom card: "${fanArtCard.name}" (HP: ${fanArtCard.hp}, ${fanArtCard.attacks.length} attacks)`);
    rankedCards.unshift(fanArtCard);
  }

  const bestScore = scored.length > 0 ? scored[0].score : 85;
  const isHighConfidence = bestScore >= 75 || (rankedCards.length === 1);

  return {
    exactMatch: rankedCards.length > 0 ? rankedCards[0] : null,
    candidates: rankedCards.slice(0, 6),
    isHighConfidence,
    bestScore
  };
}

// ─── 7. Main Recognition Pipeline ───
async function recognizeCardImage(base64Image, clientApiKey = '', headerImage = '', footerImage = '') {
  const mainImage = base64Image || headerImage;
  if (!mainImage) {
    return { success: false, error: 'No image provided' };
  }

  // Cache lookup by MD5 hash
  const imageHash = crypto.createHash('md5').update(mainImage).digest('hex');
  if (recognitionCache.has(imageHash)) {
    console.log('⚡ [Cache Hit] Returning cached card recognition result');
    return recognitionCache.get(imageHash);
  }

  let cardInfo = null;
  let method = 'ocr';

  // 1. Try Gemini Vision (if key available and not throttled)
  // Gemini receives the full card photo because Multimodal AI is trained on full cards
  if (base64Image) {
    cardInfo = await recognizeWithGemini(base64Image, 'image/jpeg', clientApiKey);
    if (cardInfo && cardInfo.name) {
      method = 'ai-vision';
      console.log(`🤖 [Gemini Vision] Identified: ${cardInfo.name} #${cardInfo.cardNumber || '?'} HP:${cardInfo.hp || '?'}`);
    }
  }

  // 2. Fallback to Local OCR + 1025 Pokémon Fuzzy Matcher
  // If headerImage is provided (isolated top banner with name and HP), use it!
  // This completely eliminates monster illustration art interference!
  if (!cardInfo || !cardInfo.name) {
    console.log('🔍 [Smart OCR] Running multi-region OCR analysis...');
    try {
      const worker = await getTesseractWorker();
      let combinedText = '';

      if (headerImage) {
        const cleanHeader = headerImage.replace(/^data:image\/[a-z]+;base64,/, '');
        const headerBuffer = Buffer.from(cleanHeader, 'base64');
        const headerRes = await worker.recognize(headerBuffer);
        const headerText = headerRes?.data?.text || '';
        console.log('🎯 [Header OCR Text]:', headerText.replace(/\n/g, ' '));
        combinedText += headerText + '\n';
      }

      if (footerImage) {
        const cleanFooter = footerImage.replace(/^data:image\/[a-z]+;base64,/, '');
        const footerBuffer = Buffer.from(cleanFooter, 'base64');
        const footerRes = await worker.recognize(footerBuffer);
        const footerText = footerRes?.data?.text || '';
        console.log('🎯 [Footer OCR Text]:', footerText.replace(/\n/g, ' '));
        combinedText += footerText + '\n';
      }

      // If no header image was provided or header text was empty, run on full image
      if (!combinedText.trim() && base64Image) {
        const cleanBase64 = base64Image.replace(/^data:image\/[a-z]+;base64,/, '');
        const imgBuffer = Buffer.from(cleanBase64, 'base64');
        const ocrResult = await worker.recognize(imgBuffer);
        combinedText = ocrResult?.data?.text || '';
        console.log('📝 Full Image OCR Preview:', combinedText.substring(0, 80).replace(/\n/g, ' '));
      }

      cardInfo = parseCardOCRText(combinedText);
      method = 'smart-ocr';
      console.log(`💡 [Smart OCR] Parsed: "${cardInfo.name}" #${cardInfo.cardNumber || '?'} HP:${cardInfo.hp || '?'}`);
    } catch (ocrErr) {
      console.warn('OCR error:', ocrErr.message);
    }
  }

  // 3. Fallback to default if nothing identified
  if (!cardInfo || !cardInfo.name) {
    cardInfo = {
      name: 'Charizard',
      baseName: 'Charizard',
      suffix: '',
      hp: null,
      cardNumber: '',
      confidence: 0.3
    };
    method = 'fallback';
  }

  // 4. Find matching cards & rank
  const matchResult = await findMatchingCards(cardInfo, base64Image);

  const result = {
    success: true,
    exactMatch: matchResult.exactMatch,
    candidates: matchResult.candidates,
    isHighConfidence: matchResult.isHighConfidence,
    scannedInfo: {
      name: cardInfo.name,
      baseName: cardInfo.baseName,
      suffix: cardInfo.suffix,
      hp: cardInfo.hp,
      cardNumber: cardInfo.cardNumber,
      method
    }
  };

  // Cache result — but DON'T cache fan-art results so re-scans get a fresh chance
  const topMatch = result.exactMatch;
  const isFanArtResult = topMatch && (topMatch.isFanArt || topMatch.isCustomCard);
  if (!isFanArtResult) {
    recognitionCache.set(imageHash, result);
    // Keep cache at reasonable size
    if (recognitionCache.size > 100) {
      const firstKey = recognitionCache.keys().next().value;
      recognitionCache.delete(firstKey);
    }
  } else {
    console.log('⏭️ [Cache Skip] Fan-art result not cached — re-scan will get fresh API attempt');
  }

  return result;
}

module.exports = {
  recognizeCardImage,
  parseCardOCRText,
  findMatchingCards,
  ALL_POKEMON
};
