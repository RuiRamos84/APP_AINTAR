/**
 * AINTAR WhatsApp Service — whatsapp-web.js
 *
 * Fluxo de autenticação:
 *   1. POST /open   — abre Chrome com web.whatsapp.com (utilizador faz scan do QR)
 *   2. POST /connect — liga em headless usando a sessão guardada
 *
 * Arranque automático:
 *   - Se sessão guardada → reconecta headless sem intervenção
 *   - Se sem sessão → aguarda POST /open
 */

require('dotenv').config();

const express        = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { execFile }   = require('child_process');
const fs             = require('fs');
const path           = require('path');

process.on('uncaughtException',  (err) => console.error('[WA] Erro não capturado:', err.message));
process.on('unhandledRejection', (r)   => console.error('[WA] Promise rejeitada:', r));

const app = express();
app.use(express.json());

const API_KEY      = process.env.WA_API_KEY      || 'aintar-wa-2025';
const PORT         = parseInt(process.env.WA_PORT || '3010', 10);
const SESSION_PATH = process.env.WA_SESSION_PATH  || path.join(__dirname, 'wa_session');

// Pasta onde o Chrome (e o LocalAuth) guarda o perfil
const USER_DATA_DIR = path.join(SESSION_PATH, 'session');

let isReady      = false;
let waClient     = null;
let browserOpen  = false; // Chrome aberto para login manual

function auth(req, res, next) {
  if (req.headers['x-api-key'] !== API_KEY) return res.status(401).json({ error: 'Não autorizado' });
  next();
}

function hasStoredSession() {
  return fs.existsSync(path.join(USER_DATA_DIR, 'Default', 'Local Storage'));
}

function findChrome() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `C:\\Users\\${process.env.USERNAME || ''}\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe`,
  ];
  return candidates.find(p => fs.existsSync(p)) || null;
}

function initClient() {
  if (waClient) return;

  const chromePath = findChrome();
  if (!chromePath) {
    console.error('[WA] Chrome não encontrado — não é possível ligar');
    return;
  }

  console.log(`[WA] A inicializar ligação headless (${chromePath})...`);
  waClient = new Client({
    authStrategy: new LocalAuth({ dataPath: SESSION_PATH }),
    puppeteer: {
      headless: true,
      executablePath: chromePath,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    },
  });

  waClient.on('qr', () => {
    console.warn('[WA] Sessão inválida ou expirada — a limpar sessão e aguardar POST /open');
    const c = waClient;
    waClient = null;
    c.destroy().catch(() => {});
    // Apaga sessão inválida para evitar loop de reconexão
    fs.rm(USER_DATA_DIR, { recursive: true, force: true }, () => {
      console.log('[WA] Sessão inválida apagada — use POST /open para re-autenticar');
    });
  });

  waClient.on('authenticated', () => console.log('[WA] Autenticado'));

  waClient.on('ready', () => {
    console.log('[WA] Ligado e pronto');
    isReady     = true;
    browserOpen = false;
  });

  waClient.on('auth_failure', () => {
    console.error('[WA] Falha de autenticação');
    isReady  = false;
    waClient = null;
  });

  waClient.on('disconnected', (reason) => {
    console.warn('[WA] Desligado:', reason);
    isReady  = false;
    waClient = null;
    // Só tenta reconectar em caso de queda de rede (NAVIGATION, CONNECTION_LOST)
    // Logout remoto (LOGOUT) → sessão inválida, não vale tentar
    if (hasStoredSession() && reason !== 'LOGOUT') {
      console.log('[WA] A tentar reconectar em 10 s...');
      setTimeout(initClient, 10000);
    } else if (reason === 'LOGOUT') {
      console.log('[WA] Logout remoto detectado — a apagar sessão');
      fs.rm(USER_DATA_DIR, { recursive: true, force: true }, () => {
        console.log('[WA] Sessão apagada após logout remoto');
      });
    }
  });

  waClient.initialize().catch((err) => {
    console.error('[WA] Erro ao inicializar:', err.message);
    waClient = null;
  });
}

