# routes/signature_routes.py
# Módulo de Assinatura Digital - Reutilizável para qualquer documento do projeto
# Suporta: Emissões (Ofícios, Notificações, etc.), e extensível para outros tipos
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.permissions_decorator import require_permission
from app.utils.logger import get_logger
from app.utils.utils import db_session_manager
from app.utils.error_handler import InvalidSessionError
import os
import json

logger = get_logger(__name__)

signature_bp = Blueprint('signature', __name__, url_prefix='/api/v1/signature')

# Permissão reutilizada das emissões
PERMISSION_SIGN = 220


def _get_pdf_path(document_type: str, document_id: int, current_user: str):
    """
    Resolve o caminho do PDF com base no tipo e ID do documento.
    Extensível: adicionar novos tipos aqui quando necessário.
    """
    if document_type == 'emission':
        from app.services.emissions import EmissionCoreService
        doc = EmissionCoreService.get_emission(current_user, document_id)

        if not doc:
            return None, 'Emissão não encontrada'

        if not doc.get('filename'):
            return None, 'É necessário gerar o PDF antes de assinar'

        if doc.get('status') == 'signed':
            return None, 'Este documento já foi assinado'

        pdf_dir = os.path.join(os.path.dirname(__file__), '../generated_pdfs')
        file_path = os.path.join(pdf_dir, doc['filename'])

        if not os.path.exists(file_path):
            return None, 'Ficheiro PDF não encontrado no servidor'

        return file_path, None

    # Adicionar outros tipos de documento aqui no futuro:
    # elif document_type == 'contract':
    #     ...

    return None, f'Tipo de documento não suportado: {document_type}'


def _mark_as_signed(document_type: str, document_id: int, current_user: str, method: str, extra_data: dict, signed_filename: str):
    """
    Atualiza o estado do documento para 'assinado' na base de dados.
    Extensível: adicionar novos tipos aqui quando necessário.
    """
    from app import db
    from sqlalchemy import text

    if document_type == 'emission':
        update_sql = text("""
            UPDATE vbf_letter
            SET ts_letterstatus = 3,
                sign_client = :sign_client,
                sign_time = NOW(),
                sign_data = :sign_data,
                filename = :filename
            WHERE pk = :pk
        """)

        db.session.execute(update_sql, {
            'pk': document_id,
            'sign_client': current_user,
            'sign_data': json.dumps({'method': method, **extra_data}),
            'filename': signed_filename
        })
        db.session.commit()
        return True

    return False


# =============================================================================
# HASH DO DOCUMENTO (necessário para assinatura com Cartão de Cidadão)
# =============================================================================

