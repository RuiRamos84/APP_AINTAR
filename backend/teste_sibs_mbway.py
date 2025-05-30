import requests

TRANSACTION_ID = "s2MfidBaW9NbUDThbQNh"  # Substituir pelo Transaction ID real
CLIENT_ID = "784ad796-b6bc-4857-b6a5-c32354b5679c"  # Substituir pelo teu Client ID
TRANSACTION_SIGNATURE = "eyJ0eElkIjoiczJNZmlkQmFXOU5iVURUaGJRTmgiLCJtYyI6NTA2MDA0LCJ0YyI6ODAzMTd9.f5JJP9i1xS7ZSLidhGQH92I80+da3AsDOzcZPA8GKOA=.fDgHEsE3Sur/XTQC36eM9q6VGHjKUYqqGLH2FOFe8BwCbWPQknCMqAGYUb8PbFz8"
TERMINAL_ID = 80317  # Deve ser inteiro
MERCHANT_ID = '52791'  # Deve ser string

# URL para processar o pagamento MBWay
API_URL_MBWAY = f"https://api.qly.sibspayments.com/sibs/spg/v2/payments/{TRANSACTION_ID}/mbway-id/purchase"


# Cabeçalhos (Ajustados)
headers = {
    "Authorization": f"Digest {TRANSACTION_SIGNATURE}",  # Usar Digest
    "X-IBM-Client-Id": CLIENT_ID,
    "Content-Type": "application/json",
    "Accept": "application/json",
}

# Corpo da requisição (Ajustado para o formato correto)
payload_mbway = {
    "customerPhone": "351#911177754"  # Formato correto com #
}

# Enviar requisição
response = requests.post(API_URL_MBWAY, headers=headers, json=payload_mbway)

# Verificar resposta
if response.status_code == 200:
    data = response.json()
    print("✅ Pagamento MBWay enviado com sucesso!")
    print("Status:", data.get("paymentStatus"))
    print("Código de Retorno:", data.get("returnStatus", {}).get("statusCode"))
else:
    print("❌ Erro ao processar pagamento MBWay:",
          response.status_code, response.text)
