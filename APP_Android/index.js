import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';
import App from './App';

// Filtra ruído conhecido e inofensivo do TFJS (reconhecimento facial em RH)
// que polui o terminal do Metro. Tem de correr antes de qualquer módulo que
// importe '@tensorflow/tfjs-react-native', por isso fica aqui em vez de
// App.tsx. Ver o comentário completo junto ao LogBox.ignoreLogs em App.tsx.
const IGNORED_PATTERNS = [
  /kernel '.*' for backend 'webgl' is already registered/,
  /Cannot create a canvas in this context/,
  /Initialization of backend rn-webgl failed/,
];
const shouldIgnore = (args) => {
  const msg = String(args[0] ?? '');
  return IGNORED_PATTERNS.some((p) => p.test(msg));
};
const originalWarn = console.warn;
console.warn = (...args) => { if (!shouldIgnore(args)) originalWarn(...args); };
const originalLog = console.log;
console.log = (...args) => { if (!shouldIgnore(args)) originalLog(...args); };
const originalError = console.error;
console.error = (...args) => { if (!shouldIgnore(args)) originalError(...args); };

registerRootComponent(App);
