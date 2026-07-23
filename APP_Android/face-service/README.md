# AINTAR face-service

Micro-serviço Node que calcula descritores faciais 128-D a partir de fotografias, usando os **mesmos modelos** (`@vladmandic/face-api`: tinyFaceDetector + faceLandmark68Tiny + faceRecognitionNet) que o frontend-v2 usa no browser. Os descritores vivem no mesmo espaço vectorial dos templates já registados pela web — nenhuma migração de dados é necessária.

## Porquê existe

A app Android não consegue calcular o descritor localmente: o Hermes (motor JS do React Native) não tem JIT nem WebAssembly, e a inferência em CPU pura demorava 12-48 segundos por análise. Aqui, no Node (backend WASM com JIT), demora **<1 segundo**.

## Fluxo

```
App Android → POST /rh/face/descriptor (Flask, JWT)
            → POST http://127.0.0.1:5101/descriptor (este serviço)
            → devolve { detected, descriptor[128], ms }
App usa depois o descritor nos endpoints normais /rh/face/enroll e /rh/face/verify.
```

O serviço **não é exposto à internet** — escuta em `127.0.0.1` e só o Flask lhe fala. Autenticação/autorização acontecem no Flask. Nenhuma imagem é gravada em disco.

## Arranque

```powershell
cd face-service
npm install        # só na primeira vez
npm start          # arranca em http://127.0.0.1:5101
```

Em desenvolvimento, precisa de estar a correr numa janela própria, tal como o Flask e o Metro.

## Configuração (variáveis de ambiente)

| Variável | Omissão | Descrição |
|---|---|---|
| `FACE_SERVICE_PORT` | `5101` | Porta de escuta |
| `FACE_SERVICE_HOST` | `127.0.0.1` | Interface de escuta (não mudar em produção) |
| `FACE_MODELS_DIR` | `./models` | Pasta com os ficheiros dos modelos |

No **Flask**, o URL do serviço configura-se com `FACE_SERVICE_URL` (omissão: `http://127.0.0.1:5101`).

## API

- `GET /health` → `{ status, backend, uptime_s }`
- `POST /descriptor` → body `{ "image": "<base64 JPEG>", "minConfidence": 0.8 }` → `{ detected, descriptor, ms }`

## Produção (Windows)

Instalar como serviço para arrancar com a máquina, por exemplo com [NSSM](https://nssm.cc/):

```powershell
nssm install aintar-face-service "C:\Program Files\nodejs\node.exe" "C:\caminho\para\face-service\server.js"
nssm start aintar-face-service
```
