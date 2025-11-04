# 🔄 REINICIAR BACKEND - CORREÇÃO FINAL

## ✅ Problema Corrigido:

**Prefix duplicado no blueprint:**
- ANTES: `Blueprint(..., url_prefix='/emissions')` + registo com `url_prefix='/api/v1'`
- RESULTADO: `/api/v1/emissions/emissions/types` ❌

- AGORA: `Blueprint(..., url_prefix='/api/v1/emissions')` + registo sem prefix
- RESULTADO: `/api/v1/emissions/types` ✅

---

## 🚀 AÇÃO NECESSÁRIA:

### 1. Parar Backend Atual:
```
Ctrl + C no terminal
```

### 2. Reiniciar:
```powershell
$env:FLASK_ENV="development"
python run_waitress.py
```

### 3. Verificar Logs:
Deves ver:
```
INFO:socketio:... - 200 OK - GET /api/v1/emissions/types - ...
```

Em vez de:
```
INFO:socketio:... - 404 NOT FOUND - GET /api/v1/emissions/types - ...
```

---

## ✅ Após Reiniciar:

### Testar API:
```bash
curl http://localhost:5000/api/v1/emissions/health
```

### Aceder Frontend:
```
http://localhost:3000/emissions
```

**O erro 404 vai desaparecer!** 🎉
