const path = require("path");

module.exports = {
  // outras configurações...
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
  // outras configurações...
};
