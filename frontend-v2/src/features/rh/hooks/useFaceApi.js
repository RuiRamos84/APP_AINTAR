import { useState, useCallback, useRef } from 'react';
import * as faceapi from '@vladmandic/face-api';

// import.meta.env.BASE_URL é substituído pelo Vite em cada build:
//   dev        → '/'      → '/models/face-api'
//   production → '/v2/'   → '/v2/models/face-api'
//   portal     → '/'      → '/models/face-api'
const MODEL_URL = `${import.meta.env.BASE_URL}models/face-api`;

let _modelsLoaded = false;
let _loadingPromise = null;

// Tenta 'webgl' primeiro — em tablets/smartphones e na maioria dos portáteis
// existe GPU acessível ao browser e o ganho de velocidade é grande. Em
// desktops sem GPU passthrough (VMs, RDP) a tentativa falha e caímos para
// 'cpu'. O tfjs escreve avisos internos (console.warn/error) durante a
// tentativa falhada, mesmo apanhando a exceção — por isso suprimimos a
// consola só durante esta inicialização, restaurando-a já a seguir.
// 'wasm' nunca é tentado: o backend procura ficheiros .wasm num caminho que
// o Vite não serve, falhando sempre com "Incorrect response MIME type".
async function initBackend() {
  const { warn, error } = console;
  console.warn = () => {};
  console.error = () => {};
  try {
    await faceapi.tf.setBackend('webgl');
    await faceapi.tf.ready();
  } catch {
    await faceapi.tf.setBackend('cpu');
    await faceapi.tf.ready();
  } finally {
    console.warn = warn;
    console.error = error;
  }
}

// tinyFaceDetector (+ landmark68Tiny) em vez de ssdMobilenetv1: o SSD é um
// detector pesado desenhado para GPU — em CPU pura cada chamada demora muito
// mais, e o loop de captura chama-o até ~40x (TOTAL_CAPTURES × FRAMES_TO_CONFIRM).
// O tiny detector é ordens de grandeza mais rápido em CPU, com qualidade
// suficiente para uma captura de enrolamento a curta distância.
async function loadModels() {
  if (_modelsLoaded) return;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = initBackend().then(() => Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ])).then(() => {
    _modelsLoaded = true;
    _loadingPromise = null;
  });

  return _loadingPromise;
}

export function useFaceApi() {
  const [modelsReady, setModelsReady] = useState(_modelsLoaded);
  const [loadError, setLoadError]   = useState(null);
  const loadedRef = useRef(_modelsLoaded);

  const ensureModels = useCallback(async () => {
    if (loadedRef.current) return true;
    try {
      await loadModels();
      loadedRef.current = true;
      setModelsReady(true);
      return true;
    } catch (err) {
      setLoadError('Não foi possível carregar os modelos de reconhecimento facial.');
      return false;
    }
  }, []);

  /**
   * Extrai o descritor 128-D de um elemento de vídeo/canvas/imagem.
   * Devolve Float32Array ou null se não detectar rosto.
   */
  const extractDescriptor = useCallback(async (mediaElement, minConfidence = 0.85) => {
    const detection = await faceapi
      .detectSingleFace(mediaElement, new faceapi.TinyFaceDetectorOptions({
        inputSize: 224,
        scoreThreshold: minConfidence,
      }))
      .withFaceLandmarks(true) // true = usar faceLandmark68TinyNet (carregado em vez do modelo completo)
      .withFaceDescriptor();

    if (!detection) return null;
    return Array.from(detection.descriptor);
  }, []);

  return { modelsReady, loadError, ensureModels, extractDescriptor, faceapi };
}

/**
 * Média vector-a-vector de vários descritores 128-D, renormalizada para
 * norma unitária. Usada para consolidar os últimos N frames confirmados
 * num único descritor mais estável — um frame isolado com brilho (ex.:
 * reflexo em óculos) ou ligeiro desfoque pesa menos combinado com os
 * frames vizinhos.
 *
 * Os descritores do face-api.js são vectores unitários (norma 1); a média
 * de N deles tem norma < 1 (encolhe tanto mais quanto mais os frames
 * divergem entre si). Sem renormalizar, isso reduz artificialmente a
 * distância euclidiana ao comparar contra os templates, desalinhando o
 * resultado do FACE_THRESHOLD calibrado para vectores unitários.
 */
export function averageDescriptors(descriptors) {
  const len = descriptors[0].length;
  const sum = new Array(len).fill(0);
  for (const d of descriptors) {
    for (let i = 0; i < len; i++) sum[i] += d[i];
  }
  const mean = sum.map(v => v / descriptors.length);
  const norm = Math.sqrt(mean.reduce((acc, v) => acc + v * v, 0));
  return norm > 0 ? mean.map(v => v / norm) : mean;
}
