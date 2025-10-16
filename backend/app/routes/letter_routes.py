from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.permissions_decorator import require_permission
from app.utils.error_handler import api_error_handler
from ..services.letter_service import (
    create_letter, get_letter, update_letter, list_letters,
    create_letterstore, get_letterstore, list_letterstores,
    generate_letter_document, delete_letter, generate_free_letter_document
)
from ..services.template_service import TemplateService
import os
import logging
from app.utils.logger import get_logger

logger = get_logger(__name__)

bp = Blueprint('oficios', __name__)


@bp.route('/letters', methods=['POST'])
@jwt_required()
@require_permission(220)  # letters.manage
@api_error_handler
def create_letter_route():
    data = request.json
    current_user = get_jwt_identity()
    result = create_letter(data, current_user)
    return jsonify(result), 201


@bp.route('/letters/<int:letter_id>', methods=['GET'])
@jwt_required()
@require_permission(220)  # letters.manage
@api_error_handler
def get_letter_route(letter_id):
    current_user = get_jwt_identity()
    result = get_letter(letter_id, current_user)
    return jsonify(result), 200


@bp.route('/letters/<int:letter_id>', methods=['PUT'])
@jwt_required()
@require_permission(220)  # letters.manage
@api_error_handler
def update_letter_route(letter_id):
    data = request.json
    current_user = get_jwt_identity()
    result = update_letter(letter_id, data, current_user)
    return jsonify(result), 200


@bp.route('/letters/<int:letter_id>', methods=['DELETE'])
@jwt_required()
@require_permission(220)  # letters.manage
@api_error_handler
def delete_letter_route(letter_id):
    current_user = get_jwt_identity()
    result = delete_letter(letter_id, current_user)
    return jsonify(result), 200


@bp.route('/letters', methods=['GET'])
@jwt_required()
@require_permission(220)  # letters.manage
@api_error_handler
def list_letters_route():
    # Tenta obter filtros do query string
    filters = request.args.to_dict()
    # Se não houver filtros no query string, tenta obter do body JSON
    if not filters and request.is_json:
        filters = request.json or {}
    # Processa os filtros
    processed_filters = {}
    if 'tt_doctype' in filters:
        try:
            processed_filters['tt_doctype'] = int(filters['tt_doctype'])
        except ValueError:
            return jsonify({"error": "tt_doctype deve ser um inteiro"}), 400
    if 'active' in filters:
        try:
            processed_filters['active'] = int(filters['active'])
        except ValueError:
            return jsonify({"error": "active deve ser um inteiro"}), 400
    current_user = get_jwt_identity()
    result = list_letters(processed_filters, current_user)
    return jsonify(result), 200


@bp.route('/letterstores', methods=['POST'])
@jwt_required()
@require_permission(220)  # letters.manage
@api_error_handler
def create_letterstore_route():
    data = request.json
    current_user = get_jwt_identity()
    result = create_letterstore(data, current_user)
    return jsonify(result), 201


@bp.route('/letterstores/<int:letterstore_id>', methods=['GET'])
@jwt_required()
@require_permission(220)  # letters.manage
@api_error_handler
def get_letterstore_route(letterstore_id):
    current_user = get_jwt_identity()
    result = get_letterstore(letterstore_id, current_user)
    return jsonify(result), 200


@bp.route('/letterstores', methods=['GET'])
@jwt_required()
@require_permission(220)  # letters.manage
@api_error_handler
def list_letterstores_route():
    current_user = get_jwt_identity()
    # logging.info(f"Listing letterstores for user: {current_user}")
    result = list_letterstores(current_user)
    # logging.info(f"Letterstores result: {result}")
    return jsonify(result), 200


