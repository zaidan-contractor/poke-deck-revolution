// ═══════════════════════════════════════════════
//  Collection Manager (localStorage)
// ═══════════════════════════════════════════════

const Collection = (() => {
  const STORAGE_KEY = 'pokemon_card_battle_collection';

  /**
   * Load all collections from localStorage
   */
  function loadAll() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return { player1: [], player2: [] };
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to load collection:', e);
      return { player1: [], player2: [] };
    }
  }

  /**
   * Save all collections
   */
  function saveAll(collections) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collections));
    } catch (e) {
      console.error('Failed to save collection:', e);
    }
  }

  /**
   * Add a card to a player's collection
   */
  function addCard(player, card) {
    const collections = loadAll();
    const key = player === 1 ? 'player1' : 'player2';

    // Check for duplicates
    const exists = collections[key].some(c => c.id === card.id);
    if (exists) return false;

    collections[key].push(card);
    saveAll(collections);
    return true;
  }

  /**
   * Remove a card from a player's collection
   */
  function removeCard(player, cardId) {
    const collections = loadAll();
    const key = player === 1 ? 'player1' : 'player2';
    collections[key] = collections[key].filter(c => c.id !== cardId);
    saveAll(collections);
  }

  /**
   * Get a player's collection
   */
  function getPlayerCards(player) {
    const collections = loadAll();
    return player === 1 ? collections.player1 : collections.player2;
  }

  /**
   * Get card count per player
   */
  function getCount(player) {
    return getPlayerCards(player).length;
  }

  /**
   * Filter cards by type category
   */
  function filterByType(cards, filter) {
    if (filter === 'all') return cards;
    if (filter === 'regular') return cards.filter(c => c.cardType === 'regular' && !c.isFanArt);
    if (filter === 'ex') return cards.filter(c => c.cardType === 'ex-upper' || c.cardType === 'ex-lower');
    if (filter === 'gx') return cards.filter(c => c.cardType === 'gx');
    if (filter === 'v') return cards.filter(c => ['v', 'vmax', 'vstar'].includes(c.cardType));
    if (filter === 'fanart' || filter === 'custom') return cards.filter(c => c.isFanArt || c.isCustomCard);
    return cards;
  }

  /**
   * Clear all data
   */
  function clearAll() {
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Get badge class for card type
   */
  function getBadgeClass(cardType) {
    const badges = {
      'ex-upper': 'badge-ex',
      'ex-lower': 'badge-ex',
      'gx': 'badge-gx',
      'v': 'badge-v',
      'vmax': 'badge-vmax',
      'vstar': 'badge-vstar'
    };
    return badges[cardType] || '';
  }

  /**
   * Get badge label for card type
   */
  function getBadgeLabel(cardType) {
    const labels = {
      'ex-upper': 'EX',
      'ex-lower': 'ex',
      'gx': 'GX',
      'v': 'V',
      'vmax': 'VMAX',
      'vstar': 'VSTAR'
    };
    return labels[cardType] || '';
  }

  /**
   * Render a card element for the collection grid
   */
  function renderCardElement(card, options = {}) {
    const div = document.createElement('div');
    div.className = 'collection-card';
    div.dataset.cardId = card.id;

    let html = `<img src="${card.images.small || card.images.large}" alt="${card.name}" loading="lazy">`;

    if (card.isFanArt || card.isCustomCard) {
      html += `<span class="card-badge badge-fanart">⭐ FAN-ART</span>`;
    } else {
      const badgeClass = getBadgeClass(card.cardType);
      const badgeLabel = getBadgeLabel(card.cardType);
      if (badgeClass) {
        html += `<span class="card-badge ${badgeClass}">${badgeLabel}</span>`;
      }
    }

    if (options.deletable) {
      html += `<button class="card-delete" data-card-id="${card.id}">✕</button>`;
    }

    div.innerHTML = html;
    return div;
  }

  return {
    loadAll,
    saveAll,
    addCard,
    removeCard,
    getPlayerCards,
    getCount,
    filterByType,
    clearAll,
    getBadgeClass,
    getBadgeLabel,
    renderCardElement
  };
})();
