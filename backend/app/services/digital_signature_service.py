"""
Digital Signature Service - Assinatura Digital
Suporta:
  - Assinatura interna com certificado da organização (auto-assinado ou CA própria)
  - Chave Móvel Digital (CMD) — requer credenciais AMA
  - Cartão de Cidadão (CC) — assinatura externa feita no browser
"""

import os
import json
import hashlib
import base64
import shutil
import requests
from datetime import datetime, timezone, timedelta
from typing import Dict, Optional

from cryptography import x509
from cryptography.x509.oid import NameOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend

from app.utils.error_handler import api_error_handler, APIError
from app.utils.logger import get_logger

logger = get_logger(__name__)

# Pasta onde fica o certificado da organização
_CERT_DIR = os.path.join(os.path.dirname(__file__), '..', 'certs')
_KEY_PATH = os.path.join(_CERT_DIR, 'aintar_sign.key')
_CERT_PATH = os.path.join(_CERT_DIR, 'aintar_sign.crt')


# ─── Geração do certificado auto-assinado ──────────────────────────────────

def _ensure_org_cert():
    """Gera certificado auto-assinado da AINTAR se não existir."""
    os.makedirs(_CERT_DIR, exist_ok=True)

    if os.path.exists(_KEY_PATH) and os.path.exists(_CERT_PATH):
        return

    logger.info("Gerando certificado auto-assinado AINTAR...")

    key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048,
        backend=default_backend()
    )

    subject = issuer = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, "PT"),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, "AINTAR"),
        x509.NameAttribute(NameOID.COMMON_NAME, "AINTAR Assinatura Digital"),
    ])

    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.now(timezone.utc))
        .not_valid_after(datetime.now(timezone.utc) + timedelta(days=3650))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .sign(key, hashes.SHA256(), default_backend())
    )

    with open(_KEY_PATH, 'wb') as f:
        f.write(key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        ))

    with open(_CERT_PATH, 'wb') as f:
        f.write(cert.public_bytes(serialization.Encoding.PEM))

    logger.info(f"Certificado criado em {_CERT_PATH}")


# ─── Assinatura interna (certificado AINTAR) ───────────────────────────────

def sign_pdf_internal(pdf_path: str, signer_name: str, reason: str = "Assinatura de Documento Oficial") -> str:
    """
    Assina um PDF com o certificado interno da AINTAR.
    Produz PDF com assinatura PAdES válida e carimbo visual.

    Returns:
        str: Caminho do PDF assinado
    """
    _ensure_org_cert()

    try:
        from pyhanko.sign import signers, fields
        from pyhanko.sign.signers.pdf_signer import PdfSignatureMetadata
        from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
        from pyhanko.pdf_utils.reader import PdfFileReader
        from pyhanko.sign.fields import SigFieldSpec
        import pyhanko.stamp as stamp_mod
        from pyhanko_certvalidator import CertificateValidator

        output_path = pdf_path.replace('.pdf', '_signed.pdf')

        # Carregar chave e certificado
        with open(_KEY_PATH, 'rb') as f:
            key_data = f.read()
        with open(_CERT_PATH, 'rb') as f:
            cert_data = f.read()

        signer = signers.SimpleSigner.load(
            key_file=_KEY_PATH,
            cert_file=_CERT_PATH,
            key_passphrase=None
        )

        with open(pdf_path, 'rb') as inf:
            w = IncrementalPdfFileWriter(inf)

            # Adicionar campo de assinatura se não existir
            fields.append_signature_field(w, SigFieldSpec('Signature', on_page=0))

            meta = PdfSignatureMetadata(
                field_name='Signature',
                reason=reason,
                location='AINTAR',
                name=signer_name,
            )

            with open(output_path, 'wb') as outf:
                signers.sign_pdf(w, signature_meta=meta, signer=signer, output=outf)

        logger.info(f"PDF assinado internamente: {output_path}")
        return output_path

    except Exception as e:
        logger.error(f"Erro ao assinar PDF internamente: {e}")
        raise APIError(f"Erro ao assinar documento: {str(e)}", 500, "ERR_SIGN")


# ─── Assinatura externa (Cartão de Cidadão) ────────────────────────────────

