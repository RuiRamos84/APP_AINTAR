import React from 'react';
import { LogBox } from 'react-native';
import AppProviders from '@/core/providers/AppProviders';
import AppNavigator from '@/core/navigation/AppNavigator';

// TFJS (usado pelo reconhecimento facial em RH) re-regista os kernels do
// backend 'webgl' sempre que o Fast Refresh volta a executar o import de
// '@tensorflow/tfjs-react-native/dist/platform_react_native' — o registo
// global de kernels do TFJS não é limpo entre recargas, por isso a mesma
// chave acaba "já registada". É apenas ruído (o backend continua a funcionar
// normalmente); não há API pública do TFJS para evitar o warning na origem.
// O Expo Go também não consegue criar o contexto WebGL nativo que o backend
// 'rn-webgl' precisa (limitação do próprio Expo Go, não da app) — o código já
// trata isso e cai para o backend 'cpu' automaticamente (ver useFaceApi.ts).
LogBox.ignoreLogs([
  /kernel '.*' for backend 'webgl' is already registered/,
  'Cannot create a canvas in this context',
  'Initialization of backend rn-webgl failed',
]);

export default function App() {
  return (
    <AppProviders>
      <AppNavigator />
    </AppProviders>
  );
}