@bp.route('/letters/<int:letter_id>/generate', methods=['POST'])
@jwt_required()
@require_permission(220)  # letters.manage
@api_error_handler
def generate_letter_document_route(letter_id):
    document_data = request.json
    current_user = get_jwt_identity()

    required_fields = [
        'NOME', 'MORADA', 'PORTA', 'CODIGO_POSTAL', 'LOCALIDADE', 'DATA',
        'NUMERO_PEDIDO', 'DATA_PEDIDO', 'NIF',
        'MORADA_PEDIDO', 'PORTA_PEDIDO', 'FREGUESIA_PEDIDO',
        'POSTAL_CODE_PEDIDO', 'LOCALIDADE_PEDIDO'
    ]

    for field in required_fields:
        if field not in document_data:
            return jsonify({'error': f'Campo obrigatório ausente: {field}'}), 400

    result = generate_letter_document(
        letter_id, document_data, current_user, )

    if 'error' in result:
        return jsonify(result), 400

    return send_file(
        result['file_path'],
        as_attachment=True,
        download_name=result['filename'],
        mimetype='application/pdf'
    )


@bp.route('/letters/view/<int:letterstore_id>', methods=['GET'])
@jwt_required()
@require_permission(220)  # letters.manage
@api_error_handler
def view_letter(letterstore_id):
    current_user = get_jwt_identity()
    letterstore = get_letterstore(letterstore_id, current_user)

    # O get_letterstore já lança ResourceNotFoundError, que é tratado pelo @api_error_handler

    # Construir o caminho do arquivo
    file_path = os.path.join(
        os.path.dirname(__file__),
        '..',
        '..',
        'temp',
        letterstore['filename']
    )

    if not os.path.exists(file_path):
        return jsonify({'error': 'Arquivo não encontrado no sistema de ficheiros'}), 404

    # Enviar o arquivo para visualização com os headers corretos
    response = send_file(
        file_path,
        mimetype='application/pdf',
        as_attachment=False,
        download_name=letterstore['filename']
    )

    # Adicionar headers específicos para visualização inline do PDF
    response.headers["Content-Type"] = "application/pdf"
    response.headers["Content-Disposition"] = "inline; filename=%s" % letterstore['filename']
    return response


@bp.route('/letters/download/<int:letterstore_id>', methods=['GET'])
@jwt_required()
@require_permission(220)  # letters.manage
@api_error_handler
def download_letter(letterstore_id):
    current_user = get_jwt_identity()
    letterstore = get_letterstore(letterstore_id, current_user)

    file_path = os.path.join(
        os.path.dirname(__file__), '..', '..', 'temp', letterstore['filename']
    )

    if not os.path.exists(file_path):
        return jsonify({'error': 'Arquivo não encontrado no sistema de ficheiros'}), 404

    return send_file(
        file_path,
        mimetype='application/pdf',
        as_attachment=True,
        download_name=letterstore['filename']
    )


@bp.route('/letters/generate-free', methods=['POST'])
@jwt_required()
@require_permission(220)  # letters.manage
@api_error_handler
def generate_free_letter_document_route():
    document_data = request.json
    required_fields = [
        'NOME', 'MORADA', 'PORTA', 'CODIGO_POSTAL', 'LOCALIDADE',
        'letterBody'  # Campo adicional para o corpo do ofício livre
    ]

    for field in required_fields:
        if field not in document_data:
            return jsonify({'error': f'Campo obrigatório ausente: {field}'}), 400

    current_user = get_jwt_identity()
    result = generate_free_letter_document(document_data, current_user)

    if 'error' in result:
        return jsonify(result), 400

    return send_file(
        result['file_path'],
        as_attachment=True,
        download_name=result['filename'],
        mimetype='application/pdf'
    )

# ============================================
# ADICIONAR AO FINAL DE letter_routes.py
# ============================================

# NOVAS ROTAS - Variáveis e Preview

@bp.route('/letters/variables', methods=['GET'])
@jwt_required()
@require_permission(220)
@api_error_handler
def get_available_variables():
    """Retorna todas as variáveis disponíveis para templates"""
    variables = TemplateService.get_available_variables()
    return jsonify(variables), 200


@bp.route('/letters/validate-template', methods=['POST'])
@jwt_required()
@require_permission(220)
@api_error_handler
def validate_template():
    """Valida um template de ofício"""
    data = request.json
    template_string = data.get('template', '')

    if not template_string:
        return jsonify({'error': 'Template não fornecido'}), 400

    result = TemplateService.validate_template(template_string)
    return jsonify(result), 200