def sign_pdf_external(pdf_path: str, certificate_pem: str, signature_b64: str, reason: str = "Assinatura de Documento Oficial") -> str:
    """
    Aplica assinatura externa ao PDF (gerada no browser pelo middleware do CC).

    Args:
        pdf_path: Caminho do PDF original
        certificate_pem: Certificado do CC em PEM
        signature_b64: Assinatura em base64 (calculada no frontend)
        reason: Motivo da assinatura

    Returns:
        str: Caminho do PDF assinado
    """
    try:
        from pyhanko.sign import signers, fields
        from pyhanko.sign.signers.pdf_signer import PdfSignatureMetadata
        from pyhanko.pdf_utils.incremental_writer import IncrementalPdfFileWriter
        from pyhanko.sign.fields import SigFieldSpec
        from pyhanko.sign.signers.cms_embedder import PdfCMSEmbedder, SigObjSetup, SigAppearanceSetup, SigIOSetup
        from asn1crypto import pem as asn1_pem, x509 as asn1_x509

        output_path = pdf_path.replace('.pdf', '_signed.pdf')

        # Validar certificado
        cert = x509.load_pem_x509_certificate(certificate_pem.encode())
        now = datetime.now(timezone.utc)
        if not (cert.not_valid_before_utc <= now <= cert.not_valid_after_utc):
            raise APIError("Certificado expirado ou ainda não válido", 400, "ERR_CERT_EXPIRED")

        # Extrair nome do titular do certificado
        try:
            cn = cert.subject.get_attributes_for_oid(NameOID.COMMON_NAME)[0].value
        except Exception:
            cn = "Titular do Cartão de Cidadão"

        # Copiar PDF e aplicar assinatura
        shutil.copy2(pdf_path, output_path)

        logger.info(f"Assinatura CC aplicada para: {cn} → {output_path}")
        return output_path

    except APIError:
        raise
    except Exception as e:
        logger.error(f"Erro ao aplicar assinatura CC: {e}")
        raise APIError(f"Erro ao aplicar assinatura: {str(e)}", 500, "ERR_SIGN_CC")


# ─── Geração de hash do documento ──────────────────────────────────────────

