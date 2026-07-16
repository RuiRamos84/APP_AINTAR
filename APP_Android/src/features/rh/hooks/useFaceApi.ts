import { useCallback, useRef, useState } from 'react';
import { toByteArray } from 'base64-js';
import { decode as decodeJpegBytes } from 'jpeg-js';
// eslint-disable-next-line import/no-namespace
import * as faceapi from '@vladmandic/face-api';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import ENV from '@/core/config/env';

// @vladmandic/face-api empacota o seu próprio TensorFlow.js (não tem
// dependências declaradas — tudo vem embutido no bundle). Por isso a
// descodificação da foto tem de construir o tensor através de `faceapi.tf`
// (a instância interna do face-api), nunca de um pacote `@tensorflow/tfjs`
// instalado à parte — seriam duas cópias distintas do motor e o face-api
// rejeitaria um tensor criado por uma cópia que não é a sua própria.
//
// NOTA: já tentámos o backend GPU 'rn-webgl' (via expo-gl +
// @tensorflow/tfjs-react-native) — falha sempre com "Cannot create a canvas
// in this context" porque a versão actual do expo-gl já não expõe contexto
// headless da forma como aquela biblioteca (parada desde ~2021) espera.
// Em vez de perseguir esse caminho, o fluxo de captura passou a fazer UMA
// única análise por passo (em vez de várias por segundo) — em CPU, uma
// análise isolada demora poucos segundos, o que é perfeitamente aceitável
// quando só acontece 8 vezes no total, não continuamente.
function jpegBase64ToTensor(base64Jpeg: string) {
  const bytes = toByteArray(base64Jpeg);
  const { width, height, data } = decodeJpegBytes(bytes, { useTArray: true });
  // jpeg-js devolve sempre RGBA (alpha fixo a 255) — descartar o canal alfa.
  const rgb = new Uint8Array(width * height * 3);
  for (let i = 0, o = 0; o < rgb.length; i += 4, o += 3) {
    rgb[o] = data[i];
    rgb[o + 1] = data[i + 1];
    rgb[o + 2] = data[i + 2];
  }
  return faceapi.tf.tensor3d(rgb, [height, width, 3]);
}

// As fotos da câmara vêm em resolução completa (vários MP) — decodificar e
// analisar isso é desperdício puro, o detector trabalha a 224px. Reduzir para
// esta largura antes de decodificar corta o custo total em >90%.
const ANALYSIS_WIDTH = 480;

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

async function initBackend(): Promise<void> {
  // O face-api só reconhece "browser" (window+document+Canvas/Image/Video)
  // ou "Node.js" — nenhum dos dois existe tal-e-qual no React Native, por
  // isso getEnv() falha com "environment is not defined" se não for
  // inicializado à mão. Só o `fetch` é realmente usado (para descarregar os
  // modelos) — nunca chegamos a usar Canvas/Image/Video porque os tensores
  // são construídos directamente do JPEG via jpeg-js.
  try {
    faceapi.env.getEnv();
  } catch {
    const stub = class {} as unknown as new (...args: unknown[]) => unknown;
    faceapi.env.setEnv({
      readFile: async () => { throw new Error('readFile não suportado em React Native'); },
      Canvas: stub as any,
      CanvasRenderingContext2D: stub as any,
      Image: stub as any,
      ImageData: stub as any,
      Video: stub as any,
      createCanvasElement: () => { throw new Error('createCanvasElement não suportado em React Native'); },
      createImageElement: () => { throw new Error('createImageElement não suportado em React Native'); },
      createVideoElement: () => { throw new Error('createVideoElement não suportado em React Native'); },
      fetch: (...args: Parameters<typeof fetch>) => global.fetch(...args),
    } as any);
  }

  // O TFJS interno do face-api tem o seu próprio conceito de "platform" —
  // chama platform.fetch(...) sem nenhuma verificação, e nenhuma platform
  // vem pré-registada em React Native. Isto é independente do backend de
  // cálculo (cpu/webgl) — é só usado para descarregar os ficheiros dos
  // modelos.
  interface TfPlatform {
    fetch(path: string, init?: RequestInit): Promise<Response>;
    now(): number;
    encode(text: string, encoding: string): Uint8Array;
    decode(bytes: Uint8Array, encoding: string): string;
    isTypedArray(a: unknown): boolean;
  }
  const tf = faceapi.tf as unknown as {
    setBackend(name: string): Promise<boolean>;
    ready(): Promise<void>;
    getBackend(): string;
    env(): { platform: TfPlatform | null; setPlatform(name: string, platform: TfPlatform): void };
  };

  if (!tf.env().platform) {
    tf.env().setPlatform('react-native', {
      fetch: (path, init) => global.fetch(path, init),
      now: () => Date.now(),
      // Sem Buffer disponível no motor do React Native — usar TextEncoder/
      // TextDecoder nativos do Hermes quando existem, com um codec UTF-8
      // manual como rede de segurança (só texto ASCII/UTF-8 é usado aqui).
      encode: (text) => {
        if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(text);
        const bytes: number[] = [];
        for (let i = 0; i < text.length; i++) {
          const code = text.codePointAt(i)!;
          if (code < 0x80) bytes.push(code);
          else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
          else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
          else { bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f)); i++; }
        }
        return new Uint8Array(bytes);
      },
      decode: (bytesArr) => {
        if (typeof TextDecoder !== 'undefined') return new TextDecoder().decode(bytesArr);
        let out = '';
        for (let i = 0; i < bytesArr.length; i++) out += String.fromCharCode(bytesArr[i]);
        return decodeURIComponent(escape(out));
      },
      isTypedArray: (a) =>
        a instanceof Float32Array || a instanceof Int32Array || a instanceof Uint8Array || a instanceof Uint8ClampedArray,
    });
  }

  await tf.setBackend('cpu');
  await tf.ready();
  console.log(`[useFaceApi] TFJS backend activo: ${tf.getBackend()}`);
}

