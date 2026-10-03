// ═══════════════════════════════════════════════
//  Card Scanner (Webcam + Photo Upload + Smart OCR)
// ═══════════════════════════════════════════════

const Scanner = (() => {
  let stream = null;
  let tesseractLoaded = false;
  let currentFacingMode = 'user'; // 'user' for laptop webcam, 'environment' for rear

  /**
   * Start webcam with resilient fallback
   */
  async function startWebcam(videoElement) {
    stopWebcam();

    const constraintOptions = [
      { video: { facingMode: { ideal: currentFacingMode }, width: { ideal: 1280 }, height: { ideal: 720 } } },
      { video: { facingMode: currentFacingMode } },
      { video: { facingMode: currentFacingMode === 'user' ? 'environment' : 'user' } },
      { video: true }
    ];

    let lastError = null;
    for (const constraints of constraintOptions) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement.srcObject = stream;
        videoElement.setAttribute('playsinline', '');
        videoElement.setAttribute('muted', '');
        videoElement.muted = true;
        await videoElement.play().catch(e => console.warn('Play error:', e));
        return true;
      } catch (err) {
        lastError = err;
        console.warn('Webcam constraint attempt failed:', constraints, err.name);
      }
    }

    console.error('All camera attempts failed:', lastError);
    return false;
  }

  /**
   * Toggle camera (front / back)
   */
  async function flipCamera(videoElement) {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    return await startWebcam(videoElement);
  }

  /**
   * Stop webcam cleanly
   */
  function stopWebcam() {
    if (stream) {
      stream.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      stream = null;
    }
  }

  /**
   * Capture frame with optional crop to card frame and contrast boost
   */
  function captureFrame(videoElement, canvasElement, cropToCenter = true) {
    const vWidth = videoElement.videoWidth || 640;
    const vHeight = videoElement.videoHeight || 480;

    let sx = 0, sy = 0, sw = vWidth, sh = vHeight;

    if (cropToCenter) {
      // Center card crop (roughly 60% width and 75% height)
      sw = Math.floor(vWidth * 0.65);
      sh = Math.floor(vHeight * 0.75);
      sx = Math.floor((vWidth - sw) / 2);
      sy = Math.floor((vHeight - sh) / 2);
    }

    canvasElement.width = sw;
    canvasElement.height = sh;
    const ctx = canvasElement.getContext('2d');

    ctx.drawImage(videoElement, sx, sy, sw, sh, 0, 0, sw, sh);
    return canvasElement.toDataURL('image/jpeg', 0.88);
  }

  /**
   * Pre-process image on canvas for better OCR readability
   */
  function preprocessForOCR(canvasElement) {
    const ctx = canvasElement.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvasElement.width, canvasElement.height);
    const d = imgData.data;

    // Grayscale + High contrast
    const contrast = 1.35;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

    for (let i = 0; i < d.length; i += 4) {
      // luminance
      const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const adj = Math.min(255, Math.max(0, factor * (gray - 128) + 128));
      d[i] = adj;
      d[i + 1] = adj;
      d[i + 2] = adj;
    }
    ctx.putImageData(imgData, 0, 0);
  }

  /**
   * Load Tesseract with timeout
   */
  async function loadTesseract() {
    if (tesseractLoaded || window.Tesseract) {
      tesseractLoaded = true;
      return true;
    }

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      const timeout = setTimeout(() => {
        console.warn('Tesseract load timed out');
        resolve(false);
      }, 5000);

      script.onload = () => {
        clearTimeout(timeout);
        tesseractLoaded = true;
        resolve(true);
      };
      script.onerror = () => {
        clearTimeout(timeout);
        console.warn('Tesseract load error');
        resolve(false);
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Perform OCR with maximum 5s safety timeout
   */
  async function performOCR(imageData) {
    const loaded = await loadTesseract();
    if (!loaded || !window.Tesseract) {
      console.warn('Tesseract not available, skipping OCR');
      return '';
    }

    try {
      const ocrPromise = (async () => {
        const worker = await Tesseract.createWorker('eng');
        const { data } = await worker.recognize(imageData);
        await worker.terminate();
        return data.text || '';
      })();

      // 5 second timeout race
      const timeoutPromise = new Promise(resolve => setTimeout(() => resolve(''), 5000));
      return await Promise.race([ocrPromise, timeoutPromise]);
    } catch (e) {
      console.warn('OCR error:', e);
      return '';
    }
  }

  /**
   * Fuzzy match string against known Pokémon
   */
  function fuzzyMatchName(rawText) {
    const names = typeof COMMON_POKEMON_NAMES !== 'undefined' ? COMMON_POKEMON_NAMES : [
      "Charizard", "Pikachu", "Mewtwo", "Rayquaza", "Lucario", "Gengar", "Lugia",
      "Giratina", "Arceus", "Blastoise", "Venusaur", "Greninja", "Miraidon", "Koraidon", "Eevee"
    ];

    const clean = rawText.toLowerCase().replace(/[^a-z]/g, '');
    if (!clean) return '';

    // Direct substring match
    for (const name of names) {
      if (clean.includes(name.toLowerCase()) || name.toLowerCase().includes(clean)) {
        return name;
      }
    }

    // Levenshtein similarity
    let bestMatch = '';
    let minDistance = 999;

    for (const name of names) {
      const nLower = name.toLowerCase();
      const dist = levenshtein(clean.substring(0, nLower.length + 2), nLower);
      if (dist <= 2 && dist < minDistance) {
        minDistance = dist;
        bestMatch = name;
      }
    }

    return bestMatch;
  }

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

  /**
   * Parse OCR text for name & collector number
   */
  function parseCardText(text) {
    if (!text) return { cardName: '', cardNumber: '' };

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    let cardName = '';
    let cardNumber = '';

    // 1. Look for known pokemon names in the text
    for (const line of lines) {
      const matched = fuzzyMatchName(line);
      if (matched) {
        cardName = matched;
        break;
      }
    }

    // 2. If no fuzzy match, look for any uppercase word
    if (!cardName) {
      for (const line of lines) {
        if (line.length < 3 || /^\d+$/.test(line) || /HP$/i.test(line)) continue;
        if (/^(stage|basic|evolves|weakness|resistance|retreat)/i.test(line)) continue;
        const cleaned = line.replace(/[^A-Za-zéÉè\s\-'\.]/g, '').trim();
        if (cleaned.length >= 3) {
          cardName = cleaned;
          break;
        }
      }
    }

    // 3. Look for collector number (e.g., 125/197, 025/165, 4/102)
    const fullText = lines.join(' ');
    const slashPattern = fullText.match(/(\d{1,3})\s*[\/\\]\s*(\d{1,3})/);
    if (slashPattern) {
      cardNumber = `${slashPattern[1]}/${slashPattern[2]}`;
    }

    if (!cardNumber) {
      const promoPattern = fullText.match(/([A-Z]{2,}\s*[\-]?\s*\d{1,3})/);
      if (promoPattern) {
        cardNumber = promoPattern[1].replace(/\s/g, '');
      }
    }

    return { cardName, cardNumber };
  }

  /**
   * Full scan flow for webcam
   */
  async function scanCard(videoElement, canvasElement, onProgress) {
    onProgress && onProgress('📸 Capturing card image...');
    const rawImage = captureFrame(videoElement, canvasElement, true);

    // Try server recognition first (high accuracy, 1025 Pokemon DB + optional AI)
    try {
      onProgress && onProgress('⚡ Analyzing card with Smart Engine...');
      const resp = await fetch('/api/recognize-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: rawImage, autoSend: false })
      });
      if (resp.ok) {
        const data = await resp.json();
        const cards = data.candidates || (data.exactMatch ? [data.exactMatch] : []);
        if (data.success && cards.length > 0) {
          return {
            success: true,
            cards: cards,
            scannedName: data.scannedInfo?.name || '',
            scannedNumber: data.scannedInfo?.cardNumber || '',
            ocrText: '',
            imageData: rawImage
          };
        }
      }
    } catch (e) {
      console.warn('Server recognition error, using local fallback:', e);
    }

    // Apply pre-processing on a separate canvas for local client OCR fallback
    const ocrCanvas = document.createElement('canvas');
    ocrCanvas.width = canvasElement.width;
    ocrCanvas.height = canvasElement.height;
    const ocrCtx = ocrCanvas.getContext('2d');
    ocrCtx.drawImage(canvasElement, 0, 0);
    preprocessForOCR(ocrCanvas);
    const processedImage = ocrCanvas.toDataURL('image/jpeg', 0.9);

    onProgress && onProgress('🔍 Reading card text...');
    const ocrText = await performOCR(processedImage);

    onProgress && onProgress('⚡ Identifying Pokémon...');
    const parsed = parseCardText(ocrText);

    let searchName = parsed.cardName;
    let searchNumber = parsed.cardNumber;

    // Search cards
    let results = { data: [] };
    if (searchName && searchNumber) {
      onProgress && onProgress(`Searching for ${searchName} #${searchNumber}...`);
      results = await PokemonAPI.searchExactCard(searchName, searchNumber);
    }
    if ((!results.data || results.data.length === 0) && searchName) {
      onProgress && onProgress(`Searching for ${searchName}...`);
      results = await PokemonAPI.searchByName(searchName);
    }
    if ((!results.data || results.data.length === 0) && searchName) {
      results = await PokemonAPI.searchByNameWildcard(searchName);
    }

    if (results.data && results.data.length > 0) {
      return {
        success: true,
        cards: results.data,
        scannedName: searchName,
        scannedNumber: searchNumber,
        ocrText,
        imageData: rawImage
      };
    }

    return {
      success: false,
      error: searchName ? `Found "${searchName}" but couldn't load card. Try quick finder below!` : 'Could not read card name clearly. Try quick finder below!',
      scannedName: searchName,
      scannedNumber: searchNumber,
      ocrText,
      imageData: rawImage
    };
  }

  /**
   * Scan card from an uploaded file
   */
  async function scanImageFile(file, canvasElement, onProgress) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const img = new Image();
        img.onload = async () => {
          canvasElement.width = img.width;
          canvasElement.height = img.height;
          const ctx = canvasElement.getContext('2d');
          ctx.drawImage(img, 0, 0);
          const rawImage = canvasElement.toDataURL('image/jpeg', 0.9);

          // Try server recognition first
          try {
            onProgress && onProgress('⚡ Analyzing photo with Smart Engine...');
            const resp = await fetch('/api/recognize-card', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ image: rawImage, autoSend: false })
            });
            if (resp.ok) {
              const data = await resp.json();
              const cards = data.candidates || (data.exactMatch ? [data.exactMatch] : []);
              if (data.success && cards.length > 0) {
                resolve({
                  success: true,
                  cards: cards,
                  scannedName: data.scannedInfo?.name || '',
                  scannedNumber: data.scannedInfo?.cardNumber || '',
                  ocrText: '',
                  imageData: rawImage
                });
                return;
              }
            }
          } catch (err) {
            console.warn('Server recognition error, using local fallback:', err);
          }

          onProgress && onProgress('🔍 Reading uploaded photo...');
          const ocrText = await performOCR(rawImage);
          const parsed = parseCardText(ocrText);

          let searchName = parsed.cardName;
          let searchNumber = parsed.cardNumber;

          let results = { data: [] };
          if (searchName && searchNumber) {
            results = await PokemonAPI.searchExactCard(searchName, searchNumber);
          }
          if ((!results.data || results.data.length === 0) && searchName) {
            results = await PokemonAPI.searchByName(searchName);
          }
          if ((!results.data || results.data.length === 0) && searchName) {
            results = await PokemonAPI.searchByNameWildcard(searchName);
          }

          if (results.data && results.data.length > 0) {
            resolve({
              success: true,
              cards: results.data,
              scannedName: searchName,
              scannedNumber: searchNumber,
              ocrText,
              imageData: rawImage
            });
          } else {
            resolve({
              success: false,
              error: searchName ? `Identified "${searchName}". Select your version below!` : 'Photo analyzed. Select your card below!',
              scannedName: searchName,
              scannedNumber: searchNumber,
              ocrText,
              imageData: rawImage
            });
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * Manual search
   */
  async function manualSearch(name, number) {
    if (!name) return { success: false, error: 'Please enter a name', cards: [] };

    let results = { data: [] };
    if (number) {
      results = await PokemonAPI.searchExactCard(name, number);
    }
    if (!results.data || results.data.length === 0) {
      results = await PokemonAPI.searchByName(name);
    }
    if (!results.data || results.data.length === 0) {
      results = await PokemonAPI.searchByNameWildcard(name);
    }

    if (results.data && results.data.length > 0) {
      return { success: true, cards: results.data };
    }
    return { success: false, error: `No cards found for "${name}"`, cards: [] };
  }

  return {
    startWebcam,
    stopWebcam,
    flipCamera,
    captureFrame,
    scanCard,
    scanImageFile,
    manualSearch,
    parseCardText
  };
})();
