/**
 * AINTAR face-service
 * -------------------
 * Micro-serviço que calcula o descritor facial 128-D de uma fotografia,
 * usando exactamente os mesmos modelos (@vladmandic/face-api: tinyFaceDetector
 * + faceLandmark68Tiny + faceRecognitionNet) que o frontend-v2 usa no browser.
 * Isto garante que os descritores calculados aqui vivem no MESMO espaço
 * vectorial dos templates já registados pela versão web — a comparação no
 * Flask (distância euclidiana, threshold 0.50) continua válida sem migração.
 *
 * Só o backend Flask fala com este serviço (bind em 127.0.0.1 por omissão).
 * Não há autenticação própria: a autenticação/autorização é feita no Flask.
 *
 * API:
 *   GET  /health      → { status, backend, uptime_s }
 *   POST /descriptor  → body JSON { image: <base64 jpeg/png>, minConfidence? }
 *                     → { detected: bool, descriptor: [128 floats] | null, ms }
 */

const http = require('http');
const path = require('path');

const PORT = Number(process.env.FACE_SERVICE_PORT || 5101);
const HOST = process.env.FACE_SERVICE_HOST || '127.0.0.1';
const MODELS_DIR = process.env.FACE_MODELS_DIR || path.join(__dirname, 'models');
const MAX_BODY_BYTES = 15 * 1024 * 1024;

// Mesmos parâmetros de detecção que o frontend-v2 (useFaceApi.js):
// scoreThreshold 0.85 evita enrolar caras desfocadas/mal iluminadas.
// inputSize 416 (múltiplo de 32) — no servidor podemos usar uma resolução de
// detecção maior que os 224 do browser sem custo perceptível.
const DEFAULT_MIN_CONFIDENCE = 0.85;
const DETECTOR_INPUT_SIZE = 416;

// Nota: NÃO usamos @tensorflow/tfjs-node (bindings nativos) porque a sua
// instalação exige compilação C++ no Windows quando não há binário
// pré-compilado para a versão do Node. O backend WASM é puro JS + um .wasm
// carregado em runtime — instala sempre, e no Node (com JIT/SIMD) é
// ordens de grandeza mais rápido que o Hermes do telemóvel.
const tf = require('@tensorflow/tfjs');
const wasm = require('@tensorflow/tfjs-backend-wasm');
const jpeg = require('jpeg-js');
const faceapi = require('@vladmandic/face-api/dist/face-api.node-wasm.js');

let ready = false;

async function initBackend() {
  try {
    // Prefixo local: o glue emscripten em Node lê o .wasm via fs.
    const wasmDir = path.join(__dirname, 'node_modules', '@tensorflow', 'tfjs-backend-wasm', 'dist') + path.sep;
    wasm.setWasmPaths(wasmDir);
    await tf.setBackend('wasm');
    await tf.ready();
  } catch (err) {
    console.warn('[face-service] backend wasm falhou, a usar cpu:', err.message);
    await tf.setBackend('cpu');
    await tf.ready();
  }
}

async function init() {
  await initBackend();
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromDisk(MODELS_DIR),
    faceapi.nets.faceLandmark68TinyNet.loadFromDisk(MODELS_DIR),
    faceapi.nets.faceRecognitionNet.loadFromDisk(MODELS_DIR),
  ]);

  // Warm-up: a primeira inferência compila os kernels e é ~10x mais lenta.
  // Fazemo-la já no arranque com uma imagem sintética para que o primeiro
  // pedido real seja rápido.
  const dummy = tf.zeros([DETECTOR_INPUT_SIZE, DETECTOR_INPUT_SIZE, 3], 'int32');
  try {
    await faceapi
      .detectSingleFace(dummy, new faceapi.TinyFaceDetectorOptions({ inputSize: DETECTOR_INPUT_SIZE }))
      .withFaceLandmarks(true)
      .withFaceDescriptor();
  } finally {
    dummy.dispose();
  }

  ready = true;
  console.log(`[face-service] modelos carregados de ${MODELS_DIR}, backend tf=${tf.getBackend()}`);
}