@bp.route('/letters/<int:letter_id>/preview', methods=['POST'])
@jwt_required()
@require_permission(220)
@api_error_handler
def preview_letter(letter_id):
    """
    Gera preview do ofício sem salvar na base de dados
    """
    from ..services.file_service import FileService, BaseLetterTemplate, LetterDocument
    import tempfile

    document_data = request.json
    current_user = get_jwt_identity()

    # Obter template do ofício
    letter, _ = get_letter(letter_id, current_user)
    if not letter:
        return jsonify({'error': 'Modelo de ofício não encontrado'}), 404

    # Adicionar versão e número temporário
    document_data['VS_M'] = f'v{letter.get("version", "1.0")}'
    document_data['NUMERO_OFICIO'] = 'PREVIEW-001'

    # Renderizar template
    body_template = letter.get('body', '')
    try:
        body_content = TemplateService.render_template(body_template, document_data)
    except Exception as e:
        return jsonify({
            'error': 'Erro ao renderizar template',
            'details': str(e)
        }), 400

    document_data['BODY'] = body_content

    # Gerar PDF temporário
    try:
        # Criar arquivo temporário
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix='.pdf',
            prefix='preview_'
        ) as temp_file:
            temp_path = temp_file.name

        # Gerar PDF
        template = BaseLetterTemplate(temp_path)
        letter_doc = LetterDocument(template)
        elements = letter_doc.create_content(document_data)
        template.build_letter(elements, data=document_data)

        # Enviar arquivo
        response = send_file(
            temp_path,
            mimetype='application/pdf',
            as_attachment=False,
            download_name='preview.pdf'
        )

        # Agendar remoção do arquivo temporário após envio
        @response.call_on_close
        def cleanup():
            try:
                os.unlink(temp_path)
            except:
                pass

        return response

    except Exception as e:
        logging.error(f"Erro ao gerar preview: {str(e)}")
        return jsonify({
            'error': 'Erro ao gerar preview',
            'details': str(e)
        }), 500


# ============================================
# ROTAS ADMINISTRATIVAS - File Cleanup
# ============================================

@bp.route('/admin/cleanup/temp', methods=['POST'])
@jwt_required()
@require_permission(220)  # Requer permissão de gestão
@api_error_handler
def cleanup_temp_files():
    """Remove ficheiros temporários antigos"""
    from ..services.file_cleanup_service import FileCleanupService

    data = request.json or {}
    days_old = data.get('days_old', 7)
    dry_run = data.get('dry_run', False)

    result = FileCleanupService.cleanup_temp_files(days_old=days_old, dry_run=dry_run)
    return jsonify(result), 200


@bp.route('/admin/storage/stats', methods=['GET'])
@jwt_required()
@require_permission(220)
@api_error_handler
def get_storage_stats():
    """Retorna estatísticas de armazenamento"""
    from ..services.file_cleanup_service import FileCleanupService

    stats = FileCleanupService.get_storage_statistics()
    return jsonify(stats), 200


@bp.route('/admin/letters/organize', methods=['POST'])
@jwt_required()
@require_permission(220)
@api_error_handler
def organize_letters():
    """Organiza ofícios por ano/mês"""
    from ..services.file_cleanup_service import FileCleanupService

    result = FileCleanupService.organize_letters_by_date()
    return jsonify(result), 200


@bp.route('/admin/letters/archive', methods=['POST'])
@jwt_required()
@require_permission(220)
@api_error_handler
def archive_old_letters():
    """Arquiva ofícios antigos"""
    from ..services.file_cleanup_service import FileCleanupService

    data = request.json or {}
    years_old = data.get('years_old', 2)

    result = FileCleanupService.archive_old_letters(years_old=years_old)
    return jsonify(result), 200


# ============================================
# ROTAS - Letter Numbering
# ============================================

@bp.route('/admin/numbering/stats/<int:year>', methods=['GET'])
@jwt_required()
@require_permission(220)
@api_error_handler
def get_numbering_stats(year):
    """Retorna estatísticas de numeração de um ano"""
    from ..services.letter_numbering_service import LetterNumberingService

    current_user = get_jwt_identity()
    stats = LetterNumberingService.get_year_statistics(year=year, current_user=current_user)
    return jsonify(stats), 200


