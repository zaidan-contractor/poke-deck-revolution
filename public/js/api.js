// ═══════════════════════════════════════════════
//  Pokémon TCG API Wrapper (pokemontcg.io v2)
//  with Built-in Offline Fallback & Server Proxy
// ═══════════════════════════════════════════════

const PokemonAPI = (() => {
  const BASE_URL = 'https://api.pokemontcg.io/v2';
  const PROXY_URL = '/api/pokemon/search';

  // Cache to avoid repeated API calls
  const cache = new Map();

  /**
   * Search local built-in cards database
   */
  function searchLocalCards(cleanName, cleanNumber = '') {
    if (typeof BUILTIN_CARDS === 'undefined' || !BUILTIN_CARDS) return [];
    const qName = (cleanName || '').toLowerCase().trim();
    const qNum = (cleanNumber || '').toLowerCase().replace(/\s/g, '');

    return BUILTIN_CARDS.filter(card => {
      const cName = card.name.toLowerCase();
      // Match name or prefix or first word
      const nameMatch = cName.includes(qName) || qName.includes(cName.split(' ')[0]);
      if (!nameMatch) return false;

      if (qNum) {
        const cNum = (card.number || '').toLowerCase().replace(/\s/g, '');
        const cleanQNum = qNum.replace(/^0+/, ''); // strip leading zeros
        const cleanCNum = cNum.replace(/^0+/, '');
        return cleanCNum.includes(cleanQNum) || cleanQNum.includes(cleanCNum.split('/')[0]);
      }
      return true;
    });
  }

  /**
   * Fetch from proxy or direct API
   */
  async function fetchCards(query, page = 1, pageSize = 20) {
    const cacheKey = `q:${query}:${page}:${pageSize}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    // Try server proxy first
    try {
      const proxyUrl = `${PROXY_URL}?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}`;
      const res = await fetch(proxyUrl);
      if (res.ok) {
        const data = await res.json();
        if (data && data.data && data.data.length > 0) {
          cache.set(cacheKey, data);
          return data;
        }
      }
    } catch (e) {
      console.warn('Proxy fetch failed, falling back to direct API:', e);
    }

    // Try direct API as backup
    try {
      const directUrl = `${BASE_URL}/cards?q=${encodeURIComponent(query)}&page=${page}&pageSize=${pageSize}&orderBy=set.releaseDate`;
      const res = await fetch(directUrl);
      if (res.ok) {
        const data = await res.json();
        cache.set(cacheKey, data);
        return data;
      }
    } catch (e) {
      console.warn('Direct API fetch failed:', e);
    }

    return { data: [], totalCount: 0 };
  }

  /**
   * Search cards by name
   */
  async function searchByName(name, page = 1, pageSize = 20) {
    const cleanName = (name || '').trim().replace(/[^a-zA-Zéè\s\-'\.]/g, '');
    if (!cleanName) return { data: [], totalCount: 0 };

    // Check local cards first
    const localMatches = searchLocalCards(cleanName);

    // Query online
    const query = `name:"${cleanName}"`;
    const apiResult = await fetchCards(query, page, pageSize);

    // Merge: local cards first, then API cards not already in local
    const localIds = new Set(localMatches.map(c => c.id));
    const normalizedApi = (apiResult.data || [])
      .map(c => normalizeCard(c))
      .filter(c => !localIds.has(c.id));

    const combined = [...localMatches, ...normalizedApi];

    return {
      data: combined,
      totalCount: combined.length
    };
  }

  /**
   * Search cards by name with wildcard (partial match)
   */
  async function searchByNameWildcard(name, page = 1, pageSize = 20) {
    const cleanName = (name || '').trim().replace(/[^a-zA-Zéè\s\-'\.]/g, '');
    if (!cleanName) return { data: [], totalCount: 0 };

    const localMatches = searchLocalCards(cleanName);
    const query = `name:${cleanName}*`;
    const apiResult = await fetchCards(query, page, pageSize);

    const localIds = new Set(localMatches.map(c => c.id));
    const normalizedApi = (apiResult.data || [])
      .map(c => normalizeCard(c))
      .filter(c => !localIds.has(c.id));

    const combined = [...localMatches, ...normalizedApi];

    return {
      data: combined,
      totalCount: combined.length
    };
  }

  /**
   * Search for an exact card by name AND collector number
   */
  async function searchExactCard(name, number) {
    const cleanName = (name || '').trim().replace(/[^a-zA-Zéè\s\-'\.]/g, '');
    const cleanNumber = (number || '').trim().replace(/\s/g, '');

    if (!cleanName) return { data: [], totalCount: 0 };

    // Check local database for exact match
    const localMatches = searchLocalCards(cleanName, cleanNumber);
    if (localMatches.length > 0) {
      return { data: localMatches, totalCount: localMatches.length };
    }

    let query = `name:"${cleanName}"`;
    if (cleanNumber) {
      const numMatch = cleanNumber.match(/^(\d+)/);
      if (numMatch) {
        query += ` number:${numMatch[1]}`;
      }
    }

    const apiResult = await fetchCards(query, 1, 10);
    const normalizedApi = (apiResult.data || []).map(c => normalizeCard(c));

    // Fall back to name-only local matches if no exact found
    if (normalizedApi.length === 0) {
      const fallbackLocal = searchLocalCards(cleanName);
      if (fallbackLocal.length > 0) {
        return { data: fallbackLocal, totalCount: fallbackLocal.length };
      }
    }

    return {
      data: normalizedApi,
      totalCount: normalizedApi.length
    };
  }

  /**
   * Get a specific card by its unique API ID
   */
  async function getCardById(id) {
    if (typeof BUILTIN_CARDS !== 'undefined' && BUILTIN_CARDS) {
      const found = BUILTIN_CARDS.find(c => c.id === id);
      if (found) return { data: found };
    }

    try {
      const res = await fetch(`${BASE_URL}/cards/${id}`);
      if (res.ok) {
        const result = await res.json();
        return result;
      }
    } catch (e) {
      console.warn('Failed to get card by ID:', e);
    }
    return null;
  }

  /**
   * Normalize card data into our game format
   */
  function normalizeCard(apiCard) {
    if (!apiCard) return null;
    // If already normalized
    if (apiCard.primaryType && apiCard.prizeCards !== undefined) return apiCard;

    const subtypes = (apiCard.subtypes || []).map(s => s.toLowerCase());
    const name = apiCard.name || 'Unknown';

    // Determine card category
    let cardType = 'regular';
    if (name.includes(' VMAX') || subtypes.includes('vmax')) cardType = 'vmax';
    else if (name.includes(' VSTAR') || subtypes.includes('vstar')) cardType = 'vstar';
    else if (name.includes(' V') && (subtypes.includes('v') || / V$/i.test(name))) cardType = 'v';
    else if (name.includes('-GX') || subtypes.includes('gx')) cardType = 'gx';
    else if (name.includes('-EX') || name.includes(' EX') || subtypes.includes('ex')) cardType = 'ex-upper';
    else if (name.includes(' ex') || subtypes.includes('ex')) cardType = 'ex-lower';

    // Prize cards when KO'd
    let prizeCards = 1;
    if (['ex-upper', 'ex-lower', 'gx', 'v', 'vstar'].includes(cardType)) prizeCards = 2;
    if (cardType === 'vmax') prizeCards = 3;

    // Determine if it has a once-per-game power
    let specialPower = null;
    if (cardType === 'gx') {
      const gxAttack = (apiCard.attacks || []).find(a =>
        a.name && a.name.toUpperCase().includes('GX')
      );
      if (gxAttack) specialPower = { type: 'gx', attack: gxAttack };
    }
    if (cardType === 'vstar') {
      const vstarAbility = (apiCard.abilities || []).find(a =>
        a.name && (a.name.includes('Star') || a.type === 'VSTAR Power')
      );
      const vstarAttack = (apiCard.attacks || []).find(a =>
        a.name && a.name.includes('Star')
      );
      if (vstarAbility) specialPower = { type: 'vstar-ability', ability: vstarAbility };
      else if (vstarAttack) specialPower = { type: 'vstar-attack', attack: vstarAttack };
    }

    // Parse attacks
    const attacks = (apiCard.attacks || []).map(atk => ({
      name: atk.name,
      cost: atk.cost || [],
      convertedEnergyCost: atk.convertedEnergyCost || 0,
      damage: parseDamage(atk.damage),
      damageRaw: atk.damage || '',
      text: atk.text || '',
      isGX: atk.name ? atk.name.toUpperCase().includes('GX') : false,
      isVSTAR: atk.name ? atk.name.includes('Star') : false
    }));

    // Parse abilities
    const abilities = (apiCard.abilities || []).map(ab => ({
      name: ab.name,
      text: ab.text || '',
      type: ab.type || 'Ability'
    }));

    return {
      id: apiCard.id,
      name: name,
      hp: parseInt(apiCard.hp) || 70,
      types: apiCard.types || ['Colorless'],
      primaryType: (apiCard.types && apiCard.types[0]) || 'Colorless',
      cardType: cardType,
      subtypes: subtypes,
      supertype: apiCard.supertype || 'Pokémon',
      evolvesFrom: apiCard.evolvesFrom || null,
      attacks: attacks,
      abilities: abilities,
      weaknesses: (apiCard.weaknesses || []).map(w => ({
        type: w.type,
        value: w.value
      })),
      resistances: (apiCard.resistances || []).map(r => ({
        type: r.type,
        value: r.value
      })),
      retreatCost: apiCard.retreatCost || [],
      convertedRetreatCost: apiCard.convertedRetreatCost || 0,
      prizeCards: prizeCards,
      specialPower: specialPower,
      images: {
        small: apiCard.images ? apiCard.images.small : 'https://images.pokemontcg.io/base1/4.png',
        large: apiCard.images ? apiCard.images.large : 'https://images.pokemontcg.io/base1/4_hires.png'
      },
      set: {
        id: apiCard.set ? apiCard.set.id : '',
        name: apiCard.set ? apiCard.set.name : 'Custom Set',
        series: apiCard.set ? apiCard.set.series : ''
      },
      number: apiCard.number || '1',
      rarity: apiCard.rarity || 'Common'
    };
  }

  function parseDamage(dmgStr) {
    if (!dmgStr) return 0;
    const match = dmgStr.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  function getTypeColor(type) {
    const colors = {
      'Grass': '#78C850', 'Fire': '#F08030', 'Water': '#6890F0',
      'Lightning': '#F8D030', 'Psychic': '#A040A0', 'Fighting': '#C03028',
      'Darkness': '#705848', 'Metal': '#B8B8D0', 'Dragon': '#7038F8',
      'Colorless': '#A8A878', 'Fairy': '#EE99AC'
    };
    return colors[type] || '#A8A878';
  }

  function getTypeEmoji(type) {
    const emojis = {
      'Grass': '🌿', 'Fire': '🔥', 'Water': '💧',
      'Lightning': '⚡', 'Psychic': '🔮', 'Fighting': '👊',
      'Darkness': '🌑', 'Metal': '⚙️', 'Dragon': '🐉',
      'Colorless': '⭐', 'Fairy': '🧚'
    };
    return emojis[type] || '⭐';
  }

  return {
    searchByName,
    searchByNameWildcard,
    searchExactCard,
    getCardById,
    normalizeCard,
    getTypeColor,
    getTypeEmoji
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PokemonAPI;
}
