import datetime
import requests

# Configurações da API SIBS
API_URL = "https://api.qly.sibspayments.com/sibs/spg/v2/payments"
CLIENT_ID = "784ad796-b6bc-4857-b6a5-c32354b5679c"
ACCESS_TOKEN = "0276b80f950fb446c6addaccd121abfbbb.eyJlIjoiMjA1NDM3Njg4Njk1NCIsInJvbGVzIjoiU1BHX01BTkFHRVIiLCJ0b2tlbkFwcERhdGEiOiJ7XCJtY1wiOlwiNTA2MDA0XCIsXCJ0Y1wiOlwiODAzMTdcIn0iLCJpIjoiMTczODg0NDA4Njk1NCIsImlzIjoiaHR0cHM6Ly9xbHkuc2l0ZTEuc3NvLnN5cy5zaWJzLnB0L2F1dGgvcmVhbG1zL1FMWS5NRVJDSC5QT1JUMSIsInR5cCI6IkJlYXJlciIsImlkIjoiVlVUakY2NTNiQTIzOGViZmRlMmFlYzQyOGRiN2YzMzg1NjliZWFkMGYyIn0=.c63e2a20a25af7ec6292ec64e26471f76683152a5d7f14a17edf70341adc2edf0449608e6fa1b527a44b295ebf64dea3182c7142796dad6299f9f28c5eb9e9f2"  # Token OAuth obtido antes
TERMINAL_ID = 80317  # Deve ser inteiro
ENTITY = '52791'  # Deve ser string

ORDER_ID = "2025.E.INF.000279"

# Gerar timestamp correto
current_time = datetime.datetime.now(datetime.UTC).isoformat()
expiration_time = (datetime.datetime.now(datetime.UTC) +
                   datetime.timedelta(days=2)).isoformat()

# Cabeçalhos da requisição
headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "X-IBM-Client-Id": CLIENT_ID,
    "Content-Type": "application/json",
    "Accept": "application/json"
}

# Corpo do pedido de pagamento
payload = {
    "merchant": {
        "terminalId": TERMINAL_ID,
        "channel": "web",
        "merchantTransactionId": ORDER_ID
    },
    "transaction": {
        "transactionTimestamp": current_time,
        "description": "Pagamento Exemplo",
        "moto": False,
        "paymentType": "PURS",
        "amount": {
            "value": 0.01,
            "currency": "EUR"
        },
        "paymentMethod": [
            "CARD",
            "MBWAY",
            "REFERENCE"
        ],
        "paymentReference": {
            "initialDatetime": current_time,
            "finalDatetime": expiration_time,
            "maxAmount": {
                "value": 0.01,
                "currency": "EUR"
            },
            "minAmount": {
                "value": 0.01,
                "currency": "EUR"
            },
            "entity": ENTITY
        }
    }
}

# Enviar requisição para a SIBS
response = requests.post(API_URL, headers=headers, json=payload)

# Verificar resposta
if response.status_code == 200:
    data = response.json()
    print("✅ Pagamento criado com sucesso!")
    print(response.status_code, response.text)
    print(expiration_time, '_', current_time)
    print("Transaction ID:", data.get("transactionID"))
    print("Transaction Signature:", data.get("transactionSignature"))
else:
    print("❌ Erro ao criar pagamento:", response.status_code, response.text)