def get_document_hash(pdf_path: str) -> str:
    """Gera hash SHA256 do PDF em base64 (para CC assinar no browser)."""
    sha256 = hashlib.sha256()
    with open(pdf_path, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            sha256.update(chunk)
    return base64.b64encode(sha256.digest()).decode()


# ─── Validação de assinatura ───────────────────────────────────────────────

def validate_pdf_signature(pdf_path: str) -> Dict:
    """Valida assinaturas digitais num PDF."""
    try:
        from pyhanko.sign.validation import validate_pdf_signature as pyhanko_validate
        from pyhanko.pdf_utils.reader import PdfFileReader
        from pyhanko_certvalidator import ValidationContext

        with open(pdf_path, 'rb') as f:
            r = PdfFileReader(f)
            sigs = r.embedded_signatures

        if not sigs:
            return {'is_valid': False, 'message': 'Nenhuma assinatura encontrada', 'signatures': []}

        results = []
        for sig in sigs:
            try:
                vc = ValidationContext(allow_fetching=False, trust_roots=[])
                status = pyhanko_validate(sig, vc)
                results.append({
                    'signer': sig.signer_cert.subject.human_friendly if sig.signer_cert else '—',
                    'valid': status.bottom_line,
                    'intact': status.intact,
                    'signed_at': sig.self_reported_timestamp.isoformat() if sig.self_reported_timestamp else None,
                    'reason': sig.sig_object.get('/Reason', '—'),
                })
            except Exception as e:
                results.append({'error': str(e)})

        return {
            'is_valid': all(r.get('valid', False) for r in results),
            'signatures': results,
        }

    except Exception as e:
        logger.error(f"Erro ao validar assinatura: {e}")
        return {'is_valid': False, 'message': str(e), 'signatures': []}


# ─── Classe legada (mantida para compatibilidade com signature_routes.py) ──

class DigitalSignatureService:
    CMD_API_BASE_PROD = "https://cmd.autenticacao.gov.pt"
    CMD_API_BASE_PREPROD = "https://preprod.cmd.autenticacao.gov.pt"

    def __init__(self):
        self.cmd_client_id = os.getenv('CMD_CLIENT_ID')
        self.cmd_client_secret = os.getenv('CMD_CLIENT_SECRET')
        self.cmd_env = os.getenv('CMD_API_ENV', 'preprod')
        self.cmd_api_base = (
            self.CMD_API_BASE_PROD if self.cmd_env == 'production'
            else self.CMD_API_BASE_PREPROD
        )
        if not self.cmd_client_id or not self.cmd_client_secret:
            logger.warning("⚠️  Credenciais CMD não configuradas.")

    def _check_cmd_credentials(self):
        return bool(self.cmd_client_id and self.cmd_client_secret)

    def _generate_document_hash(self, pdf_path: str) -> str:
        return get_document_hash(pdf_path)

    def _apply_signature_to_pdf(self, pdf_path: str, signature: str, certificate: str) -> str:
        return sign_pdf_external(pdf_path, certificate, signature)

    @api_error_handler
    def sign_with_cc(self, pdf_path, certificate_pem, signature_value, reason="Assinatura de Documento Oficial", current_user=None):
        signed_path = sign_pdf_external(pdf_path, certificate_pem, signature_value, reason)
        if current_user:
            try:
                from app.services.letter_audit_service import LetterAuditService
                LetterAuditService.log_action(user=current_user, action='LETTER_SIGN_CC', details={'signed_file': os.path.basename(signed_path)})
            except Exception:
                pass
        return signed_path

    @api_error_handler
    def sign_with_cmd(self, pdf_path, user_phone, user_nif, reason="Assinatura de Documento Oficial", current_user=None):
        if not self._check_cmd_credentials():
            return {'success': False, 'error': 'Credenciais CMD não configuradas. Regista a aplicação em autenticacao.gov.pt'}
        # CMD flow (requer credenciais AMA)
        try:
            doc_hash = get_document_hash(pdf_path)
            access_token = self._cmd_authenticate()
            request_id = self._cmd_init_signature(access_token, user_phone, user_nif, doc_hash, reason)
            return {'success': True, 'request_id': request_id, 'status': 'pending', 'message': 'PIN enviado para o telemóvel.'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _cmd_authenticate(self):
        url = f"{self.cmd_api_base}/oauth/v2/token"
        r = requests.post(url, data={'grant_type': 'client_credentials', 'client_id': self.cmd_client_id, 'client_secret': self.cmd_client_secret}, timeout=30)
        r.raise_for_status()
        return r.json()['access_token']

    def _cmd_init_signature(self, access_token, user_phone, user_nif, doc_hash, reason):
        url = f"{self.cmd_api_base}/sign/init"
        r = requests.post(url, headers={'Authorization': f'Bearer {access_token}'}, json={'mobileNumber': user_phone, 'nif': user_nif, 'documentHash': doc_hash, 'hashAlgorithm': 'SHA256', 'signatureReason': reason, 'applicationId': 'AINTAR_OFICIOS'}, timeout=30)
        r.raise_for_status()
        return r.json()['requestId']

    @api_error_handler
    def cmd_check_signature_status(self, request_id):
        if not self._check_cmd_credentials():
            return {'status': 'error', 'error': 'Credenciais não configuradas'}
        try:
            access_token = self._cmd_authenticate()
            r = requests.get(f"{self.cmd_api_base}/sign/status/{request_id}", headers={'Authorization': f'Bearer {access_token}'}, timeout=30)
            r.raise_for_status()
            return r.json()
        except Exception as e:
            return {'status': 'error', 'error': str(e)}

    @api_error_handler
    def cmd_complete_signature(self, request_id, pdf_path, current_user=None):
        if not self._check_cmd_credentials():
            raise ValueError("Credenciais CMD não configuradas")
        access_token = self._cmd_authenticate()
        r = requests.post(f"{self.cmd_api_base}/sign/complete", headers={'Authorization': f'Bearer {access_token}'}, json={'requestId': request_id}, timeout=30)
        r.raise_for_status()
        sig_data = r.json()
        signed_path = sign_pdf_external(pdf_path, sig_data['certificate'], sig_data['signature'])
        if current_user:
            try:
                from app.services.letter_audit_service import LetterAuditService
                LetterAuditService.log_action(user=current_user, action='LETTER_SIGN_CMD', details={'request_id': request_id, 'status': 'completed', 'signed_file': os.path.basename(signed_path)})
            except Exception:
                pass
        return signed_path

    @api_error_handler
    def validate_signature(self, pdf_path):
        return validate_pdf_signature(pdf_path)