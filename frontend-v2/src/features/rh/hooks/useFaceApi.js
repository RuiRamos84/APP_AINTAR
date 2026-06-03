import { useState, useCallback, useRef } from 'react';
import * as faceapi from '@vladmandic/face-api';

// import.meta.env.BASE_URL é substituído pelo Vite em cada build:
//   dev        → '/'      → '/models/face-api'
//   production → '/v2/'   → '/v2/models/face-api'
//   portal     → '/'      → '/models/face-api'
const MODEL_URL = `${import.meta.env.BASE_URL}models/face-api`;

let _modelsLoaded = false;
let _loadingPromise = null;

async function loadModels() {
  if (_modelsLoaded) return;
  if (_loadingPromise) return _loadingPromise;

  _loadingPromise = Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]).then(() => {
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
      .detectSingleFace(mediaElement, new faceapi.SsdMobilenetv1Options({ minConfidence }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) return null;
    return Array.from(detection.descriptor);
  }, []);

  return { modelsReady, loadError, ensureModels, extractDescriptor, faceapi };
}