// A app envia sempre JPEG (expo-image-manipulator). Descodificamos com
// jpeg-js porque sem tfjs-node não existe tf.node.decodeImage.
function jpegToTensor(buf) {
  if (!(buf.length > 2 && buf[0] === 0xff && buf[1] === 0xd8)) {
    throw new Error('formato não suportado — envie JPEG');
  }
  const { width, height, data } = jpeg.decode(buf, { useTArray: true, maxMemoryUsageInMB: 512 });
  const rgb = new Int32Array(width * height * 3);
  for (let i = 0, o = 0; o < rgb.length; i += 4, o += 3) {
    rgb[o] = data[i];
    rgb[o + 1] = data[i + 1];
    rgb[o + 2] = data[i + 2];
  }
  return tf.tensor3d(rgb, [height, width, 3], 'int32');
}

function stripDataUriPrefix(b64) {
  const comma = b64.indexOf(',');
  return b64.startsWith('data:') && comma !== -1 ? b64.slice(comma + 1) : b64;
}

async function computeDescriptor(imageBuffer, minConfidence) {
  const tensor = jpegToTensor(imageBuffer);
  try {
    const detection = await faceapi
      .detectSingleFace(tensor, new faceapi.TinyFaceDetectorOptions({
        inputSize: DETECTOR_INPUT_SIZE,
        scoreThreshold: minConfidence,
      }))
      .withFaceLandmarks(true)
      .withFaceDescriptor();
    return detection ? Array.from(detection.descriptor) : null;
  } finally {
    tensor.dispose();
  }
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('payload demasiado grande'), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, ready ? 200 : 503, {
        status: ready ? 'ok' : 'loading',
        backend: ready ? tf.getBackend() : null,
        uptime_s: Math.round(process.uptime()),
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/descriptor') {
      if (!ready) {
        sendJson(res, 503, { error: 'Modelos ainda a carregar. Tente novamente.' });
        return;
      }
      const raw = await readBody(req);
      let payload;
      try {
        payload = JSON.parse(raw.toString('utf8'));
      } catch {
        sendJson(res, 400, { error: 'JSON inválido.' });
        return;
      }
      if (!payload || typeof payload.image !== 'string' || payload.image.length === 0) {
        sendJson(res, 400, { error: "Campo 'image' (base64) em falta." });
        return;
      }

      const minConfidence = typeof payload.minConfidence === 'number'
        ? Math.min(Math.max(payload.minConfidence, 0.1), 0.99)
        : DEFAULT_MIN_CONFIDENCE;

      let imageBuffer;
      try {
        imageBuffer = Buffer.from(stripDataUriPrefix(payload.image), 'base64');
      } catch {
        sendJson(res, 400, { error: 'Base64 inválido.' });
        return;
      }

      const t0 = Date.now();
      let descriptor;
      try {
        descriptor = await computeDescriptor(imageBuffer, minConfidence);
      } catch (err) {
        console.error('[face-service] erro na inferência:', err.message);
        sendJson(res, 422, { error: 'Imagem não pôde ser processada (formato suportado: JPEG).' });
        return;
      }
      const ms = Date.now() - t0;
      console.log(`[face-service] /descriptor detected=${descriptor !== null} ms=${ms} tensors=${tf.memory().numTensors}`);
      sendJson(res, 200, { detected: descriptor !== null, descriptor, ms });
      return;
    }

    sendJson(res, 404, { error: 'Rota desconhecida.' });
  } catch (err) {
    const status = err.statusCode || 500;
    console.error('[face-service] erro:', err.message);
    sendJson(res, status, { error: status === 413 ? 'Imagem demasiado grande.' : 'Erro interno do serviço facial.' });
  }
});

init()
  .then(() => {
    server.listen(PORT, HOST, () => {
      console.log(`[face-service] a escutar em http://${HOST}:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('[face-service] falha na inicialização:', err);
    process.exit(1);
  });
