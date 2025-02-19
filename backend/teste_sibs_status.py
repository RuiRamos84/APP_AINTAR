import requests

# URL da API para consultar status do pagamento
TRANSACTION_ID = "s2Ymk63jwJBsDtTJKJU8"  # Substituir pelo Transaction ID real
API_URL_STATUS = f"https://api.qly.sibspayments.com/sibs/spg/v2/payments/{TRANSACTION_ID}/status"
CLIENT_ID = "784ad796-b6bc-4857-b6a5-c32354b5679c"  # Substituir pelo teu Client ID
ACCESS_TOKEN = "0276b80f950fb446c6addaccd121abfbbb.eyJlIjoiMjA1NDM3Njg4Njk1NCIsInJvbGVzIjoiU1BHX01BTkFHRVIiLCJ0b2tlbkFwcERhdGEiOiJ7XCJtY1wiOlwiNTA2MDA0XCIsXCJ0Y1wiOlwiODAzMTdcIn0iLCJpIjoiMTczODg0NDA4Njk1NCIsImlzIjoiaHR0cHM6Ly9xbHkuc2l0ZTEuc3NvLnN5cy5zaWJzLnB0L2F1dGgvcmVhbG1zL1FMWS5NRVJDSC5QT1JUMSIsInR5cCI6IkJlYXJlciIsImlkIjoiVlVUakY2NTNiQTIzOGViZmRlMmFlYzQyOGRiN2YzMzg1NjliZWFkMGYyIn0=.c63e2a20a25af7ec6292ec64e26471f76683152a5d7f14a17edf70341adc2edf0449608e6fa1b527a44b295ebf64dea3182c7142796dad6299f9f28c5eb9e9f2"
# Cabeçalhos
headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "X-IBM-Client-Id": CLIENT_ID,
    "Accept": "application/json"
}

# Enviar requisição para obter status
response = requests.get(API_URL_STATUS, headers=headers)

# Verificar resposta
if response.status_code == 200:
    print(response.status_code, response.text)

    data = response.json()
    print("✅ Status do Pagamento:", data.get("status"))
else:
    print("❌ Erro ao obter status:", response.status_code, response.text)
