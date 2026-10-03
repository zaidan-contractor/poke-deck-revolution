// ═══════════════════════════════════════════════
//  Main App Controller
//  Handles navigation, UI, and screen orchestration
// ═══════════════════════════════════════════════

const App = (() => {
  // ─── State ───
  let currentScreen = 'title-screen';
  let scanningForPlayer = 1;
  let selectedMode = 'standard';
  let pendingCards = []; // cards found during scan, awaiting confirmation
  let selectedCard = null;
  let teamSelectPlayer = 1;
  let p1Team = [];
  let p2Team = [];
  let socket = null;
  let scanSessionId = null;

  // ─── Init ───
  function init() {
    setupTitleStars();
    bindNavigation();
    bindScanner();
    bindCollection();
    bindBattleSetup();
    bindBattleUI();
    initSocket();
    updateCollectionCounts();
  }

  // ─── Socket.io ───
  function initSocket() {
    socket = io();

    socket.on('phone-connected', () => {
      const statusEl = document.getElementById('connection-status');
      if (statusEl) {
        statusEl.classList.add('connected');
        statusEl.querySelector('.status-text').textContent = '📱 Phone connected!';
      }
      toast('Phone connected!', 'success');
    });

    socket.on('card-received-from-phone', async (data) => {
      toast(`Received: ${data.cardName || 'card'} from phone`, 'info');
      // Process the scanned card from phone
      await processPhoneScan(data);
    });

    socket.on('peer-disconnected', () => {
      const statusEl = document.getElementById('connection-status');
      if (statusEl) {
        statusEl.classList.remove('connected');
        statusEl.querySelector('.status-text').textContent = 'Phone disconnected';
      }
    });
  }

  // ─── Screen Navigation ───
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const screen = document.getElementById(id);
    if (screen) {
      screen.classList.add('active');
      currentScreen = id;
    }
  }

  // ─── Title Screen Stars ───
  function setupTitleStars() {
    const container = document.getElementById('stars-container');
    if (!container) return;
    for (let i = 0; i < 80; i++) {
      const star = document.createElement('div');
      star.className = 'star';
      star.style.left = Math.random() * 100 + '%';
      star.style.top = Math.random() * 100 + '%';
      star.style.setProperty('--duration', (2 + Math.random() * 4) + 's');
      star.style.setProperty('--max-opacity', (0.3 + Math.random() * 0.7));
      star.style.animationDelay = Math.random() * 3 + 's';
      container.appendChild(star);
    }
  }

  // ─── Navigation Bindings ───
  function bindNavigation() {
    // Title menu
    on('btn-new-game', 'click', () => showScreen('scanner-hub'));
    on('btn-collection', 'click', () => { refreshCollection(); showScreen('collection-screen'); });
    on('btn-battle', 'click', () => showScreen('battle-setup'));

    // Back buttons
    on('scanner-back', 'click', () => showScreen('title-screen'));
    on('phone-connect-back', 'click', () => showScreen('scanner-hub'));
    on('webcam-back', 'click', () => { Scanner.stopWebcam(); showScreen('scanner-hub'); });
    on('manual-back', 'click', () => showScreen('scanner-hub'));
    on('confirm-back', 'click', () => showScreen('scanner-hub'));
    on('collection-back', 'click', () => showScreen('title-screen'));
    on('setup-back', 'click', () => showScreen('title-screen'));
    on('team-back', 'click', () => showScreen('battle-setup'));

    // Collection actions
    on('btn-go-scan', 'click', () => showScreen('scanner-hub'));
    on('btn-go-battle', 'click', () => showScreen('battle-setup'));

    // Player selector
    on('btn-player1', 'click', () => setPlayerScan(1));
    on('btn-player2', 'click', () => setPlayerScan(2));
  }

  function setPlayerScan(player) {
    scanningForPlayer = player;
    document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.player-btn[data-player="${player}"]`).classList.add('active');
    const label = document.getElementById('scan-player-label');
    if (label) label.textContent = `P${player}`;
  }

  // ─── Scanner Bindings ───
  function bindScanner() {
    // Scan method selection
    on('btn-scan-phone', 'click', () => setupPhoneScanner());
    on('btn-scan-webcam', 'click', () => setupWebcamScanner());
    on('btn-scan-manual', 'click', () => showScreen('manual-search'));

    // Phone QR copy button
    on('btn-copy-url', 'click', () => {
      const urlEl = document.getElementById('qr-url');
      const url = urlEl ? (urlEl.href || urlEl.textContent) : '';
      if (url) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(() => {
            toast('Link copied to clipboard! Open on your phone.', 'success');
          }).catch(() => fallbackCopy(url));
        } else {
          fallbackCopy(url);
        }
      }
    });

    // Webcam scan & upload
    on('btn-capture', 'click', () => performWebcamScan());
    on('btn-flip-cam', 'click', async () => {
      const video = document.getElementById('webcam-video');
      toast('Switching camera...', 'info');
      const ok = await Scanner.flipCamera(video);
      if (!ok) toast('Could not switch camera', 'error');
    });

    const fileInput = document.getElementById('webcam-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          performFileScan(e.target.files[0]);
        }
      });
    }

    // Dock quick search
    on('btn-dock-search', 'click', () => performDockSearch());
    const dockInput = document.getElementById('dock-search-input');
    if (dockInput) {
      dockInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performDockSearch();
      });
    }

    // Dock quick tags
    document.querySelectorAll('.dock-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const name = tag.dataset.name;
        if (dockInput) dockInput.value = name;
        loadDockCards(name);
      });
    });

    // Manual search
    on('btn-search', 'click', () => performManualSearch());
    on('search-input', 'keypress', (e) => { if (e.key === 'Enter') performManualSearch(); });

    // Card confirmation
    on('btn-confirm-yes', 'click', () => confirmCard());
    on('btn-confirm-edit', 'click', () => openCardEditor());
    on('btn-close-card-editor', 'click', () => closeCardEditor());
    on('btn-save-card-edit', 'click', () => saveCardEditor());
    on('btn-confirm-no', 'click', () => showScreen('scanner-hub'));

    // Digitize screen
    on('btn-scan-another', 'click', () => showScreen('scanner-hub'));
    on('btn-done-scanning', 'click', () => { refreshCollection(); showScreen('collection-screen'); });
  }

  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      toast('Link copied to clipboard!', 'success');
    } catch(err) {
      toast('Please copy link manually: ' + text, 'info');
    }
    document.body.removeChild(ta);
  }

  // ── Phone Scanner Setup ──
  async function setupPhoneScanner() {
    showScreen('phone-connect');

    // Create scan session
    scanSessionId = 'scan-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    socket.emit('create-scan-session', scanSessionId);

    const qrImg = document.getElementById('qr-img');
    const qrSpinner = document.getElementById('qr-loading-spinner');
    const qrUrlEl = document.getElementById('qr-url');
    const ipSelect = document.getElementById('ip-select');
    const ipWrap = document.getElementById('ip-selector-wrap');

    if (qrImg) qrImg.style.display = 'none';
    if (qrSpinner) {
      qrSpinner.style.display = 'block';
      qrSpinner.textContent = '⚡ Generating QR code...';
    }

    // Get server info for QR URL & image
    try {
      const resp = await fetch(`/api/server-info?session=${scanSessionId}`);
      if (!resp.ok) throw new Error('Server response error: ' + resp.status);
      const info = await resp.json();

      if (info.qrDataUrl && qrImg) {
        qrImg.src = info.qrDataUrl;
        qrImg.style.display = 'block';
        if (qrSpinner) qrSpinner.style.display = 'none';
      }

      if (qrUrlEl) {
        qrUrlEl.textContent = info.scanUrl;
        qrUrlEl.href = info.scanUrl;
      }

      // Populate IP selection if multiple interfaces
      if (info.allIPs && info.allIPs.length > 1 && ipSelect && ipWrap) {
        ipSelect.innerHTML = '';
        info.allIPs.forEach(ip => {
          const opt = document.createElement('option');
          opt.value = ip;
          opt.textContent = ip;
          if (ip === info.ip) opt.selected = true;
          ipSelect.appendChild(opt);
        });
        ipWrap.style.display = 'flex';
        ipSelect.onchange = async () => {
          const chosen = ipSelect.value;
          try {
            const r = await fetch(`/api/server-info?session=${scanSessionId}&ip=${chosen}`);
            const d = await r.json();
            if (d.qrDataUrl && qrImg) qrImg.src = d.qrDataUrl;
            if (qrUrlEl) {
              qrUrlEl.textContent = d.scanUrl;
              qrUrlEl.href = d.scanUrl;
            }
          } catch(err) {
            console.warn('IP switch error:', err);
          }
        };
      }
    } catch (e) {
      console.error('Failed to get server info:', e);
      if (qrSpinner) qrSpinner.textContent = '⚠️ Could not load QR. Open URL below:';
      const fallbackUrl = `http://localhost:3000/scan.html?session=${scanSessionId}`;
      if (qrUrlEl) {
        qrUrlEl.textContent = fallbackUrl;
        qrUrlEl.href = fallbackUrl;
      }
      toast('QR server connection error. Use the link below!', 'error');
    }
  }

  async function processPhoneScan(data) {
    const rawName = (data && data.cardName) ? data.cardName.trim() : '';
    const rawNumber = (data && data.cardNumber) ? data.cardNumber.trim() : '';

    // ── FAST PATH: Phone sent full card data (exact match, no search needed) ──
    if (data && data.cardData && data.cardData.id) {
      console.log('[Phone Scan] Full card data received for:', data.cardData.name, 'id:', data.cardData.id);
      showLoading(`⚡ Digitizing ${data.cardData.name} from phone...`);

      // Normalize the raw API card to our internal format
      const normalized = PokemonAPI.normalizeCard(data.cardData);
      hideLoading();

      if (normalized) {
        pendingCards = [normalized];
        selectedCard = normalized;
        showSingleConfirmation(normalized);
        toast(`📱 Received ${normalized.name} from phone!`, 'success');
      } else {
        toast(`Card data error for "${rawName}". Trying search...`, 'error');
        // Fall through to search below
        await _phoneScanByName(rawName, rawNumber);
      }
      return;
    }

    // ── FALLBACK: Only card name was sent, search by name ──
    if (!rawName) {
      toast('No card name received from phone. Please try again!', 'error');
      return;
    }
    await _phoneScanByName(rawName, rawNumber);
  }

  async function _phoneScanByName(rawName, rawNumber) {
    showLoading(`⚡ Searching for ${rawName}...`);

    let results = null;
    if (rawNumber) {
      results = await Scanner.manualSearch(rawName, rawNumber);
    }
    if (!results || !results.success || results.cards.length === 0) {
      results = await Scanner.manualSearch(rawName, '');
    }

    hideLoading();

    if (results && results.success && results.cards.length > 0) {
      pendingCards = results.cards;
      showCardConfirmation(results.cards);
      toast(`📱 Received ${rawName} from phone!`, 'success');
    } else {
      toast(`Received "${rawName}" from phone. Pick your version below!`, 'info');
      showScreen('webcam-scanner');
      const dockInput = document.getElementById('dock-search-input');
      if (dockInput) dockInput.value = rawName;
      loadDockCards(rawName);
    }
  }


  // ── Webcam Scanner Setup ──
  async function setupWebcamScanner() {
    showScreen('webcam-scanner');
    const video = document.getElementById('webcam-video');
    const success = await Scanner.startWebcam(video);
    if (!success) {
      toast('Camera blocked or unavailable. You can click "📁 UPLOAD PHOTO" or search below!', 'info');
    }
    // Preload popular cards into dock
    loadDockCards('Charizard');
  }

  async function performWebcamScan() {
    const video = document.getElementById('webcam-video');
    const canvas = document.getElementById('webcam-canvas');
    const statusEl = document.getElementById('ocr-status');
    const statusText = document.getElementById('ocr-status-text') || statusEl.querySelector('span');

    statusEl.style.display = 'flex';
    statusText.textContent = '📸 Snapping card frame...';

    const result = await Scanner.scanCard(video, canvas, (msg) => {
      statusText.textContent = msg;
    });

    statusEl.style.display = 'none';

    if (result.success && result.cards && result.cards.length > 0) {
      pendingCards = result.cards;
      Scanner.stopWebcam();
      showCardConfirmation(result.cards);
    } else {
      toast(result.error || 'Card recognized! Select your exact card below.', 'info');
      const query = result.scannedName || 'Charizard';
      const dockInput = document.getElementById('dock-search-input');
      if (dockInput && result.scannedName) dockInput.value = result.scannedName;
      loadDockCards(query, result.scannedNumber);
    }
  }

  async function performFileScan(file) {
    if (!file) return;
    const canvas = document.getElementById('webcam-canvas');
    const statusEl = document.getElementById('ocr-status');
    const statusText = document.getElementById('ocr-status-text') || statusEl.querySelector('span');

    statusEl.style.display = 'flex';
    statusText.textContent = 'Analyzing photo...';

    const result = await Scanner.scanImageFile(file, canvas, (msg) => {
      statusText.textContent = msg;
    });

    statusEl.style.display = 'none';

    if (result.success && result.cards && result.cards.length > 0) {
      pendingCards = result.cards;
      Scanner.stopWebcam();
      showCardConfirmation(result.cards);
    } else {
      toast(result.error || 'Photo analyzed! Select your card version below.', 'info');
      const query = result.scannedName || 'Charizard';
      const dockInput = document.getElementById('dock-search-input');
      if (dockInput && result.scannedName) dockInput.value = result.scannedName;
      loadDockCards(query, result.scannedNumber);
    }
  }

  // ── Quick Finder Dock ──
  function performDockSearch() {
    const input = document.getElementById('dock-search-input');
    const query = input ? input.value.trim() : '';
    if (query) {
      loadDockCards(query);
    }
  }

  async function loadDockCards(name, number = '') {
    const container = document.getElementById('dock-results');
    if (!container) return;
    container.innerHTML = '<div style="font-size:7px; color:var(--text-gold); padding:8px;">🔍 Finding cards...</div>';

    let cards = [];
    if (number) {
      const res = await PokemonAPI.searchExactCard(name, number);
      cards = res.data || [];
    }
    if (cards.length === 0) {
      const res = await PokemonAPI.searchByName(name);
      cards = res.data || [];
    }
    if (cards.length === 0) {
      const res = await PokemonAPI.searchByNameWildcard(name);
      cards = res.data || [];
    }

    if (cards.length === 0) {
      container.innerHTML = `<div style="font-size:7px; color:#888; padding:8px;">No cards found for "${name}". Try typing card name above.</div>`;
      return;
    }

    container.innerHTML = '';
    cards.slice(0, 12).forEach(card => {
      const item = document.createElement('div');
      item.className = 'dock-card-item';
      const badge = Collection.getBadgeLabel(card.cardType);
      item.innerHTML = `
        <img src="${card.images.small}" alt="${card.name}" loading="lazy">
        <div class="dock-card-name">${card.name}</div>
        <div class="dock-card-meta">#${card.number} • HP ${card.hp}</div>
        ${badge ? `<div style="font-size:6px; color:var(--text-gold); font-weight:bold;">[${badge}]</div>` : ''}
      `;
      item.addEventListener('click', () => {
        Scanner.stopWebcam();
        selectedCard = card;
        showSingleConfirmation(card);
      });
      container.appendChild(item);
    });
  }

  // ── Manual Search ──
  async function performManualSearch() {
    const input = document.getElementById('search-input');
    const query = input.value.trim();
    if (!query) return;

    showLoading('Searching...');
    const result = await Scanner.manualSearch(query, '');
    hideLoading();

    const container = document.getElementById('search-results');

    if (!result.success || result.cards.length === 0) {
      container.innerHTML = '<p class="search-placeholder">No cards found. Try a different name.</p>';
      return;
    }

    container.innerHTML = '';
    result.cards.forEach(card => {
      const div = document.createElement('div');
      div.className = 'search-card';
      div.innerHTML = `
        <img src="${card.images.small}" alt="${card.name}" loading="lazy">
        <div class="search-card-info">
          <div class="search-card-name">${card.name}</div>
          <div>${card.set.name} • ${card.number}</div>
          <div>HP ${card.hp} • ${card.primaryType}</div>
        </div>
      `;
      div.addEventListener('click', () => {
        selectedCard = card;
        showSingleConfirmation(card);
      });
      container.appendChild(div);
    });
  }

  // ── Card Confirmation ──
  function showCardConfirmation(cards) {
    showScreen('card-confirm');

    if (cards.length === 1) {
      showSingleConfirmation(cards[0]);
      return;
    }

    // Multiple matches — show grid for user to pick
    const confirmGrid = document.getElementById('confirm-cards');
    const confirmSingle = document.getElementById('confirm-single');
    confirmGrid.style.display = 'grid';
    confirmSingle.style.display = 'none';
    confirmGrid.innerHTML = '';

    cards.forEach(card => {
      const div = document.createElement('div');
      div.className = 'search-card';
      div.innerHTML = `
        <img src="${card.images.small}" alt="${card.name}" loading="lazy">
        <div class="search-card-info">
          <div class="search-card-name">${card.name}</div>
          <div>${card.set.name} • #${card.number}</div>
          <div>HP ${card.hp} • ${card.primaryType}</div>
          ${card.cardType !== 'regular' ? `<div style="color:var(--text-gold)">${Collection.getBadgeLabel(card.cardType)}</div>` : ''}
        </div>
      `;
      div.addEventListener('click', () => {
        selectedCard = card;
        showSingleConfirmation(card);
      });
      confirmGrid.appendChild(div);
    });
  }

  function showSingleConfirmation(card) {
    selectedCard = card;
    const confirmGrid = document.getElementById('confirm-cards');
    const confirmSingle = document.getElementById('confirm-single');
    confirmGrid.style.display = 'none';
    confirmSingle.style.display = 'block';

    document.getElementById('confirm-card-img').src = card.images.large || card.images.small;

    const statsEl = document.getElementById('confirm-card-stats');
    const isFanArt = card.isFanArt || card.isCustomCard;
    const isGoldCopy = card.isGoldenCopy;
    const isAdapted = card.isPhysicalAdapted;
    const badgeLabel = isFanArt ? '⭐ FAN-ART' :
                       isGoldCopy ? '🥇 GOLD COPY' :
                       isAdapted ? '🔄 ADAPTED' :
                       Collection.getBadgeLabel(card.cardType);
    const badgeStyle = isFanArt ? 'background:linear-gradient(135deg,#ff007f,#00f0ff);color:#fff;padding:2px 6px;border-radius:4px;font-size:8px;' :
                       isGoldCopy ? 'background:linear-gradient(135deg,#FFD700,#FFA500);color:#000;padding:2px 6px;border-radius:4px;font-size:8px;font-weight:bold;' :
                       isAdapted ? 'background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;padding:2px 6px;border-radius:4px;font-size:8px;' :
                       'color:var(--text-gold);';

    const attacks = (card.attacks || []).map(a => {
      const costStr = (a.cost || []).map(c => `[${c}]`).join('');
      return `${costStr ? `<span style="color:#00f0ff">${costStr}</span> ` : ''}<strong>${a.name}</strong> — ${a.damageRaw || a.damage || '—'} dmg`;
    }).join('<br>');

    const adaptedLine = isAdapted ? `<br><span style="color:#a855f7;font-size:10px;">Adapted from: ${card.adaptedFrom}</span>` : '';
    const goldLine = isGoldCopy ? `<br><span style="color:#FFD700;font-size:10px;">Golden counterfeit → showing official card</span>` : '';

    statsEl.innerHTML = `
      <strong>${card.name}</strong> ${badgeLabel ? `<span style="${badgeStyle}">[${badgeLabel}]</span>` : ''}<br>
      HP: ${card.hp} • Type: ${PokemonAPI.getTypeEmoji(card.primaryType)} ${card.primaryType}<br>
      Set: ${card.set?.name || 'Collection'} • #${card.number || 'Custom'}${adaptedLine}${goldLine}<br>
      <br>
      <strong>Attacks:</strong><br>${attacks || 'No special attacks'}<br>
      ${card.weaknesses && card.weaknesses.length > 0 ? `Weakness: ${card.weaknesses.map(w => w.type + ' ' + (w.value || 'x2')).join(', ')}<br>` : ''}
      ${card.resistances && card.resistances.length > 0 ? `Resistance: ${card.resistances.map(r => r.type + ' ' + (r.value || '-20')).join(', ')}<br>` : ''}
      Retreat: ${card.convertedRetreatCost || 2} energy
    `;

    showScreen('card-confirm');
  }

  // ── Card Tweaker / Editor ──
  function openCardEditor() {
    if (!selectedCard) return;
    const modal = document.getElementById('modal-card-editor');
    if (!modal) return;

    document.getElementById('edit-card-name').value = selectedCard.name || '';
    document.getElementById('edit-card-hp').value = selectedCard.hp || 150;
    document.getElementById('edit-card-type').value = selectedCard.cardType || 'regular';
    document.getElementById('edit-primary-type').value = selectedCard.primaryType || 'Colorless';

    const atk1 = (selectedCard.attacks && selectedCard.attacks[0]) || null;
    const atk2 = (selectedCard.attacks && selectedCard.attacks[1]) || null;

    document.getElementById('edit-atk1-name').value = atk1 ? atk1.name : 'Attack 1';
    document.getElementById('edit-atk1-dmg').value = atk1 ? atk1.damage : 60;
    document.getElementById('edit-atk1-cost').value = atk1 && atk1.cost ? atk1.cost.join(', ') : 'Colorless, Colorless';

    document.getElementById('edit-atk2-name').value = atk2 ? atk2.name : (selectedCard.cardType === 'gx' ? 'Signature GX' : 'Heavy Impact');
    document.getElementById('edit-atk2-dmg').value = atk2 ? atk2.damage : (selectedCard.cardType === 'gx' ? 180 : 120);
    document.getElementById('edit-atk2-cost').value = atk2 && atk2.cost ? atk2.cost.join(', ') : 'Colorless, Colorless, Colorless';

    modal.style.display = 'flex';
  }

  function closeCardEditor() {
    const modal = document.getElementById('modal-card-editor');
    if (modal) modal.style.display = 'none';
  }

  function saveCardEditor() {
    if (!selectedCard) return;

    const name = document.getElementById('edit-card-name').value.trim() || selectedCard.name;
    const hp = parseInt(document.getElementById('edit-card-hp').value, 10) || selectedCard.hp;
    const cardType = document.getElementById('edit-card-type').value || selectedCard.cardType;
    const primaryType = document.getElementById('edit-primary-type').value || selectedCard.primaryType;

    const atk1Name = document.getElementById('edit-atk1-name').value.trim() || 'Attack 1';
    const atk1Dmg = parseInt(document.getElementById('edit-atk1-dmg').value, 10) || 50;
    const atk1Cost = document.getElementById('edit-atk1-cost').value.split(',').map(s => s.trim()).filter(Boolean);

    const atk2Name = document.getElementById('edit-atk2-name').value.trim() || 'Attack 2';
    const atk2Dmg = parseInt(document.getElementById('edit-atk2-dmg').value, 10) || 100;
    const atk2Cost = document.getElementById('edit-atk2-cost').value.split(',').map(s => s.trim()).filter(Boolean);

    const isGx = cardType === 'gx';

    selectedCard.name = name;
    selectedCard.hp = hp;
    selectedCard.cardType = cardType;
    selectedCard.primaryType = primaryType;
    selectedCard.types = [primaryType];
    selectedCard.prizeCards = ['gx', 'ex-upper', 'ex-lower', 'v', 'vstar'].includes(cardType) ? 2 : (cardType === 'vmax' ? 3 : 1);
    selectedCard.isFanArt = true;
    selectedCard.isCustomCard = true;
    selectedCard.customTag = '⭐ FAN-ART';

    selectedCard.attacks = [
      {
        name: atk1Name,
        damage: atk1Dmg,
        damageRaw: String(atk1Dmg),
        cost: atk1Cost.length > 0 ? atk1Cost : [primaryType, 'Colorless'],
        convertedEnergyCost: atk1Cost.length || 2,
        text: '',
        isGX: false,
        isVSTAR: false
      },
      {
        name: atk2Name,
        damage: atk2Dmg,
        damageRaw: String(atk2Dmg),
        cost: atk2Cost.length > 0 ? atk2Cost : [primaryType, primaryType, 'Colorless'],
        convertedEnergyCost: atk2Cost.length || 3,
        text: isGx ? 'GX Attack: Can only be used once per battle.' : '',
        isGX: isGx || atk2Name.toUpperCase().includes('GX'),
        isVSTAR: false
      }
    ];

    closeCardEditor();
    showSingleConfirmation(selectedCard);
    toast(`⭐ Updated ${name} successfully!`, 'success');
  }

  function confirmCard() {
    if (!selectedCard) return;

    // Add to collection
    const added = Collection.addCard(scanningForPlayer, selectedCard);

    if (added) {
      // Play digitize animation
      playDigitizeAnimation(selectedCard);
    } else {
      toast('This card is already in your collection!', 'info');
      showScreen('scanner-hub');
    }
  }

  // ── Digitization Animation ──
  function playDigitizeAnimation(card) {
    showScreen('digitize-screen');

    const canvas = document.getElementById('digitize-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = [];
    const typeColor = PokemonAPI.getTypeColor(card.primaryType);
    const particleCount = 120;

    // Create particles
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 200,
        y: canvas.height / 2 + (Math.random() - 0.5) * 280,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        size: 2 + Math.random() * 4,
        color: typeColor,
        alpha: 1,
        phase: 0 // 0=scatter, 1=converge
      });
    }

    let frame = 0;
    const totalFrames = 120;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      // Phase 1 (0-40): Particles scatter outward
      // Phase 2 (40-80): Particles converge to center
      // Phase 3 (80-120): Flash and show result

      if (frame < 40) {
        // Scatter
        particles.forEach(p => {
          p.x += p.vx * 1.5;
          p.y += p.vy * 1.5;
          p.alpha = 1;
          ctx.beginPath();
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha * (1 - frame / 60);
          ctx.fillRect(p.x, p.y, p.size, p.size);
        });
        ctx.globalAlpha = 1;
      } else if (frame < 80) {
        // Converge
        const progress = (frame - 40) / 40;
        particles.forEach(p => {
          p.x += (centerX - p.x) * 0.08;
          p.y += (centerY - p.y) * 0.08;
          p.alpha = progress;
          ctx.beginPath();
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.alpha;
          ctx.fillRect(p.x, p.y, p.size * (1 - progress * 0.5), p.size * (1 - progress * 0.5));
        });

        // Glow at center
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 100 * progress);
        gradient.addColorStop(0, typeColor + '80');
        gradient.addColorStop(1, 'transparent');
        ctx.globalAlpha = progress;
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      } else if (frame < 90) {
        // Flash
        const flashAlpha = 1 - (frame - 80) / 10;
        ctx.fillStyle = '#fff';
        ctx.globalAlpha = flashAlpha;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
      } else if (frame >= 90) {
        // Show result
        const resultEl = document.getElementById('digitize-result');
        if (resultEl.style.display === 'none') {
          resultEl.style.display = 'block';
          document.getElementById('result-card-img').src = card.images.large || card.images.small;
          document.getElementById('result-stats').innerHTML = `
            <strong style="color:var(--text-gold);font-size:11px">${card.name}</strong><br>
            HP ${card.hp} • ${PokemonAPI.getTypeEmoji(card.primaryType)} ${card.primaryType}<br>
            ${Collection.getBadgeLabel(card.cardType) ? `[${Collection.getBadgeLabel(card.cardType)}]` : ''} • ${card.set.name}<br>
            <span style="color:var(--hp-green)">✅ Added to Player ${scanningForPlayer}'s collection!</span>
          `;
        }
        return; // Stop animation
      }

      if (frame < totalFrames) {
        requestAnimationFrame(animate);
      }
    }

    // Hide result initially
    document.getElementById('digitize-result').style.display = 'none';
    animate();
    updateCollectionCounts();
  }

  // ─── Collection ───
  function bindCollection() {
    // Tabs
    document.querySelectorAll('.col-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.col-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        refreshCollection();
      });
    });

    // Filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        refreshCollection();
      });
    });
  }

  function refreshCollection() {
    const activeTab = document.querySelector('.col-tab.active');
    const player = activeTab && activeTab.dataset.tab === 'p2' ? 2 : 1;
    const filter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';

    let cards = Collection.getPlayerCards(player);
    cards = Collection.filterByType(cards, filter);

    const grid = document.getElementById('collection-grid');
    grid.innerHTML = '';

    if (cards.length === 0) {
      grid.innerHTML = '<p class="empty-collection">No cards found. Go scan some!</p>';
      return;
    }

    cards.forEach(card => {
      const el = Collection.renderCardElement(card, { deletable: true });
      el.querySelector('.card-delete')?.addEventListener('click', (e) => {
        e.stopPropagation();
        Collection.removeCard(player, card.id);
        refreshCollection();
        updateCollectionCounts();
      });
      grid.appendChild(el);
    });

    updateCollectionCounts();
  }

  function updateCollectionCounts() {
    const p1Count = document.getElementById('p1-count');
    const p2Count = document.getElementById('p2-count');
    if (p1Count) p1Count.textContent = Collection.getCount(1);
    if (p2Count) p2Count.textContent = Collection.getCount(2);
  }

  // ─── Battle Setup ───
  function bindBattleSetup() {
    // Mode selection
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        document.querySelectorAll('.mode-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        selectedMode = card.dataset.mode;
      });
    });

    on('btn-start-team-select', 'click', () => startTeamSelect());
    on('btn-team-confirm', 'click', () => confirmTeam());
  }

  function startTeamSelect() {
    const p1Cards = Collection.getPlayerCards(1);
    const p2Cards = Collection.getPlayerCards(2);
    const modeConfig = BattleEngine.MODES[selectedMode];

    if (p1Cards.length < modeConfig.partySize) {
      toast(`Player 1 needs at least ${modeConfig.partySize} cards! (has ${p1Cards.length})`, 'error');
      return;
    }
    if (p2Cards.length < modeConfig.partySize) {
      toast(`Player 2 needs at least ${modeConfig.partySize} cards! (has ${p2Cards.length})`, 'error');
      return;
    }

    teamSelectPlayer = 1;
    p1Team = [];
    p2Team = [];
    showTeamSelectScreen();
  }

  function showTeamSelectScreen() {
    showScreen('team-select');
    const modeConfig = BattleEngine.MODES[selectedMode];
    const title = document.getElementById('team-select-title');
    title.textContent = `PLAYER ${teamSelectPlayer} — PICK ${modeConfig.partySize} POKéMON`;

    const cards = Collection.getPlayerCards(teamSelectPlayer);
    const currentTeam = teamSelectPlayer === 1 ? p1Team : p2Team;

    // Render slots
    const slotsContainer = document.getElementById('team-slots');
    slotsContainer.innerHTML = '';
    for (let i = 0; i < modeConfig.partySize; i++) {
      const slot = document.createElement('div');
      slot.className = 'team-slot' + (currentTeam[i] ? ' filled' : '');
      if (currentTeam[i]) {
        slot.innerHTML = `
          <img src="${currentTeam[i].images.small}" alt="${currentTeam[i].name}">
          <button class="slot-remove" data-index="${i}">✕</button>
        `;
        slot.querySelector('.slot-remove').addEventListener('click', () => {
          currentTeam.splice(i, 1);
          showTeamSelectScreen();
        });
      } else {
        slot.textContent = '?';
      }
      slotsContainer.appendChild(slot);
    }

    // Render available cards
    const availContainer = document.getElementById('team-available');
    availContainer.innerHTML = '';
    cards.forEach(card => {
      const isSelected = currentTeam.some(c => c.id === card.id);
      const div = document.createElement('div');
      div.className = 'team-available-card' + (isSelected ? ' selected' : '');
      div.innerHTML = `<img src="${card.images.small}" alt="${card.name}" loading="lazy">`;
      if (!isSelected) {
        div.addEventListener('click', () => {
          if (currentTeam.length < modeConfig.partySize) {
            currentTeam.push(card);
            showTeamSelectScreen();
          }
        });
      }
      availContainer.appendChild(div);
    });

    // Confirm button
    const confirmBtn = document.getElementById('btn-team-confirm');
    confirmBtn.disabled = currentTeam.length < modeConfig.partySize;
    confirmBtn.textContent = currentTeam.length < modeConfig.partySize
      ? `SELECT ${modeConfig.partySize - currentTeam.length} MORE`
      : 'CONFIRM TEAM ▶';
  }

  function confirmTeam() {
    if (teamSelectPlayer === 1) {
      teamSelectPlayer = 2;
      showTeamSelectScreen();
    } else {
      // Both teams selected — do coin flip
      doCoinFlip();
    }
  }

  // ─── Coin Flip ───
  function doCoinFlip() {
    showScreen('coin-flip');
    const coin = document.getElementById('coin');
    const result = document.getElementById('coin-result');

    const isHeads = Math.random() < 0.5;
    coin.className = 'coin';
    result.textContent = '';

    setTimeout(() => {
      coin.className = 'coin ' + (isHeads ? 'flipping' : 'flipping-tails');
    }, 300);

    setTimeout(() => {
      const firstPlayer = isHeads ? 1 : 2;
      result.textContent = `Player ${firstPlayer} goes first!`;

      setTimeout(() => {
        startBattle(firstPlayer);
      }, 1500);
    }, 2000);
  }

  // ═══════════════════════════════════════
  //  BATTLE UI
  // ═══════════════════════════════════════

  let battleTextQueue = [];
  let isTextPlaying = false;
  let afterTextCallback = null;

  function bindBattleUI() {
    on('btn-fight', 'click', () => showMoveMenu());
    on('btn-pokemon', 'click', () => showSwitchMenu());
    on('btn-run', 'click', () => forfeitBattle());
    on('btn-bag', 'click', () => toast('No items in card battles!', 'info'));
    on('move-cancel', 'click', () => showActionMenu());
    on('switch-back', 'click', () => showActionMenu());

    on('btn-rematch', 'click', () => startBattle());
    on('btn-back-title', 'click', () => showScreen('title-screen'));

    // Click text box to advance text
    const textbox = document.getElementById('battle-textbox');
    if (textbox) {
      textbox.addEventListener('click', () => advanceText());
    }
  }

  function startBattle(firstPlayer) {
    const battle = BattleEngine.initBattle(p1Team, p2Team, selectedMode);
    if (firstPlayer) battle.turn = firstPlayer;

    showScreen('battle-arena');
    hideAllBattleMenus();

    renderBattleField();
    renderPrizes();

    // Opening text
    const p1Active = BattleEngine.getActive(1);
    const p2Active = BattleEngine.getActive(2);

    queueText([
      `A wild battle begins!`,
      `Player 1 sent out ${p1Active.name}!`,
      `Player 2 sent out ${p2Active.name}!`,
    ], () => {
      showTurnIndicator();
      BattleEngine.startTurn();
      renderBattleField();
      showActionMenu();
    });
  }

  function renderBattleField() {
    const state = BattleEngine.getState();
    if (!state) return;

    const playerNum = state.turn;
    const oppNum = playerNum === 1 ? 2 : 1;
    const playerPoke = BattleEngine.getActive(playerNum);
    const oppPoke = BattleEngine.getActive(oppNum);

    // Player side
    if (playerPoke) {
      document.getElementById('player-name').textContent = playerPoke.name;
      document.getElementById('player-sprite-img').src = playerPoke.images.large || playerPoke.images.small;
      updateHPDisplay('player', playerPoke);
      renderEnergy(playerPoke);
      renderStatus('player', playerPoke);
      renderBadge('player', playerPoke);
    }

    // Opponent side
    if (oppPoke) {
      document.getElementById('opp-name').textContent = oppPoke.name;
      document.getElementById('opp-sprite-img').src = oppPoke.images.large || oppPoke.images.small;
      updateHPDisplay('opp', oppPoke);
      renderStatus('opp', oppPoke);
      renderBadge('opp', oppPoke);
    }
  }

  function updateHPDisplay(prefix, pokemon) {
    const bar = document.getElementById(`${prefix}-hp-bar`);
    const text = document.getElementById(`${prefix}-hp-text`);
    const pct = Math.max(0, (pokemon.currentHp / pokemon.maxHp) * 100);

    bar.style.width = pct + '%';
    bar.className = 'hp-bar-fill';
    if (pct <= 25) bar.classList.add('red');
    else if (pct <= 50) bar.classList.add('yellow');

    text.textContent = `${Math.max(0, pokemon.currentHp)}/${pokemon.maxHp}`;
  }

  function renderEnergy(pokemon) {
    const container = document.getElementById('player-energy');
    if (!container) return;
    container.innerHTML = '';
    pokemon.energy.forEach(type => {
      const pip = document.createElement('span');
      pip.className = 'energy-pip';
      pip.style.background = PokemonAPI.getTypeColor(type);
      pip.title = type;
      container.appendChild(pip);
    });
  }

  function renderStatus(prefix, pokemon) {
    const container = document.getElementById(`${prefix}-status`);
    if (!container) return;
    container.innerHTML = '';
    const conditions = BattleEngine.getConditionsList(pokemon);
    conditions.forEach(c => {
      const span = document.createElement('span');
      span.className = `status-icon ${c.cls}`;
      span.textContent = c.code;
      container.appendChild(span);
    });
  }

  function renderBadge(prefix, pokemon) {
    const badge = document.getElementById(`${prefix}-badge`);
    if (!badge) return;
    const label = Collection.getBadgeLabel(pokemon.cardType);
    const cls = Collection.getBadgeClass(pokemon.cardType);
    if (label) {
      badge.textContent = label;
      badge.className = `poke-badge ${cls}`;
      badge.style.display = '';
    } else {
      badge.style.display = 'none';
    }
  }

  function renderPrizes() {
    const state = BattleEngine.getState();
    if (!state) return;

    for (const p of [1, 2]) {
      const container = document.getElementById(`prize-cards-p${p}`);
      if (!container) continue;
      container.innerHTML = '';
      const total = state.modeConfig.prizes;
      const remaining = state.players[p].prizesRemaining;
      for (let i = 0; i < total; i++) {
        const pip = document.createElement('div');
        pip.className = 'prize-card-pip' + (i >= remaining ? ' taken' : '');
        container.appendChild(pip);
      }
    }
  }

  // ─── Menus ───
  function hideAllBattleMenus() {
    ['battle-menu', 'move-menu', 'switch-menu', 'battle-textbox'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });
  }

  function showTextbox(text) {
    hideAllBattleMenus();
    const tb = document.getElementById('battle-textbox');
    const textEl = document.getElementById('battle-text');
    tb.style.display = '';
    textEl.textContent = text;
  }

  function showActionMenu() {
    hideAllBattleMenus();
    const state = BattleEngine.getState();
    const active = BattleEngine.getActive(state.turn);
    const menu = document.getElementById('battle-menu');
    const prompt = document.getElementById('menu-prompt');

    prompt.textContent = `What will ${active.name} do?`;
    menu.style.display = 'flex';
  }

  function showMoveMenu() {
    hideAllBattleMenus();
    const state = BattleEngine.getState();
    const active = BattleEngine.getActive(state.turn);
    const moveMenu = document.getElementById('move-menu');
    const moveList = document.getElementById('move-list');

    moveList.innerHTML = '';

    active.attacks.forEach((attack, index) => {
      const btn = document.createElement('button');
      const canUse = BattleEngine.hasEnoughEnergy(active, attack);
      btn.className = 'move-btn' + (canUse ? '' : ' disabled');

      const costDots = attack.cost.map(type =>
        `<span class="move-energy-icon" style="background:${PokemonAPI.getTypeColor(type)}"></span>`
      ).join('');

      const gxLabel = attack.isGX ? ' [GX]' : (attack.isVSTAR ? ' [★]' : '');

      btn.innerHTML = `
        ${costDots}
        <span>${attack.name}${gxLabel}</span>
        <span class="move-dmg">${attack.damageRaw || '—'}</span>
      `;

      btn.addEventListener('click', () => {
        if (!canUse) {
          toast('Not enough energy!', 'error');
          return;
        }
        executePlayerAttack(index);
      });

      // Show move info on hover
      btn.addEventListener('mouseenter', () => {
        document.getElementById('move-type-display').textContent =
          `TYPE/ ${PokemonAPI.getTypeEmoji(active.primaryType)} ${active.primaryType}`;
        document.getElementById('move-pp').textContent = attack.text || 'No additional effect.';
      });

      moveList.appendChild(btn);
    });

    if (active.attacks.length === 0) {
      moveList.innerHTML = '<p style="font-size:9px;color:#888;padding:10px">No attacks available!</p>';
    }

    moveMenu.style.display = 'flex';
  }

  function showSwitchMenu() {
    const state = BattleEngine.getState();
    const playerNum = state.turn;
    const team = state.players[playerNum].team;
    const activeIdx = state.players[playerNum].activeIndex;

    const switchMenu = document.getElementById('switch-menu');
    const switchList = document.getElementById('switch-list');
    switchList.innerHTML = '';

    team.forEach((poke, i) => {
      const div = document.createElement('div');
      const isActive = i === activeIdx;
      div.className = 'switch-card' + (isActive ? ' active-pokemon' : '') + (poke.fainted ? ' fainted' : '');

      div.innerHTML = `
        <img src="${poke.images.small}" alt="${poke.name}">
        <div class="switch-card-info">
          <div class="sw-name">${poke.name} ${isActive ? '(Active)' : ''}</div>
          <div class="sw-hp" style="color:${poke.fainted ? 'var(--hp-red)' : 'var(--hp-green)'}">
            HP: ${poke.currentHp}/${poke.maxHp} ${poke.fainted ? '(Fainted)' : ''}
          </div>
          <div style="font-size:7px;color:#888">Energy: ${poke.totalEnergy} | Retreat: ${poke.convertedRetreatCost}</div>
        </div>
      `;

      if (!isActive && !poke.fainted) {
        div.addEventListener('click', () => {
          const benchIdx = getBenchIndex(playerNum, i);
          if (state.phase === 'switch-forced') {
            BattleEngine.forcedSwitch(playerNum, benchIdx);
            switchMenu.style.display = 'none';
            renderBattleField();
            const newActive = BattleEngine.getActive(playerNum);
            queueText([`Go! ${newActive.name}!`], () => {
              animateSprite('player', 'slide-in-left');
              BattleEngine.startTurn();
              renderBattleField();
              showActionMenu();
            });
          } else {
            if (!BattleEngine.canRetreat(playerNum)) {
              toast('Not enough energy to retreat!', 'error');
              return;
            }
            BattleEngine.retreat(playerNum, benchIdx);
            switchMenu.style.display = 'none';
            renderBattleField();
            const newActive = BattleEngine.getActive(playerNum);
            queueText([`Come back! Go! ${newActive.name}!`], () => {
              animateSprite('player', 'slide-in-left');
              endCurrentTurn();
            });
          }
        });
      }

      switchList.appendChild(div);
    });

    switchMenu.style.display = 'flex';
  }

  function getBenchIndex(player, teamIndex) {
    const state = BattleEngine.getState();
    const activeIdx = state.players[player].activeIndex;
    let benchIdx = 0;
    for (let i = 0; i < state.players[player].team.length; i++) {
      if (i === activeIdx) continue;
      if (state.players[player].team[i].fainted) continue;
      if (i === teamIndex) return benchIdx;
      benchIdx++;
    }
    return 0;
  }

  // ─── Attack Execution ───
  function executePlayerAttack(moveIndex) {
    hideAllBattleMenus();

    const result = BattleEngine.executeAttack(moveIndex);
    if (!result) return;

    if (result.type === 'no-energy' || result.type === 'gx-used' || result.type === 'vstar-used') {
      queueText(result.messages, () => showActionMenu());
      return;
    }

    if (result.type === 'paralyzed' || result.type === 'asleep') {
      queueText(result.messages, () => endCurrentTurn());
      return;
    }

    if (result.type === 'confused-self-hit') {
      animateSprite('player', 'hit-shake');
      renderBattleField();
      queueText(result.messages, () => endCurrentTurn());
      return;
    }

    // Normal attack
    // Show attack name
    const nameDisplay = document.getElementById('attack-name-display');
    nameDisplay.textContent = result.attack.name;
    nameDisplay.classList.remove('show');
    void nameDisplay.offsetWidth;
    nameDisplay.classList.add('show');

    // Attack animation
    const overlay = document.getElementById('attack-overlay');
    overlay.style.display = '';

    setTimeout(() => {
      // Lunge
      animateSprite('player', 'attack-lunge-right');
    }, 200);

    setTimeout(() => {
      // Flash
      const flash = document.getElementById('attack-flash');
      flash.className = 'attack-flash ' + (result.effective === 'super' ? 'super-flash' : 'flash');

      // Hit shake
      animateSprite('opp', 'hit-shake');
    }, 500);

    setTimeout(() => {
      overlay.style.display = 'none';
      renderBattleField();

      // Build message queue
      const messages = [...result.messages];

      // Effects
      result.effects.forEach(eff => {
        if (eff.type === 'poison') messages.push(`${result.defender} was poisoned!`);
        if (eff.type === 'burn') messages.push(`${result.defender} was burned!`);
        if (eff.type === 'asleep') messages.push(`${result.defender} fell asleep!`);
        if (eff.type === 'paralyzed') messages.push(`${result.defender} is paralyzed!`);
        if (eff.type === 'confused') messages.push(`${result.defender} became confused!`);
      });

      queueText(messages, () => {
        if (result.ko) {
          animateSprite('opp', 'faint');
          setTimeout(() => {
            renderBattleField();
            renderPrizes();

            // Check win
            const winner = BattleEngine.checkWinCondition();
            if (winner) {
              showVictoryScreen(winner);
              return;
            }

            // Opponent needs to send out new Pokémon
            const oppNum = BattleEngine.getOpponentPlayer();
            const alive = BattleEngine.getAlivePokemon(oppNum);
            if (alive.length > 0) {
              const state = BattleEngine.getState();
              state.phase = 'switch-forced';
              // Auto-switch for now (switch to first alive)
              const team = state.players[oppNum].team;
              for (let i = 0; i < team.length; i++) {
                if (!team[i].fainted && i !== state.players[oppNum].activeIndex) {
                  state.players[oppNum].activeIndex = i;
                  break;
                }
              }
              const newPoke = BattleEngine.getActive(oppNum);
              queueText([`Player ${oppNum} sent out ${newPoke.name}!`], () => {
                renderBattleField();
                animateSprite('opp', 'slide-in-right');
                endCurrentTurn();
              });
            }
          }, 1000);
        } else {
          endCurrentTurn();
        }
      });
    }, 900);
  }

  function endCurrentTurn() {
    const result = BattleEngine.endTurn();

    if (result.checkupResults && result.checkupResults.length > 0) {
      const messages = result.checkupResults.map(r => r.message);

      // Animate condition effects
      result.checkupResults.forEach(r => {
        if (r.type === 'poison') {
          const prefix = r.player === BattleEngine.getCurrentPlayer() ? 'opp' : 'player';
          animateSprite(prefix, 'poison-pulse');
        }
        if (r.type === 'burn') {
          const prefix = r.player === BattleEngine.getCurrentPlayer() ? 'opp' : 'player';
          animateSprite(prefix, 'burn-flash');
        }
      });

      queueText(messages, () => {
        renderBattleField();

        if (result.winner) {
          showVictoryScreen(result.winner);
          return;
        }

        if (result.forcedSwitch) {
          const state = BattleEngine.getState();
          state.phase = 'switch-forced';
          showSwitchMenu();
          return;
        }

        nextTurn();
      });
    } else {
      if (result.winner) {
        showVictoryScreen(result.winner);
        return;
      }
      nextTurn();
    }
  }

  function nextTurn() {
    // Swap perspective
    showTurnIndicator();

    setTimeout(() => {
      BattleEngine.startTurn();
      renderBattleField();
      renderPrizes();
      showActionMenu();
    }, 1500);
  }

  // ─── Animations ───
  function animateSprite(prefix, animClass) {
    const sprite = document.getElementById(`${prefix}-sprite`);
    if (!sprite) return;
    sprite.classList.remove(animClass);
    void sprite.offsetWidth;
    sprite.classList.add(animClass);
    setTimeout(() => sprite.classList.remove(animClass), 1000);
  }

  function showTurnIndicator() {
    const state = BattleEngine.getState();
    const indicator = document.getElementById('turn-indicator');
    const text = document.getElementById('turn-text');
    text.textContent = `PLAYER ${state.turn}'s TURN`;
    indicator.style.display = '';
    text.classList.remove('turn-text');
    void text.offsetWidth;
    // Re-trigger animation
    text.style.animation = 'none';
    void text.offsetWidth;
    text.style.animation = '';

    setTimeout(() => {
      indicator.style.display = 'none';
    }, 1500);
  }

  // ─── Text Queue System ───
  function queueText(messages, callback) {
    battleTextQueue = [...messages];
    afterTextCallback = callback;
    advanceText();
  }

  function advanceText() {
    if (battleTextQueue.length > 0) {
      const msg = battleTextQueue.shift();
      showTextbox(msg);
    } else if (afterTextCallback) {
      const cb = afterTextCallback;
      afterTextCallback = null;
      cb();
    }
  }

  // ─── Forfeit ───
  function forfeitBattle() {
    const state = BattleEngine.getState();
    const winner = state.turn === 1 ? 2 : 1;
    queueText([`Player ${state.turn} forfeited!`], () => {
      showVictoryScreen(winner);
    });
  }

  // ─── Victory ───
  function showVictoryScreen(winner) {
    const state = BattleEngine.getState();
    showScreen('victory-screen');

    document.getElementById('victory-title').textContent = `🏆 PLAYER ${winner} WINS! 🏆`;

    const stats = document.getElementById('victory-stats');
    stats.innerHTML = `
      <strong>Battle Stats</strong><br><br>
      <strong>Player 1:</strong><br>
      KOs: ${state.stats[1].kos} | Damage: ${state.stats[1].damageDealt}<br><br>
      <strong>Player 2:</strong><br>
      KOs: ${state.stats[2].kos} | Damage: ${state.stats[2].damageDealt}<br><br>
      Turns: ${state.turnCount} | Mode: ${state.modeConfig.name}
    `;
  }

  // ─── Utility ───
  function on(id, event, handler) {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, handler);
  }

  function toast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.textContent = message;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
  }

  function showLoading(text) {
    const overlay = document.getElementById('loading-overlay');
    document.getElementById('loading-text').textContent = text || 'Loading...';
    overlay.style.display = 'flex';
  }

  function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
  }

  // ─── Start ───
  document.addEventListener('DOMContentLoaded', init);

  return { showScreen, toast };
})();