@signature_bp.route('/hash', methods=['GET'])
@jwt_required()
@require_permission(PERMISSION_SIGN)
def get_document_hash():
    """
    Obtém hash SHA256 do PDF para assinatura com Cartão de Cidadão
    GET /signature/hash?document_type=emission&document_id=123
    """
    try:
        current_user = get_jwt_identity()
        document_type = request.args.get('document_type')
        document_id = request.args.get('document_id', type=int)

        if not document_type or not document_id:
            return jsonify({'success': False, 'message': 'document_type e document_id são obrigatórios'}), 400

        with db_session_manager(current_user):
            file_path, error = _get_pdf_path(document_type, document_id, current_user)
            if error:
                return jsonify({'success': False, 'message': error}), 400 if 'necessário' in error or 'já foi' in error else 404

            import hashlib, base64
            sha256 = hashlib.sha256()
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b''):
                    sha256.update(chunk)

            doc_hash = base64.b64encode(sha256.digest()).decode()

            return jsonify({
                'success': True,
                'hash': doc_hash,
                'algorithm': 'SHA256'
            }), 200

    except InvalidSessionError as e:
        return jsonify({'success': False, 'message': str(e)}), 401
    except Exception as e:
        logger.error(f'[SIGNATURE] Erro ao obter hash: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 500


# =============================================================================
# CHAVE MÓVEL DIGITAL (CMD)
# =============================================================================

@signature_bp.route('/cmd/init', methods=['POST'])
@jwt_required()
@require_permission(PERMISSION_SIGN)
def init_cmd_signature():
    """
    Inicia processo de assinatura com Chave Móvel Digital
    POST /signature/cmd/init
    Body: {document_type, document_id, phone, nif, reason}
    """
    try:
        current_user = get_jwt_identity()
        data = request.get_json()

        required = ['document_type', 'document_id', 'phone', 'nif']
        missing = [f for f in required if not data.get(f)]
        if missing:
            return jsonify({'success': False, 'message': f'Campos obrigatórios: {", ".join(missing)}'}), 400

        with db_session_manager(current_user):
            file_path, error = _get_pdf_path(data['document_type'], data['document_id'], current_user)
            if error:
                return jsonify({'success': False, 'message': error}), 400 if 'necessário' in error or 'já foi' in error else 404

            from app.services.digital_signature_service import DigitalSignatureService
            sig_service = DigitalSignatureService()

            result = sig_service.sign_with_cmd(
                pdf_path=file_path,
                user_phone=data['phone'],
                user_nif=data['nif'],
                reason=data.get('reason', 'Assinatura de Documento Oficial'),
                current_user=current_user
            )

            return jsonify(result), 200 if result.get('success') else 400

    except InvalidSessionError as e:
        return jsonify({'success': False, 'message': str(e)}), 401
    except Exception as e:
        logger.error(f'[SIGNATURE] Erro ao iniciar CMD: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 500


@signature_bp.route('/cmd/status/<string:request_id>', methods=['GET'])
@jwt_required()
@require_permission(PERMISSION_SIGN)
def check_cmd_status(request_id):
    """
    Verifica estado da assinatura CMD
    GET /signature/cmd/status/<request_id>
    """
    try:
        from app.services.digital_signature_service import DigitalSignatureService
        sig_service = DigitalSignatureService()
        result = sig_service.cmd_check_signature_status(request_id)
        return jsonify(result), 200

    except InvalidSessionError as e:
        return jsonify({'success': False, 'message': str(e)}), 401
    except Exception as e:
        logger.error(f'[SIGNATURE] Erro ao verificar estado CMD: {str(e)}')
        return jsonify({'success': False, 'message': str(e)}), 500


@signature_bp.route('/cmd/complete', methods=['POST'])
@jwt_required()
@require_permission(PERMISSION_SIGN)
def complete_cmd_signature():
    """
    Completa assinatura CMD e atualiza estado do documento
    POST /signature/cmd/complete
    Body: {document_type, document_id, request_id}
    """
    try:
        current_user = get_jwt_identity()
        data = request.get_json()

        required = ['document_type', 'document_id', 'request_id']
        missing = [f for f in required if not data.get(f)]
        if missing:
            return jsonify({'success': False, 'message': f'Campos obrigatórios: {", ".join(missing)}'}), 400

        with db_session_manager(current_user):
            file_path, error = _get_pdf_path(data['document_type'], data['document_id'], current_user)
            if error:
                return jsonify({'success': False, 'message': error}), 404

            from app.services.digital_signature_service import DigitalSignatureService
            sig_service = DigitalSignatureService()

            signed_path = sig_service.cmd_complete_signature(
                request_id=data['request_id'],
                pdf_path=file_path,
                current_user=current_user
            )

            signed_filename = os.path.basename(signed_path)

            _mark_as_signed(
                document_type=data['document_type'],
                document_id=data['document_id'],
                current_user=current_user,
                method='CMD',
                extra_data={'request_id': data['request_id']},
                signed_filename=signed_filename
            )

            logger.info(f'[SIGNATURE] {data["document_type"]} {data["document_id"]} assinado via CMD por {current_user}')

            return jsonify({
                'success': True,
                'message': 'Documento assinado com sucesso',
                'data': {
                    'document_type': data['document_type'],
                    'document_id': data['document_id'],
                    'signed_filename': signed_filename,
                    'method': 'CMD'
                }
            }), 200

    except InvalidSessionError as e:
        return jsonify({'success': False, 'message': str(e)}), 401
    except Exception as e:
        logger.error(f'[SIGNATURE] Erro ao completar CMD: {str(e)}')
        from app import db
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


# =============================================================================
# CARTÃO DE CIDADÃO (CC)
# =============================================================================

@signature_bp.route('/cc', methods=['POST'])
@jwt_required()
@require_permission(PERMISSION_SIGN)
def sign_with_cc():
    """
    Assina documento com Cartão de Cidadão
    POST /signature/cc
    Body: {document_type, document_id, certificate, signature, reason}
    """
    try:
        current_user = get_jwt_identity()
        data = request.get_json()

        required = ['document_type', 'document_id', 'certificate', 'signature']
        missing = [f for f in required if not data.get(f)]
        if missing:
            return jsonify({'success': False, 'message': f'Campos obrigatórios: {", ".join(missing)}'}), 400

        with db_session_manager(current_user):
            file_path, error = _get_pdf_path(data['document_type'], data['document_id'], current_user)
            if error:
                return jsonify({'success': False, 'message': error}), 400 if 'necessário' in error or 'já foi' in error else 404

            from app.services.digital_signature_service import DigitalSignatureService
            sig_service = DigitalSignatureService()

            signed_path = sig_service.sign_with_cc(
                pdf_path=file_path,
                certificate_pem=data['certificate'],
                signature_value=data['signature'],
                reason=data.get('reason', 'Assinatura de Documento Oficial'),
                current_user=current_user
            )

            signed_filename = os.path.basename(signed_path)

            _mark_as_signed(
                document_type=data['document_type'],
                document_id=data['document_id'],
                current_user=current_user,
                method='CC',
                extra_data={},
                signed_filename=signed_filename
            )

            logger.info(f'[SIGNATURE] {data["document_type"]} {data["document_id"]} assinado via CC por {current_user}')

            return jsonify({
                'success': True,
                'message': 'Documento assinado com sucesso',
                'data': {
                    'document_type': data['document_type'],
                    'document_id': data['document_id'],
                    'signed_filename': signed_filename,
                    'method': 'CC'
                }
            }), 200

    except InvalidSessionError as e:
        return jsonify({'success': False, 'message': str(e)}), 401
    except Exception as e:
        logger.error(f'[SIGNATURE] Erro ao assinar com CC: {str(e)}')
        from app import db
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500
