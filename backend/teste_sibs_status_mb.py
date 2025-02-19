import requests

TRANSACTION_ID = "s2nn7bnX9CJaEDUtZayw"  # Substituir pelo Transaction ID real
CLIENT_ID = "784ad796-b6bc-4857-b6a5-c32354b5679c"  # Substituir pelo teu Client ID
TRANSACTION_SIGNATURE = "eyJ0eElkIjoiczJubjdiblg5Q0phRURVdFpheXciLCJtYyI6NTA2MDA0LCJ0YyI6ODAzMTd9.XyykdLp9YN7wV12VhW9qqoDRDPS+rWdIiQcl/JAhJIM=.fDgHEsE3Sur/XTQC36eM9q6VGHjKUYqqGLH2FOFe8BwCbWPQknCMqAGYUb8PbFz8"
TERMINAL_ID = 80317  # Deve ser inteiro
MERCHANT_ID = '52791'  # Deve ser string

# URL para consultar status do pagamento
API_URL_STATUS = f"https://api.qly.sibspayments.com/sibs/spg/v2/payments/{TRANSACTION_ID}/status"

ACCESS_TOKEN = "0276b80f950fb446c6addaccd121abfbbb.eyJlIjoiMjA1NDM3Njg4Njk1NCIsInJvbGVzIjoiU1BHX01BTkFHRVIiLCJ0b2tlbkFwcERhdGEiOiJ7XCJtY1wiOlwiNTA2MDA0XCIsXCJ0Y1wiOlwiODAzMTdcIn0iLCJpIjoiMTczODg0NDA4Njk1NCIsImlzIjoiaHR0cHM6Ly9xbHkuc2l0ZTEuc3NvLnN5cy5zaWJzLnB0L2F1dGgvcmVhbG1zL1FMWS5NRVJDSC5QT1JUMSIsInR5cCI6IkJlYXJlciIsImlkIjoiVlVUakY2NTNiQTIzOGViZmRlMmFlYzQyOGRiN2YzMzg1NjliZWFkMGYyIn0=.c63e2a20a25af7ec6292ec64e26471f76683152a5d7f14a17edf70341adc2edf0449608e6fa1b527a44b295ebf64dea3182c7142796dad6299f9f28c5eb9e9f2"
# Cabeçalhos
headers = {
    "Authorization": f"Bearer {ACCESS_TOKEN}",
    "X-IBM-Client-Id": CLIENT_ID,
    "Accept": "application/json"
}

# Enviar requisição GET para obter status do pagamento
response = requests.get(API_URL_STATUS, headers=headers)

# Verificar resposta
if response.status_code == 200:
    data = response.json()
    print("✅ Status do Pagamento Obtido com Sucesso!")
    print(data)
    print("Merchant Transaction ID:", data.get(
        "merchant", {}).get("merchantTransactionId"))
    print("Transaction ID:", data.get("transactionID"))
    print("Valor:", data.get("amount", {}).get("value"),
          data.get("amount", {}).get("currency"))
    print("Método de Pagamento:", data.get("paymentMethod"))
    print("Estado do Pagamento:", data.get("paymentStatus"))
    print("Código de Retorno:", data.get("returnStatus", {}).get("statusCode"))
    print("Descrição do Estado:", data.get(
        "returnStatus", {}).get("statusDescription"))
    print("Referência de Pagamento:", data.get(
        "paymentReference", {}).get("reference"))
    print("Entidade de Pagamento:", data.get(
        "paymentReference", {}).get("paymentEntity"))
    print("Valor da Referência:", data.get("paymentReference", {}).get("amount", {}).get(
        "value"), data.get("paymentReference", {}).get("amount", {}).get("currency"))
    print("Estado da Referência:", data.get(
        "paymentReference", {}).get("status"))
    print("Data de Expiração:", data.get(
        "paymentReference", {}).get("expireDate"))
else:
    print("❌ Erro ao obter status do pagamento:",
          response.status_code, response.text)

{
    'merchant': 
        {
            'terminalId': '80317', 
            'merchantTransactionId': '2025.E.INF.000279'
            },
            'transactionID': 's2npGM3khp8rVHqPPUxE',
            'amount': 
                {
                    'currency': 'EUR', 
                    'value': '0.01'
                },
            'paymentType': 'PREF',
            'paymentStatus': 'Pending',
            'paymentReference': 
                {
                    'entity': '52791', 
                    'reference': '066295419', 
                    'paymentEntity': '52791', 
                    'amount': 
                        {
                            'value': '0.0', 
                            'currency': 'EUR'}, 
                            'status': 'UNPAID', 
                            'expireDate': '2025-02-14T14:46:30.262Z'
                        },
                    'paymentMethod': 'REFERENCE',
                    'execution': 
                        {
                            'endTime': '2025-02-12T14:58:48.360Z', 
                            'startTime': '2025-02-12T14:58:47.757Z'
                        }, 
                        'returnStatus': 
                            {
                                'statusCode': '000',
                                'statusMsg': 'Success', 
                                'statusDescription': 'Success'
                            }, 
                        'transactionStatusCode': '000',
                        'transactionStatusDescription': 'Pending'
                    }