@bp.route('/admin/numbering/validate', methods=['POST'])
@jwt_required()
@require_permission(220)
@api_error_handler
def validate_letter_number():
    """Valida um número de ofício"""
    from ..services.letter_numbering_service import LetterNumberingService

    data = request.json
    number = data.get('number', '')

    try:
        is_valid = LetterNumberingService.validate_number(number)
        if is_valid:
            parsed = LetterNumberingService.parse_number(number)
            return jsonify({
                'valid': True,
                'parsed': parsed
            }), 200
        else:
            return jsonify({
                'valid': False,
                'error': 'Formato inválido'
            }), 400
    except Exception as e:
        return jsonify({
            'valid': False,
            'error': str(e)
        }), 400


# ============================================
# ROTAS - Auditoria
# ============================================

@bp.route('/admin/audit/user/<string:user>', methods=['GET'])
@jwt_required()
@require_permission(220)
@api_error_handler
def get_user_audit_history(user):
    """Histórico de atividades de um utilizador"""
    from ..services.letter_audit_service import LetterAuditService
    from datetime import datetime

    current_user = get_jwt_identity()

    # Parâmetros opcionais
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    action_type = request.args.get('action_type')
    limit = int(request.args.get('limit', 100))

    # Converter datas se fornecidas
    if start_date:
        start_date = datetime.fromisoformat(start_date)
    if end_date:
        end_date = datetime.fromisoformat(end_date)

    activities = LetterAuditService.get_user_activity(
        user=user,
        start_date=start_date,
        end_date=end_date,
        action_type=action_type,
        limit=limit,
        current_user=current_user
    )

    return jsonify(activities), 200


@bp.route('/admin/audit/letter/<int:letter_id>', methods=['GET'])
@jwt_required()
@require_permission(220)
@api_error_handler
def get_letter_audit_history(letter_id):
    """Histórico de um template de ofício"""
    from ..services.letter_audit_service import LetterAuditService

    current_user = get_jwt_identity()
    history = LetterAuditService.get_letter_history(
        letter_id=letter_id,
        current_user=current_user
    )

    return jsonify(history), 200


@bp.route('/admin/audit/letterstore/<int:letterstore_id>', methods=['GET'])
@jwt_required()
@require_permission(220)
@api_error_handler
def get_letterstore_audit_history(letterstore_id):
    """Histórico de um ofício emitido"""
    from ..services.letter_audit_service import LetterAuditService

    current_user = get_jwt_identity()
    history = LetterAuditService.get_letter_history(
        letterstore_id=letterstore_id,
        current_user=current_user
    )

    return jsonify(history), 200


@bp.route('/admin/audit/statistics', methods=['GET'])
@jwt_required()
@require_permission(220)
@api_error_handler
def get_audit_statistics():
    """Estatísticas de auditoria"""
    from ..services.letter_audit_service import LetterAuditService
    from datetime import datetime

    current_user = get_jwt_identity()

    # Parâmetros opcionais
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if start_date:
        start_date = datetime.fromisoformat(start_date)
    if end_date:
        end_date = datetime.fromisoformat(end_date)

    stats = LetterAuditService.get_statistics(
        start_date=start_date,
        end_date=end_date,
        current_user=current_user
    )

    return jsonify(stats), 200


@bp.route('/admin/audit/search', methods=['POST'])
@jwt_required()
@require_permission(220)
@api_error_handler
def search_audit_logs():
    """Pesquisar logs de auditoria"""
    from ..services.letter_audit_service import LetterAuditService

    data = request.json
    search_term = data.get('search_term', '')
    search_field = data.get('search_field', 'all')
    limit = data.get('limit', 100)

    current_user = get_jwt_identity()

    results = LetterAuditService.search_audit_logs(
        search_term=search_term,
        search_field=search_field,
        limit=limit,
        current_user=current_user
    )

    return jsonify(results), 200


