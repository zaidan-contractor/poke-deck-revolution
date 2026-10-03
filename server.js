const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const os = require('os');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

// Auto-load .env file if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=');
      if (k && v.length) process.env[k.trim()] = v.join('=').trim();
    }
  });
  console.log('🔑 Loaded environment from .env');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
  maxHttpBufferSize: 1e8 // 100 MB buffer for photos
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Get all non-internal IPv4 addresses
function getAllIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

function getLocalIP() {
  const ips = getAllIPs();
  // Prefer Wi-Fi if available
  const wifi = ips.find(i => /wi-?fi/i.test(i.name));
  if (wifi) return wifi.address;
  if (ips.length > 0) return ips[0].address;
  return 'localhost';
}

const PORT = 3000;
const localIP = getLocalIP();

// Track active scan sessions
const scanSessions = new Map();

io.on('connection', (socket) => {
  console.log(`⚡ Connected: ${socket.id}`);

  // Laptop creates a scan session
  socket.on('create-scan-session', (sessionId) => {
    socket.join(sessionId);
    scanSessions.set(sessionId, { laptop: socket.id, phone: null });
    console.log(`📺 Laptop session created: ${sessionId}`);
  });

  // Phone joins an existing scan session
  socket.on('join-scan-session', (sessionId) => {
    socket.join(sessionId);
    const session = scanSessions.get(sessionId) || {};
    session.phone = socket.id;
    scanSessions.set(sessionId, session);
    // Notify laptop that phone is connected
    io.to(sessionId).emit('phone-connected');
    console.log(`📱 Phone joined session: ${sessionId}`);
  });

  // Phone sends scanned card data to laptop via socket
  socket.on('card-scanned-from-phone', (data) => {
    const name = data.cardName || 'Unknown';
    const hasFullData = !!(data.cardData && data.cardData.id);
    console.log(`📸 [Socket] Card scanned: ${name} (id: ${data.cardId || 'none'}) fullData: ${hasFullData} → session ${data.sessionId}`);
    const payload = {
      cardName: data.cardName || '',
      cardId: data.cardId || '',
      cardNumber: data.cardNumber || '',
      cardData: data.cardData || null
    };
    if (data.sessionId) {
      io.to(data.sessionId).emit('card-received-from-phone', payload);
    }
    // Also broadcast to ensure laptop receives even if room was re-established
    socket.broadcast.emit('card-received-from-phone', payload);
  });

  // Phone sends OCR text to laptop for processing
  socket.on('ocr-text-from-phone', (data) => {
    io.to(data.sessionId).emit('ocr-text-received', {
      text: data.text,
      imageData: data.imageData
    });
  });

  socket.on('disconnect', () => {
    console.log(`💨 Disconnected: ${socket.id}`);
  });
});

const cardRecognizer = require('./card-recognizer.js');

// HTTP POST endpoint for phone card submission (100% reliable even if WebSocket drops on mobile!)
app.post('/api/phone-scan', (req, res) => {
  const { sessionId, cardName, cardId, cardNumber, cardData } = req.body || {};
  const hasFullData = !!(cardData && cardData.id);
  console.log(`📥 [HTTP POST] Card: "${cardName}" (id: ${cardId || 'none'}) fullData: ${hasFullData} → session ${sessionId}`);

  const payload = {
    cardName: cardName || '',
    cardId: cardId || '',
    cardNumber: cardNumber || '',
    cardData: cardData || null
  };

  if (sessionId) {
    io.to(sessionId).emit('card-received-from-phone', payload);
  }
  // Broadcast to all as a guarantee
  io.emit('card-received-from-phone', payload);

  res.json({ success: true, message: 'Card delivered to laptop' });
});

// Smart Card Recognition Engine (Gemini AI Vision + Smart OCR + 1025 Pokemon Matcher)
app.post('/api/recognize-card', async (req, res) => {
  try {
    const { image, headerImage, footerImage, sessionId, apiKey, autoSend = true } = req.body || {};
    if (!image && !headerImage) {
      return res.status(400).json({ success: false, error: 'No image provided' });
    }

    console.log(`📸 [Recognition Request] Analyzing card image (session: ${sessionId || 'none'})`);
    const result = await cardRecognizer.recognizeCardImage(image, apiKey, headerImage, footerImage);

    // If autoSend is enabled and we found a match, immediately push to laptop!
    if (result.success && result.exactMatch && autoSend) {
      const payload = {
        sessionId: sessionId || '',
        cardName: result.exactMatch.name,
        cardId: result.exactMatch.id,
        cardNumber: result.exactMatch.number || '',
        cardData: result.exactMatch,
        autoRecognized: true,
        method: result.scannedInfo?.method || 'auto'
      };

      console.log(`🚀 [Auto-Push to Laptop] Delivering "${result.exactMatch.name}" directly to laptop screen!`);
      if (sessionId) {
        io.to(sessionId).emit('card-received-from-phone', payload);
      }
      io.emit('card-received-from-phone', payload);
      result.autoSent = true;
    } else {
      result.autoSent = false;
    }

    res.json(result);
  } catch (err) {
    console.error('Recognition API error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// API endpoint for server info + pre-generated QR code
app.get('/api/server-info', async (req, res) => {
  const sessionId = req.query.session || '';
  const chosenIp = req.query.ip || localIP;
  const scanUrl = `http://${chosenIp}:${PORT}/scan.html${sessionId ? '?session=' + sessionId : ''}`;
  const allIPs = getAllIPs();

  try {
    const qrDataUrl = await QRCode.toDataURL(scanUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });
    res.json({
      ip: chosenIp,
      port: PORT,
      allIPs: allIPs.map(i => i.address),
      scanUrl,
      qrDataUrl
    });
  } catch (err) {
    console.error('QR code generation error:', err);
    res.json({
      ip: chosenIp,
      port: PORT,
      allIPs: allIPs.map(i => i.address),
      scanUrl,
      qrDataUrl: null
    });
  }
});

// API endpoint to directly stream a QR code image
app.get('/api/qr', async (req, res) => {
  const text = req.query.text || `http://${localIP}:${PORT}/scan.html`;
  try {
    const imgBuffer = await QRCode.toBuffer(text, {
      width: 280,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });
    res.type('png').send(imgBuffer);
  } catch (err) {
    res.status(500).send('Error generating QR code');
  }
});

// Server proxy for Pokemon TCG search with graceful error handling
app.get('/api/pokemon/search', async (req, res) => {
  const q = req.query.q || '';
  const pageSize = req.query.pageSize || '20';
  const page = req.query.page || '1';
  try {
    const apiRes = await globalThis.fetch(`https://api.pokemontcg.io/v2/cards?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}&orderBy=set.releaseDate`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PokemonCardBattle/1.0',
        'Accept-Encoding': 'identity'
      }
    });
    const text = await apiRes.text();
    if (text.startsWith('<')) {
      // Cloudflare HTML error (502 / 503)
      return res.json({ data: [] });
    }
    const data = JSON.parse(text);
    res.json(data);
  } catch (err) {
    res.json({ data: [] });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  ⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡');
  console.log('  ⚡                                     ⚡');
  console.log('  ⚡   POKÉMON CARD BATTLE SIMULATOR      ⚡');
  console.log('  ⚡                                     ⚡');
  console.log('  ⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡⚡');
  console.log('');
  console.log(`  🎮 Game:   http://localhost:${PORT}`);
  console.log(`  📱 Phone:  http://${localIP}:${PORT}/scan.html`);
  console.log('');
  console.log('  Both devices must be on the same WiFi network!');
  console.log('');
});
