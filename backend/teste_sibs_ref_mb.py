import requests
import datetime

# URL da API para consultar status do pagamento
TRANSACTION_ID = "s28bJEG4Cr87yxcpkN9K"  # Substituir pelo Transaction ID real
API_URL_STATUS = f"https://api.qly.sibspayments.com/sibs/spg/v2/payments/{TRANSACTION_ID}/status"
CLIENT_ID = "784ad796-b6bc-4857-b6a5-c32354b5679c"  # Substituir pelo teu Client ID
TRANSACTION_SIGNATURE = "eyJ0eElkIjoiczI4YkpFRzRDcjg3eXhjcGtOOUsiLCJtYyI6NTA2MDA0LCJ0YyI6ODAzMTd9.q+GfUWiVYqxe+1rDZttiaWMxiu71oO3wrDWwtGX61tY=.fDgHEsE3Sur/XTQC36eM9q6VGHjKUYqqGLH2FOFe8BwCbWPQknCMqAGYUb8PbFz8"
API_URL_REFERENCE = f"https://api.qly.sibspayments.com/sibs/spg/v2/payments/{TRANSACTION_ID}/service-reference/generate"

# Cabeçalhos
headers = {
    "Authorization": f"Digest {TRANSACTION_SIGNATURE}",
    "X-IBM-Client-Id": CLIENT_ID,
    "Content-Type": "application/json",
    "Accept": "application/json"
}

# Corpo da requisição
payload_reference = {
    "customerPhone": "351#911177754"  # Substituir pelo telefone real
}

# Enviar requisição
response = requests.post(
    API_URL_REFERENCE, headers=headers)

# Verificar resposta
if response.status_code == 200:
    print(response.status_code, response.text)
    data = response.json()
    print("✅ Referência Multibanco Gerada!")
    print("Entidade:", data.get("entity"))
    print("Referência:", data.get("reference"))
    print("Valor:", data.get("amount"))
else:
    print("❌ Erro ao gerar referência MB:",
          response.status_code, response.text)
