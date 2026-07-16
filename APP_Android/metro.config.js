const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// O entry-point normal do @vladmandic/face-api traz um TensorFlow.js embutido
// que só corre em CPU — inviável no Hermes (sem JIT, uma inferência demora
// minutos e bloqueia a thread de JS). A variante "nobundle" importa
// @tensorflow/tfjs externo, o que nos permite ligar o backend GPU
// (rn-webgl, via @tensorflow/tfjs-react-native + expo-gl).
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === '@vladmandic/face-api') {
    return {
      filePath: path.resolve(__dirname, 'node_modules/@vladmandic/face-api/dist/face-api.esm-nobundle.js'),
      type: 'sourceFile',
    };
  }
  return (defaultResolveRequest ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = config;