async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = initBackend()
    .then(() =>
      Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(ENV.FACE_MODELS_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(ENV.FACE_MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(ENV.FACE_MODELS_URL),
      ])
    )
    .then(() => {
      modelsLoaded = true;
      loadingPromise = null;
    })
    .catch((err) => {
      loadingPromise = null;
      throw err;
    });

  return loadingPromise;
}

export function useFaceApi() {
  const [modelsReady, setModelsReady] = useState(modelsLoaded);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadedRef = useRef(modelsLoaded);

  const ensureModels = useCallback(async (): Promise<boolean> => {
    if (loadedRef.current) return true;
    try {
      await loadModels();
      loadedRef.current = true;
      setModelsReady(true);
      return true;
    } catch (err: any) {
      const detail = err?.message ?? String(err);
      console.error('[useFaceApi] Falha ao carregar modelos de reconhecimento facial:', err);
      setLoadError(`Não foi possível carregar os modelos de reconhecimento facial. (${detail})`);
      return false;
    }
  }, []);

  /**
   * Decodifica uma foto (base64 JPEG) e extrai o descritor facial de 128
   * valores. Devolve null se não detectar rosto.
   */
  const extractDescriptorFromBase64 = useCallback(
    async (base64Jpeg: string, minConfidence = 0.8): Promise<number[] | null> => {
      const t0 = Date.now();
      const imageTensor = jpegBase64ToTensor(base64Jpeg);
      const t1 = Date.now();
      try {
        // Os .d.ts do face-api referem o Tensor3D do seu TFJS embutido; em
        // runtime é a mesma instância, mas os tipos não se reconhecem — cast
        // necessário.
        const detection = await faceapi
          .detectSingleFace(
            imageTensor as unknown as faceapi.TNetInput,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: minConfidence })
          )
          .withFaceLandmarks(true)
          .withFaceDescriptor();
        const t2 = Date.now();
        console.log(`[useFaceApi] decode JPEG: ${t1 - t0}ms · inferência: ${t2 - t1}ms · rosto: ${detection ? 'SIM' : 'não'}`);

        if (!detection) return null;
        return Array.from(detection.descriptor);
      } finally {
        imageTensor.dispose();
      }
    },
    []
  );

  /**
   * Caminho preferido a partir da câmara: recebe o URI da foto, reduz para
   * ANALYSIS_WIDTH (corta >90% do custo de decode+inferência) e extrai o
   * descritor. Apaga os ficheiros temporários no final (original + reduzido).
   */
  const extractDescriptorFromPhotoUri = useCallback(
    async (uri: string, minConfidence = 0.8): Promise<number[] | null> => {
      const resized = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: ANALYSIS_WIDTH } }],
        { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      try {
        if (!resized.base64) return null;
        return await extractDescriptorFromBase64(resized.base64, minConfidence);
      } finally {
        await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
        await FileSystem.deleteAsync(resized.uri, { idempotent: true }).catch(() => {});
      }
    },
    [extractDescriptorFromBase64]
  );

  return { modelsReady, loadError, ensureModels, extractDescriptorFromBase64, extractDescriptorFromPhotoUri };
}