// --- rotas ---

app.get('/status', auth, (req, res) => {
  let status = 'disconnected';
  if (isReady)         status = 'connected';
  else if (waClient)   status = 'loading';
  else if (browserOpen) status = 'browser_open';
  res.json({ status, connected: isReady });
});

// Abre Chrome directamente com web.whatsapp.com — sem Puppeteer
app.post('/open', auth, (req, res) => {
  if (isReady)  return res.json({ status: 'connected' });
  if (waClient) { waClient.destroy().catch(() => {}); waClient = null; }

  const chromePath = findChrome();
  if (!chromePath) return res.status(500).json({ error: 'Chrome não encontrado no sistema' });

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  console.log(`[WA] A abrir Chrome → web.whatsapp.com (userData: ${USER_DATA_DIR})`);

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });

  browserOpen = true;
  res.json({ status: 'browser_open' });

  // execFile abre Chrome visivelmente e chama o callback quando fechar
  execFile(chromePath, [
    `--user-data-dir=${USER_DATA_DIR}`,
    '--no-first-run',
    '--no-default-browser-check',
    'https://web.whatsapp.com',
  ], { windowsHide: false }, () => {
    console.log('[WA] Chrome fechado — a verificar sessão...');
    browserOpen = false;
    if (hasStoredSession() && !waClient) {
      console.log('[WA] Sessão encontrada — a ligar...');
      setTimeout(initClient, 1500);
    }
  });
});

// Liga em headless usando sessão guardada (após fechar o Chrome do login)
app.post('/connect', auth, (req, res) => {
  if (isReady)  return res.json({ status: 'connected' });
  if (waClient) return res.json({ status: 'loading' });

  if (!hasStoredSession()) {
    return res.status(400).json({ error: 'Sem sessão guardada. Use POST /open primeiro.' });
  }

  browserOpen = false;
  initClient();
  res.json({ status: 'connecting' });
});

app.get('/groups', auth, async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp não está ligado' });
  try {
    const chats  = await waClient.getChats();
    const groups = chats
      .filter(c => c.isGroup)
      .map(c => ({ id: c.id._serialized, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/send-group', auth, async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp não está ligado' });
  const { groupId, message } = req.body || {};
  if (!groupId || !message) return res.status(400).json({ error: 'groupId e message são obrigatórios' });
  try {
    await waClient.sendMessage(groupId, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/send', auth, async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp não está ligado' });
  const { phone, message } = req.body || {};
  if (!phone || !message) return res.status(400).json({ error: 'phone e message são obrigatórios' });
  const chatId = phone.replace(/[^0-9]/g, '') + '@c.us';
  try {
    await waClient.sendMessage(chatId, message);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/join', auth, async (req, res) => {
  if (!isReady) return res.status(503).json({ error: 'WhatsApp não está ligado' });
  const { inviteCode } = req.body || {};
  if (!inviteCode) return res.status(400).json({ error: 'inviteCode obrigatório' });
  const code = inviteCode.replace('https://chat.whatsapp.com/', '').trim();
  try {
    const groupId = await waClient.acceptInvite(code);
    res.json({ success: true, groupId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/disconnect', auth, (req, res) => {
  // Responde imediatamente
  const client = waClient;
  waClient    = null;
  isReady     = false;
  browserOpen = false;
  res.json({ success: true });

  // Limpa em background
  if (client) {
    client.logout().catch(() => {}).finally(() => client.destroy().catch(() => {}));
  }
  // Apaga ficheiros de sessão para forçar novo scan
  fs.rm(USER_DATA_DIR, { recursive: true, force: true }, () => {
    console.log('[WA] Sessão apagada');
  });
});

// --- arranque ---
app.listen(PORT, () => {
  console.log(`[WA] Serviço AINTAR | porta ${PORT} | sessão: ${USER_DATA_DIR}`);
  if (hasStoredSession()) {
    console.log('[WA] Sessão encontrada — a reconectar...');
    initClient();
  } else {
    console.log('[WA] Sem sessão. Aguarda POST /open para login.');
  }
});
