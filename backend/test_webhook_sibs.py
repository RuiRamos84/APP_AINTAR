"""
Script para testar o webhook SIBS com encriptacao AES-GCM real.
Simula exactamente o que a SIBS envia.

Uso:
    python test_webhook_sibs.py [--url URL] [--status STATUS]

Exemplos:
    python test_webhook_sibs.py                           # Testa localmente
    python test_webhook_sibs.py --url https://xxx.ngrok.io/webhook/sibs
    python test_webhook_sibs.py --status Declined         # Simula pagamento recusado
"""
import argparse
import base64
import json
import os
import sys
import uuid
from datetime import datetime
from pathlib import Path

import requests
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from dotenv import load_dotenv

# Carregar .env do directorio do script
script_dir = Path(__file__).parent
load_dotenv(script_dir / '.env.development')


def encrypt_sibs_payload(payload: dict, secret_b64: str):
    """
    Encriptar payload como a SIBS faz.
    Retorna: (encrypted_body_b64, iv_b64, auth_tag_b64)
    """
    secret_key = base64.b64decode(secret_b64)

    # Gerar IV aleatório (12 bytes para GCM)
    iv = os.urandom(12)

    # Converter payload para JSON bytes
    plaintext = json.dumps(payload).encode('utf-8')

    # Encriptar com AES-GCM
    aesgcm = AESGCM(secret_key)
    ciphertext_with_tag = aesgcm.encrypt(iv, plaintext, None)

    # A biblioteca retorna ciphertext + tag (16 bytes) concatenados
    ciphertext = ciphertext_with_tag[:-16]
    auth_tag = ciphertext_with_tag[-16:]

    return (
        base64.b64encode(ciphertext).decode('utf-8'),
        base64.b64encode(iv).decode('utf-8'),
        base64.b64encode(auth_tag).decode('utf-8')
    )


def create_sibs_webhook_payload(
    transaction_id: str = None,
    payment_status: str = "Success",
    payment_method: str = "MBWAY",
    amount: float = 10.00
):
    """Criar payload típico da SIBS"""
    if not transaction_id:
        transaction_id = f"TEST-{uuid.uuid4().hex[:12].upper()}"

    return {
        "notificationID": str(uuid.uuid4()),
        "transactionID": transaction_id,
        "merchantTransactionId": transaction_id,
        "paymentStatus": payment_status,
        "paymentMethod": payment_method,
        "amount": {
            "value": amount,
            "currency": "EUR"
        },
        "paymentDateTime": datetime.now().isoformat(),
        "merchant": {
            "terminalId": os.getenv("SIBS_TERMINAL_ID", "80317"),
            "channel": "WEB"
        }
    }


def test_webhook(url: str, secret: str, payload: dict, verbose: bool = True):
    """Enviar webhook encriptado"""

    if verbose:
        print(f"\n{'='*60}")
        print("TESTE WEBHOOK SIBS (com AES-GCM)")
        print(f"{'='*60}")
        print(f"\nURL: {url}")
        print(f"\nPayload original:")
        print(json.dumps(payload, indent=2))

    # Encriptar
    encrypted_body, iv_b64, tag_b64 = encrypt_sibs_payload(payload, secret)

    if verbose:
        print(f"\nEncriptado:")
        print(f"  IV: {iv_b64[:20]}...")
        print(f"  Tag: {tag_b64[:20]}...")
        print(f"  Body: {encrypted_body[:50]}...")

    # Enviar
    headers = {
        "Content-Type": "text/plain",
        "X-Initialization-Vector": iv_b64,
        "X-Authentication-Tag": tag_b64
    }

    if verbose:
        print(f"\nEnviando...")

    try:
        response = requests.post(url, data=encrypted_body, headers=headers, timeout=30)

        print(f"\n{'='*60}")
        print(f"RESPOSTA: {response.status_code}")
        print(f"{'='*60}")

        try:
            resp_json = response.json()
            print(json.dumps(resp_json, indent=2))

            if resp_json.get("statusCode") == "200":
                print("\n✅ WEBHOOK PROCESSADO COM SUCESSO!")
                return True
            else:
                print(f"\n❌ Erro: {resp_json.get('statusMsg')}")
                return False

        except:
            print(response.text)
            return False

    except requests.exceptions.ConnectionError:
        print(f"\n❌ Erro de conexão: Servidor não acessível em {url}")
        return False
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        return False


def test_webhook_unencrypted(url: str, payload: dict):
    """Testar endpoint de teste (sem encriptação)"""
    test_url = url.replace("/webhook/sibs", "/webhook/sibs/test")

    print(f"\n{'='*60}")
    print("TESTE WEBHOOK (sem encriptação - endpoint /test)")
    print(f"{'='*60}")
    print(f"\nURL: {test_url}")

    try:
        response = requests.post(test_url, json=payload, timeout=30)
        print(f"\nResposta: {response.status_code}")
        print(json.dumps(response.json(), indent=2))
        return response.status_code == 200
    except Exception as e:
        print(f"Erro: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description="Testar webhook SIBS")
    parser.add_argument("--url", default="http://localhost:5000/webhook/sibs",
                       help="URL do webhook")
    parser.add_argument("--status", default="Success",
                       choices=["Success", "Pending", "Declined", "Expired"],
                       help="Status do pagamento")
    parser.add_argument("--method", default="MBWAY",
                       choices=["MBWAY", "MULTIBANCO"],
                       help="Método de pagamento")
    parser.add_argument("--transaction-id", default=None,
                       help="ID da transação (opcional)")
    parser.add_argument("--amount", type=float, default=10.00,
                       help="Valor do pagamento")
    parser.add_argument("--unencrypted", action="store_true",
                       help="Usar endpoint de teste sem encriptação")

    args = parser.parse_args()

    secret = os.getenv("SIBS_WEBHOOK_SECRET")
    if not secret and not args.unencrypted:
        print("[ERRO] SIBS_WEBHOOK_SECRET nao encontrado no .env")
        sys.exit(1)

    payload = create_sibs_webhook_payload(
        transaction_id=args.transaction_id,
        payment_status=args.status,
        payment_method=args.method,
        amount=args.amount
    )

    if args.unencrypted:
        success = test_webhook_unencrypted(args.url, payload)
    else:
        success = test_webhook(args.url, secret, payload)

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
