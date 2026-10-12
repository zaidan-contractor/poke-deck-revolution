// ═══════════════════════════════════════════════
//  Sprite Resolver — Card Name → PokeAPI Sprites
//  Fetches animated GBA-style battle sprites
// ═══════════════════════════════════════════════

const SpriteResolver = (() => {
  // PokeAPI sprite base URLs
  const SHOWDOWN_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/showdown';
  const FALLBACK_BASE = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';

  // Cache: cardName → { front, back }
  const cache = new Map();

  // Species name overrides for tricky names
  const NAME_OVERRIDES = {
    'mr. mime': 'mr-mime',
    'mr.mime': 'mr-mime',
    'mr mime': 'mr-mime',
    'mime jr.': 'mime-jr',
    'mime jr': 'mime-jr',
    'farfetch\'d': 'farfetchd',
    'farfetched': 'farfetchd',
    'sirfetch\'d': 'sirfetchd',
    'type: null': 'type-null',
    'type:null': 'type-null',
    'tapu koko': 'tapu-koko',
    'tapu lele': 'tapu-lele',
    'tapu bulu': 'tapu-bulu',
    'tapu fini': 'tapu-fini',
    'ho-oh': 'ho-oh',
    'porygon-z': 'porygon-z',
    'porygon2': 'porygon2',
    'nidoran♀': 'nidoran-f',
    'nidoran♂': 'nidoran-m',
    'flabébé': 'flabebe',
  };

  /**
   * Clean a TCG card name into a PokeAPI species slug.
   * Strips suffixes like "EX", "GX", "V", "VMAX", "VSTAR", etc.
   */
  function cleanCardName(cardName) {
    if (!cardName) return '';

    let name = cardName.trim().toLowerCase();

    // Check overrides first
    if (NAME_OVERRIDES[name]) return NAME_OVERRIDES[name];

    // Strip card-type suffixes (order matters: longest first)
    const suffixes = [
      ' vmax', ' vstar', ' v-union', '-gx', ' gx', '-ex', ' ex',
      ' v', ' ☆', ' δ', ' lv.x', ' lvx', ' prime', ' legend',
      ' break', ' ◇', ' prism star',
    ];
    for (const suffix of suffixes) {
      if (name.endsWith(suffix)) {
        name = name.slice(0, -suffix.length);
        break;
      }
    }

    // Check overrides again after stripping suffix
    if (NAME_OVERRIDES[name]) return NAME_OVERRIDES[name];

    // Replace special chars
    name = name
      .replace(/é/g, 'e')
      .replace(/[^a-z0-9\s\-]/g, '')
      .trim()
      .replace(/\s+/g, '-');

    return name;
  }

  /**
   * Try to resolve a PokeAPI national dex ID from a species name.
   */
  async function resolvePokeId(speciesSlug) {
    if (!speciesSlug) return null;

    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${speciesSlug}`);
      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch (e) {
      // Silent fail
    }

    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${speciesSlug}`);
      if (res.ok) {
        const data = await res.json();
        return data.id;
      }
    } catch (e) {
      // Silent fail
    }

    return null;
  }

  /**
   * Get sprite URLs for a card.
   * Returns { front, back } with animated Showdown sprites when possible.
   */
  async function getSprites(card) {
    if (!card || !card.name) {
      return getPlaceholder();
    }

    const cacheKey = card.name.toLowerCase();
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    const speciesSlug = cleanCardName(card.name);
    const pokeId = await resolvePokeId(speciesSlug);

    let result;

    if (pokeId) {
      result = {
        front: `${SHOWDOWN_BASE}/${pokeId}.gif`,
        back: `${SHOWDOWN_BASE}/back/${pokeId}.gif`,
        frontStatic: `${FALLBACK_BASE}/${pokeId}.png`,
        backStatic: `${FALLBACK_BASE}/back/${pokeId}.png`,
        resolved: true,
        pokeId: pokeId,
      };
    } else {
      result = getPlaceholder();
    }

    cache.set(cacheKey, result);
    return result;
  }

  /**
   * Synchronous version — check cache only, no fetch.
   */
  function getSpritesCached(card) {
    if (!card || !card.name) return null;
    const cacheKey = card.name.toLowerCase();
    return cache.get(cacheKey) || null;
  }

  /**
   * Pre-resolve sprites for a team before battle starts.
   */
  async function preloadTeam(team) {
    const promises = team.map(card => getSprites(card));
    return Promise.allSettled(promises);
  }

  function getPlaceholder() {
    return {
      front: '',
      back: '',
      frontStatic: '',
      backStatic: '',
      resolved: false,
      pokeId: null,
    };
  }

  return {
    getSprites,
    getSpritesCached,
    preloadTeam,
    cleanCardName,
  };
})();
