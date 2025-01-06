const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

// Carregar variáveis de ambiente do arquivo correto
const envFile =
  process.env.NODE_ENV === "production"
    ? ".env.production"
    : ".env.development";
dotenv.config({ path: path.resolve(__dirname, envFile) });

// Exportar variáveis de ambiente como um JSON
const envConfig = JSON.stringify({
  REACT_APP_API_BASE_URL: process.env.REACT_APP_API_BASE_URL,
  REACT_APP_SOCKET_URL: process.env.REACT_APP_SOCKET_URL,
});

fs.writeFileSync(
  path.resolve(__dirname, "public", "env-config.json"),
  envConfig
);
