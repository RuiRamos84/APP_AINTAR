import Constants from 'expo-constants';

// Em desenvolvimento, o Expo sabe sempre o IP real da máquina (usa-o para
// servir o bundle). Lemos esse IP e apontamos o backend na mesma máquina.
// Em produção usamos a URL fixa definida no .env.
const getApiBaseUrl = (): string => {
  if (process.env.EXPO_PUBLIC_NODE_ENV !== 'development') {
    return process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://app.aintar.pt/api/v1';
  }

  // hostUri = "<ip>:<metro-port>" (ex: "10.100.10.156:8081")
  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.launchAsset?.url ?? // Expo Go SDK ≤ 48
    (Constants as any).manifest?.debuggerHost;       // legacy

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000/api/v1`;
  }

  // Fallback: variável do .env ou localhost
  return process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:5000/api/v1';
};

const getWsUrl = (): string => {
  if (process.env.EXPO_PUBLIC_NODE_ENV !== 'development') {
    return process.env.EXPO_PUBLIC_WS_URL ?? 'https://app.aintar.pt';
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    (Constants as any).manifest2?.launchAsset?.url ??
    (Constants as any).manifest?.debuggerHost;

  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:5000`;
  }

  return process.env.EXPO_PUBLIC_WS_URL ?? 'http://localhost:5000';
};

const ENV = {
  API_BASE_URL: getApiBaseUrl(),
  WS_URL:       getWsUrl(),
  APP_TITLE:    process.env.EXPO_PUBLIC_APP_TITLE ?? 'AINTAR APP',
  IS_DEV:       process.env.EXPO_PUBLIC_NODE_ENV === 'development',
};

export default ENV;