@bp.route('/admin/audit/export', methods=['GET'])
@jwt_required()
@require_permission(220)
@api_error_handler
def export_audit_logs():
    """Exportar logs de auditoria"""
    from ..services.letter_audit_service import LetterAuditService
    from datetime import datetime
    from flask import Response

    current_user = get_jwt_identity()

    # Parâmetros
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    format = request.args.get('format', 'json')

    if start_date:
        start_date = datetime.fromisoformat(start_date)
    if end_date:
        end_date = datetime.fromisoformat(end_date)

    data = LetterAuditService.export_audit_logs(
        start_date=start_date,
        end_date=end_date,
        format=format,
        current_user=current_user
    )

    # Definir tipo de conteúdo
    if format == 'json':
        mimetype = 'application/json'
        filename = f'audit_logs_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    else:
        mimetype = 'text/csv'
        filename = f'audit_logs_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'

    return Response(
        data,
        mimetype=mimetype,
        headers={
            'Content-Disposition': f'attachment; filename={filename}'
        }
    )


# ============================================
# ROTAS - Assinatura Digital
# ============================================

@bp.route('/letters/<int:letterstore_id>/sign/cmd/init', methods=['POST'])
@jwt_required()
@require_permission(220)
@api_error_handler
def sign_letter_cmd_init(letterstore_id):
    """Iniciar assinatura com CMD"""
    from ..services.digital_signature_service import DigitalSignatureService
    
    data = request.json
    current_user = get_jwt_identity()
    
    # Obter letterstore
    letterstore = get_letterstore(letterstore_id, current_user)
    pdf_path = os.path.join(
        current_app.config['FILES_DIR'],
        'letters',
        letterstore['filename']
    )
    
    # Iniciar assinatura
    signature_service = DigitalSignatureService()
    result = signature_service.sign_with_cmd(
        pdf_path=pdf_path,
        user_phone=data['phone'],
        user_nif=data['nif'],
        reason=data.get('reason', 'Assinatura de Ofício'),
        current_user=current_user
    )
    
    return jsonify(result), 200


@bp.route('/letters/sign/cmd/status/<string:request_id>', methods=['GET'])
@jwt_required()
@require_permission(220)
@api_error_handler
def check_cmd_signature_status(request_id):
    """Verificar estado da assinatura CMD"""
    from ..services.digital_signature_service import DigitalSignatureService
    
    signature_service = DigitalSignatureService()
    status = signature_service.cmd_check_signature_status(request_id)
    
    return jsonify(status), 200


@bp.route('/letters/<int:letterstore_id>/sign/cmd/complete', methods=['POST'])
@jwt_required()
@require_permission(220)
@api_error_handler
def sign_letter_cmd_complete(letterstore_id):
    """Completar assinatura CMD"""
    from ..services.digital_signature_service import DigitalSignatureService
    
    data = request.json
    current_user = get_jwt_identity()
    
    letterstore = get_letterstore(letterstore_id, current_user)
    pdf_path = os.path.join(
        current_app.config['FILES_DIR'],
        'letters',
        letterstore['filename']
    )
    
    signature_service = DigitalSignatureService()
    signed_path = signature_service.cmd_complete_signature(
        request_id=data['request_id'],
        pdf_path=pdf_path,
        current_user=current_user
    )
    
    return jsonify({
        'success': True,
        'signed_file': os.path.basename(signed_path)
    }), 200


@bp.route('/letters/<int:letterstore_id>/sign/cc', methods=['POST'])
@jwt_required()
@require_permission(220)
@api_error_handler
def sign_letter_cc(letterstore_id):
    """Assinar com Cartão de Cidadão"""
    from ..services.digital_signature_service import DigitalSignatureService

    data = request.json
    current_user = get_jwt_identity()
    
    letterstore = get_letterstore(letterstore_id, current_user)
    pdf_path = os.path.join(
        current_app.config['FILES_DIR'],
        'letters',
        letterstore['filename']
    )
    
    signature_service = DigitalSignatureService()
    signed_path = signature_service.sign_with_cc(
        pdf_path=pdf_path,
        certificate_pem=data['certificate'],
        signature_value=data['signature'],
        reason=data.get('reason', 'Assinatura de Ofício'),
        current_user=current_user
    )
    
    return jsonify({
        'success': True,
        'signed_file': os.path.basename(signed_path)
    }), 200
