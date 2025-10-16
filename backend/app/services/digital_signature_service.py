"""
Digital Signature Service - Assinatura Digital Portuguesa
Integração com Chave Móvel Digital (CMD) e Cartão de Cidadão (CC)

NOTA IMPORTANTE:
Este serviço requer credenciais oficiais da AMA (Agência para a Modernização Administrativa).
Para ativar em produção, é necessário:
1. Registar a aplicação em https://www.autenticacao.gov.pt
2. Obter Client ID e Client Secret para CMD
3. Configurar variáveis de ambiente
"""

import requests
import hashlib
import base64
import os
from datetime import datetime
from typing import Dict, Optional, Tuple
from flask import current_app
from cryptography import x509
from cryptography.hazmat.primitives import hashes
from app.utils.error_handler import api_error_handler
from .letter_audit_service import LetterAuditService
from app.utils.logger import get_logger


logger = get_logger(__name__)


class DigitalSignatureService:
    """Serviço de assinatura digital com CMD e Cartão de Cidadão"""

    # Configurações CMD (Chave Móvel Digital)
    CMD_API_BASE_PROD = "https://cmd.autenticacao.gov.pt"
    CMD_API_BASE_PREPROD = "https://preprod.cmd.autenticacao.gov.pt"

    def __init__(self):
        """Inicializa o serviço"""
        self.cmd_client_id = os.getenv('CMD_CLIENT_ID')
        self.cmd_client_secret = os.getenv('CMD_CLIENT_SECRET')
        self.cmd_env = os.getenv('CMD_API_ENV', 'preprod')  # preprod ou production

        # Selecionar URL baseado no ambiente
        self.cmd_api_base = (
            self.CMD_API_BASE_PROD if self.cmd_env == 'production'
            else self.CMD_API_BASE_PREPROD
        )

        # Verificar se credenciais estão configuradas
        if not self.cmd_client_id or not self.cmd_client_secret:
            logger.warning(
                "⚠️  Credenciais CMD não configuradas! "
                "Assinatura digital não estará disponível."
            )

    # ============================================
    # CHAVE MÓVEL DIGITAL (CMD)
    # ============================================

    @api_error_handler
    def sign_with_cmd(
        self,
        pdf_path: str,
        user_phone: str,
        user_nif: str,
        reason: str = "Assinatura de Ofício Oficial",
        current_user: str = None
    ) -> Dict:
        """
        Inicia processo de assinatura com Chave Móvel Digital

        Args:
            pdf_path: Caminho do PDF a assinar
            user_phone: Número de telemóvel (+351XXXXXXXXX)
            user_nif: NIF do utilizador
            reason: Motivo da assinatura
            current_user: Utilizador atual (para auditoria)

        Returns:
            dict com:
            {
                'success': True,
                'request_id': '123abc',
                'status': 'pending',
                'message': 'PIN enviado para o telemóvel'
            }
        """
        if not self._check_cmd_credentials():
            return {
                'success': False,
                'error': 'Credenciais CMD não configuradas'
            }

        try:
            # 1. Gerar hash do documento
            doc_hash = self._generate_document_hash(pdf_path)
            logger.info(f"Hash do documento gerado: {doc_hash[:20]}...")

            # 2. Autenticar na API CMD
            access_token = self._cmd_authenticate()

            # 3. Iniciar processo de assinatura
            request_id = self._cmd_init_signature(
                access_token=access_token,
                user_phone=user_phone,
                user_nif=user_nif,
                doc_hash=doc_hash,
                reason=reason
            )

            # 4. Registar auditoria
            if current_user:
                LetterAuditService.log_action(
                    user=current_user,
                    action='LETTER_SIGN_CMD',
                    details={
                        'request_id': request_id,
                        'phone': user_phone[-4:],  # Apenas últimos 4 dígitos
                        'reason': reason
                    }
                )

            logger.info(f"Assinatura CMD iniciada: {request_id}")

            return {
                'success': True,
                'request_id': request_id,
                'status': 'pending',
                'message': 'PIN enviado para o telemóvel. Aguardando confirmação.'
            }

        except Exception as e:
            logger.error(f"Erro na assinatura CMD: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }

    def _check_cmd_credentials(self) -> bool:
        """Verifica se credenciais CMD estão configuradas"""
        return bool(self.cmd_client_id and self.cmd_client_secret)

    def _cmd_authenticate(self) -> str:
        """
        Obtém token de acesso à API CMD

        Returns:
            str: Access token
        """
        url = f"{self.cmd_api_base}/oauth/v2/token"

        response = requests.post(
            url,
            data={
                'grant_type': 'client_credentials',
                'client_id': self.cmd_client_id,
                'client_secret': self.cmd_client_secret
            },
            timeout=30
        )

        response.raise_for_status()
        return response.json()['access_token']

    def _cmd_init_signature(
        self,
        access_token: str,
        user_phone: str,
        user_nif: str,
        doc_hash: str,
        reason: str
    ) -> str:
        """
        Inicia processo de assinatura CMD

        Args:
            access_token: Token de autenticação
            user_phone: Número de telemóvel
            user_nif: NIF
            doc_hash: Hash do documento
            reason: Motivo da assinatura

        Returns:
            str: Request ID para acompanhar o processo
        """
        url = f"{self.cmd_api_base}/sign/init"

        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }

        payload = {
            'mobileNumber': user_phone,
            'nif': user_nif,
            'documentHash': doc_hash,
            'hashAlgorithm': 'SHA256',
            'signatureReason': reason,
            'applicationId': 'AINTAR_OFICIOS'
        }

        response = requests.post(
            url,
            headers=headers,
            json=payload,
            timeout=30
        )

        response.raise_for_status()
        return response.json()['requestId']

    @api_error_handler
    def cmd_check_signature_status(self, request_id: str) -> Dict:
        """
        Verifica estado da assinatura CMD

        Args:
            request_id: ID do pedido de assinatura

        Returns:
            dict com estado:
            {
                'status': 'pending|completed|expired|cancelled',
                'signature': '...',  # Se completed
                'certificate': '...'  # Se completed
            }
        """
        if not self._check_cmd_credentials():
            return {'status': 'error', 'error': 'Credenciais não configuradas'}

        try:
            access_token = self._cmd_authenticate()

            url = f"{self.cmd_api_base}/sign/status/{request_id}"
            headers = {'Authorization': f'Bearer {access_token}'}

            response = requests.get(url, headers=headers, timeout=30)
            response.raise_for_status()

            return response.json()

        except Exception as e:
            logger.error(f"Erro ao verificar estado CMD: {str(e)}")
            return {'status': 'error', 'error': str(e)}

    @api_error_handler
    def cmd_complete_signature(
        self,
        request_id: str,
        pdf_path: str,
        current_user: str = None
    ) -> str:
        """
        Completa assinatura CMD e aplica ao PDF

        Args:
            request_id: ID do pedido
            pdf_path: Caminho do PDF original
            current_user: Utilizador atual

        Returns:
            str: Caminho do PDF assinado
        """
        if not self._check_cmd_credentials():
            raise ValueError("Credenciais CMD não configuradas")

        try:
            # 1. Obter assinatura
            access_token = self._cmd_authenticate()

            url = f"{self.cmd_api_base}/sign/complete"
            headers = {'Authorization': f'Bearer {access_token}'}

            response = requests.post(
                url,
                headers=headers,
                json={'requestId': request_id},
                timeout=30
            )
            response.raise_for_status()

            signature_data = response.json()

            # 2. Aplicar assinatura ao PDF
            signed_path = self._apply_signature_to_pdf(
                pdf_path,
                signature_data['signature'],
                signature_data['certificate']
            )

            # 3. Registar auditoria
            if current_user:
                LetterAuditService.log_action(
                    user=current_user,
                    action='LETTER_SIGN_CMD',
                    details={
                        'request_id': request_id,
                        'status': 'completed',
                        'signed_file': signed_path
                    }
                )

            logger.info(f"Assinatura CMD concluída: {signed_path}")
            return signed_path

        except Exception as e:
            logger.error(f"Erro ao completar assinatura CMD: {str(e)}")
            raise

    # ============================================
    # CARTÃO DE CIDADÃO (CC)
    # ============================================

    @api_error_handler
    def sign_with_cc(
        self,
        pdf_path: str,
        certificate_pem: str,
        signature_value: str,
        reason: str = "Assinatura de Ofício Oficial",
        current_user: str = None
    ) -> str:
        """
        Assina PDF com Cartão de Cidadão

        NOTA: A assinatura real acontece no frontend (via middleware).
        O backend apenas valida e aplica ao PDF.

        Args:
            pdf_path: Caminho do PDF
            certificate_pem: Certificado em formato PEM
            signature_value: Valor da assinatura (calculado no frontend)
            reason: Motivo da assinatura
            current_user: Utilizador atual

        Returns:
            str: Caminho do PDF assinado
        """
        try:
            # 1. Validar certificado
            cert = x509.load_pem_x509_certificate(certificate_pem.encode())

            # 2. Verificar validade
            now = datetime.now()
            if not (cert.not_valid_before <= now <= cert.not_valid_after):
                raise ValueError("Certificado expirado ou ainda não válido")

            # 3. Aplicar assinatura ao PDF
            signed_path = self._apply_signature_to_pdf(
                pdf_path,
                signature_value,
                certificate_pem
            )

            # 4. Registar auditoria
            if current_user:
                LetterAuditService.log_action(
                    user=current_user,
                    action='LETTER_SIGN_CC',
                    details={
                        'reason': reason,
                        'signed_file': signed_path,
                        'certificate_valid_until': cert.not_valid_after.isoformat()
                    }
                )

            logger.info(f"Assinatura CC aplicada: {signed_path}")
            return signed_path

        except Exception as e:
            logger.error(f"Erro na assinatura CC: {str(e)}")
            raise

    # ============================================
    # FUNÇÕES AUXILIARES
    # ============================================

    def _generate_document_hash(self, pdf_path: str) -> str:
        """
        Gera hash SHA256 do documento

        Args:
            pdf_path: Caminho do PDF

        Returns:
            str: Hash em base64
        """
        sha256_hash = hashlib.sha256()

        with open(pdf_path, "rb") as f:
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)

        return base64.b64encode(sha256_hash.digest()).decode()

    def _apply_signature_to_pdf(
        self,
        pdf_path: str,
        signature: str,
        certificate: str
    ) -> str:
        """
        Aplica assinatura digital ao PDF

        NOTA: Implementação simplificada.
        Para produção, usar biblioteca como pyhanko ou endesive.

        Args:
            pdf_path: Caminho do PDF original
            signature: Assinatura digital
            certificate: Certificado

        Returns:
            str: Caminho do PDF assinado
        """
        # Por enquanto, retornar o mesmo caminho
        # TODO: Implementar assinatura real com pyhanko quando credenciais estiverem disponíveis

        logger.warning(
            "⚠️  Assinatura digital simulada! "
            "Implementar com pyhanko em produção."
        )

        # Criar novo caminho para PDF assinado
        output_path = pdf_path.replace('.pdf', '_signed.pdf')

        # Copiar ficheiro (placeholder)
        import shutil
        shutil.copy2(pdf_path, output_path)

        logger.info(f"PDF 'assinado' criado: {output_path}")
        return output_path

    @api_error_handler
    def validate_signature(self, pdf_path: str) -> Dict:
        """
        Valida assinatura digital num PDF

        Args:
            pdf_path: Caminho do PDF

        Returns:
            dict com informações da assinatura
        """
        # TODO: Implementar validação real
        logger.warning("Validação de assinatura não implementada")

        return {
            'is_valid': False,
            'message': 'Validação não implementada'
        }


# Variáveis de configuração necessárias
REQUIRED_ENV_VARS = """
# Adicionar ao ficheiro .env:

# Chave Móvel Digital (CMD)
CMD_CLIENT_ID=your_client_id_here
CMD_CLIENT_SECRET=your_client_secret_here
CMD_API_ENV=preprod  # ou 'production'
"""


if __name__ == "__main__":
    print("Digital Signature Service - Portugal")
    print("=" * 50)
    print("\n⚠️  ATENÇÃO:")
    print("Este serviço requer credenciais da AMA.")
    print("\nPara ativar:")
    print("1. Registar em https://www.autenticacao.gov.pt")
    print("2. Obter credenciais CMD")
    print("3. Configurar variáveis de ambiente")
    print("\nVariáveis necessárias:")
    print(REQUIRED_ENV_VARS)
