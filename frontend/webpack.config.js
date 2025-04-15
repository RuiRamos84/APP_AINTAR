const path = require("path");

module.exports = {
  // Add WASM support
  experiments: {
    asyncWebAssembly: true,
  },

  // Rule for handling WASM files in module.rules section if it exists
  module: {
    rules: [
      // Your existing rules...

      // Rule for handling WASM files
      {
        test: /\.wasm$/,
        type: 'webassembly/async',
      }
    ],
  },

  resolve: {
    fallback: {
      path: require.resolve("path-browserify"),
      os: require.resolve("os-browserify/browser"),
      crypto: require.resolve("crypto-browserify"),
    },
    alias: {
      "pdfjs-dist/build/pdf.worker.entry": path.join(
        __dirname,
        "node_modules/pdfjs-dist/build/pdf.worker.min.js"
      ),
    },
  },
};