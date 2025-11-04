# routes/emission_routes.py
# Sistema Unificado de Emissões - API Routes
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.utils.permissions_decorator import require_permission
from app.services.emissions import EmissionCoreService, EmissionNumberingService, generate_emission_pdf
from app.services.template_service import TemplateService
from app.utils.logger import get_logger
from app.utils.utils import db_session_manager
from app.utils.error_handler import InvalidSessionError
from datetime import datetime
import os

logger = get_logger(__name__)

# Blueprint
emission_bp = Blueprint('emissions', __name__, url_prefix='/api/v1/emissions')

# Permissão necessária (reutilizar a mesma dos ofícios)
PERMISSION_MANAGE_EMISSIONS = 220


# =============================================================================
# DOCUMENT TYPES
# =============================================================================

@emission_bp.route('/types', methods=['GET'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def get_document_types():
    """
    Lista todos os tipos de documentos disponíveis
    GET /emissions/types
    """
    try:
        current_user = get_jwt_identity()
        with db_session_manager(current_user):
            active_only = request.args.get('active_only', 'true').lower() == 'true'
            types = EmissionCoreService.get_document_types(current_user, active_only=active_only)

            return jsonify({
                'success': True,
                'data': types,  # Já vem como lista de dicts do serviço
                'count': len(types)
            }), 200

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao listar tipos: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


# =============================================================================
# TEMPLATES - CRUD
# =============================================================================

@emission_bp.route('/templates', methods=['POST'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def create_template():
    """
    Cria novo template
    POST /emissions/templates
    Body: {tb_document_type, name, body, header_template, footer_template, metadata}
    """
    try:
        current_user = get_jwt_identity()
        data = request.get_json()

        # Validações básicas
        if not data.get('tb_document_type'):
            return jsonify({'success': False, 'message': 'tb_document_type obrigatório'}), 400
        if not data.get('name'):
            return jsonify({'success': False, 'message': 'name obrigatório'}), 400
        if not data.get('body'):
            return jsonify({'success': False, 'message': 'body obrigatório'}), 400

        # Validar template Jinja2
        validation = TemplateService.validate_template(data['body'])
        if not validation['is_valid']:
            return jsonify({
                'success': False,
                'message': 'Template inválido',
                'errors': validation.get('errors', [])
            }), 400

        # Criar template (já tem db_session_manager interno)
        template = EmissionCoreService.create_template(current_user, data)

        return jsonify({
            'success': True,
            'message': 'Template criado com sucesso',
            'data': template  # Já vem como dict do service
        }), 201

    except ValueError as e:
        # Erros de validação (ex: template duplicado)
        logger.warning(f"Erro de validação ao criar template: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 400
    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao criar template: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@emission_bp.route('/templates', methods=['GET'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def list_templates():
    """
    Lista templates com filtros
    GET /emissions/templates?tb_document_type=1&active=1&search=oficio&limit=50
    """
    try:
        current_user = get_jwt_identity()

        filters = {
            'tb_document_type': request.args.get('tb_document_type', type=int),
            'active': request.args.get('active', type=int),
            'search': request.args.get('search'),
            'limit': request.args.get('limit', 100, type=int),
            'offset': request.args.get('offset', 0, type=int)
        }

        # list_templates já tem db_session_manager interno
        templates = EmissionCoreService.list_templates(current_user, filters)

        return jsonify({
            'success': True,
            'data': templates,
            'count': len(templates)
        }), 200

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao listar templates: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@emission_bp.route('/templates/<int:template_id>', methods=['GET'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def get_template(template_id):
    """Obtém template específico"""
    try:
        current_user = get_jwt_identity()

        # get_template já tem db_session_manager interno
        template = EmissionCoreService.get_template(current_user, template_id)

        if not template:
            return jsonify({'success': False, 'message': 'Template não encontrado'}), 404

        return jsonify({
            'success': True,
            'data': template  # ✅ Já vem como dict do service
        }), 200

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao obter template: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@emission_bp.route('/templates/<int:template_id>', methods=['PUT'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def update_template(template_id):
    """Atualiza template existente"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()

        # Validar template se body foi alterado
        if 'body' in data:
            validation = TemplateService.validate_template(data['body'])
            if not validation['is_valid']:
                return jsonify({
                    'success': False,
                    'message': 'Template inválido',
                    'errors': validation.get('errors', [])
                }), 400

        # update_template já tem db_session_manager interno
        template = EmissionCoreService.update_template(current_user, template_id, data)

        if not template:
            return jsonify({'success': False, 'message': 'Template não encontrado'}), 404

        return jsonify({
            'success': True,
            'message': 'Template atualizado com sucesso',
            'data': template  # Já vem como dict do service
        }), 200

    except ValueError as e:
        # Erros de validação
        logger.warning(f"Erro de validação ao atualizar template: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 400
    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao atualizar template: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@emission_bp.route('/templates/<int:template_id>', methods=['DELETE'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def delete_template(template_id):
    """Desativa template (soft delete)"""
    try:
        current_user = get_jwt_identity()

        # delete_template já tem db_session_manager interno
        success = EmissionCoreService.delete_template(current_user, template_id)

        if not success:
            return jsonify({'success': False, 'message': 'Template não encontrado'}), 404

        return jsonify({
            'success': True,
            'message': 'Template desativado com sucesso'
        }), 200

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao deletar template: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


# =============================================================================
# EMISSIONS - CRUD
# =============================================================================

@emission_bp.route('/', methods=['POST'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def create_emission():
    """
    Cria nova emissão
    POST /emissions/
    Body: {tb_document_type, tb_emission_template, subject, recipient_data, custom_data}
    """
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        with db_session_manager(current_user):

            # Validações básicas
            if not data.get('tb_document_type'):
                return jsonify({'success': False, 'message': 'tb_document_type obrigatório'}), 400

            # NÃO gerar número manualmente - a view/trigger gera automaticamente!
            # O emission_number será gerado pela vbf_letter view quando fizermos INSERT

            # Criar emissão (número será gerado automaticamente pela view)
            emission = EmissionCoreService.create_emission(current_user, data)

            return jsonify({
                'success': True,
                'message': 'Emissão criada com sucesso',
                'data': emission,
            }), 201

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao criar emissão: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@emission_bp.route('/', methods=['GET'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def list_emissions():
    """
    Lista emissões com filtros
    GET /emissions/?tb_document_type=1&status=issued&search=teste&limit=50
    """
    try:
        current_user = get_jwt_identity()
        with db_session_manager(current_user):
            filters = {
                'tb_document_type': request.args.get('tb_document_type', type=int),
                'status': request.args.get('status'),
                'created_by': request.args.get('created_by'),
                'search': request.args.get('search'),
                'date_from': request.args.get('date_from'),
                'date_to': request.args.get('date_to'),
                'limit': request.args.get('limit', 100, type=int),
                'offset': request.args.get('offset', 0, type=int)
            }

            emissions = EmissionCoreService.list_emissions(current_user, filters)

            return jsonify({
                'success': True,
                'data': emissions,
                'count': len(emissions)
            }), 200

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida ao listar emissões: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 401
    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao listar emissões: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@emission_bp.route('/<int:emission_id>', methods=['GET'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def get_emission(emission_id):
    """Obtém emissão específica"""
    try:
        current_user = get_jwt_identity()
        with db_session_manager(current_user):
            emission = EmissionCoreService.get_emission(current_user, emission_id)

            if not emission:
                return jsonify({'success': False, 'message': 'Emissão não encontrada'}), 404

            return jsonify({
                'success': True,
                'data': emission,
            }), 200

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao obter emissão: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@emission_bp.route('/<int:emission_id>', methods=['PUT'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def update_emission(emission_id):
    """Atualiza emissão existente"""
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        with db_session_manager(current_user):
            emission = EmissionCoreService.update_emission(emission_id, data, current_user)

            if not emission:
                return jsonify({'success': False, 'message': 'Emissão não encontrada'}), 404

            return jsonify({
                'success': True,
                'message': 'Emissão atualizada com sucesso',
                'data': emission,
            }), 200

    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao atualizar emissão: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@emission_bp.route('/<int:emission_id>', methods=['DELETE'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def delete_emission(emission_id):
    """Cancela emissão (soft delete)"""
    try:
        current_user = get_jwt_identity()
        with db_session_manager(current_user):
            success = EmissionCoreService.delete_emission(emission_id, current_user)

            if not success:
                return jsonify({'success': False, 'message': 'Emissão não encontrada'}), 404

            return jsonify({
                'success': True,
                'message': 'Emissão cancelada com sucesso'
            }), 200

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao cancelar emissão: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


# =============================================================================
# NUMBERING
# =============================================================================

@emission_bp.route('/numbering/preview', methods=['POST'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def preview_next_number():
    """
    Preview do próximo número disponível
    POST /emissions/numbering/preview
    Body: {document_type_code, year, department_code}
    """
    try:
        current_user = get_jwt_identity()
        data = request.get_json()

        if not data.get('document_type_code'):
            return jsonify({'success': False, 'message': 'document_type_code obrigatório'}), 400

        with db_session_manager(current_user):
            preview = EmissionNumberingService.get_next_sequence_preview(
                document_type_code=data['document_type_code'],
                year=data.get('year'),
                department_code=data.get('department_code'),
                current_user=current_user
            )

            if 'error' in preview:
                return jsonify({'success': False, 'message': preview['error']}), 400

            return jsonify({
                'success': True,
                'data': preview
            }), 200

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro no preview: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@emission_bp.route('/numbering/statistics/<int:year>', methods=['GET'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def get_year_statistics(year):
    """Estatísticas de emissões por ano"""
    try:
        current_user = get_jwt_identity()
        document_type_code = request.args.get('type')
        with db_session_manager(current_user):
            stats = EmissionNumberingService.get_year_statistics(
                year=year,
                document_type_code=document_type_code,
                current_user=current_user
            )

            return jsonify({
                'success': True,
                'data': stats
            }), 200

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao obter estatísticas: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


# =============================================================================
# VARIABLES (para editor)
# =============================================================================

@emission_bp.route('/variables/<string:type_code>', methods=['GET'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def get_variables_for_type(type_code):
    """
    Retorna variáveis disponíveis para um tipo de documento
    GET /emissions/variables/OFI
    """
    try:
        # Obter variáveis base
        current_user = get_jwt_identity()
        with db_session_manager(current_user):
            variables = TemplateService.get_available_variables()

            # TODO: Filtrar/adicionar variáveis específicas por tipo
            # Por agora retorna todas

            return jsonify({
                'success': True,
                'data': variables,
                'type_code': type_code
            }), 200

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao obter variáveis: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


# =============================================================================
# AUDIT
# =============================================================================

@emission_bp.route('/audit', methods=['GET'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def get_audit_logs():
    """
    Lista logs de auditoria
    GET /emissions/audit?user_id=username&action=EMISSION_CREATE&limit=100
    """
    try:
        current_user = get_jwt_identity()
        with db_session_manager(current_user):
            filters = {
                'user_id': request.args.get('user_id'),
                'action': request.args.get('action'),
                'emission_id': request.args.get('emission_id', type=int),
                'date_from': request.args.get('date_from'),
                'date_to': request.args.get('date_to'),
                'limit': request.args.get('limit', 100, type=int)
            }

            logs = EmissionCoreService.get_audit_logs(filters)

            return jsonify({
                'success': True,
                'data': logs,
                'count': len(logs)
            }), 200

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao listar audit logs: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


# =============================================================================
# DOCUMENT GENERATION
# =============================================================================

# Endpoint de DEBUG - Remover depois
@emission_bp.route('/debug-test', methods=['POST', 'GET'])
def debug_test():
    logger.info("🔥 [DEBUG] Endpoint de teste chamado!")
    return jsonify({'success': True, 'message': 'Debug endpoint funcionando!'}), 200


# Endpoint de teste MINIMAL sem decorators para diagnosticar 422
@emission_bp.route('/test-minimal/<int:emission_id>', methods=['POST', 'OPTIONS'])
def test_minimal_generate(emission_id):
    """Teste minimal sem JWT/permission para diagnosticar 422"""
    logger.info(f"✅ [TEST-MINIMAL] FUNÇÃO CHAMADA! emission_id={emission_id}")
    logger.info(f"✅ [TEST-MINIMAL] Method: {request.method}")
    logger.info(f"✅ [TEST-MINIMAL] Headers: {dict(request.headers)}")
    logger.info(f"✅ [TEST-MINIMAL] Body: {request.get_data()}")
    logger.info(f"✅ [TEST-MINIMAL] Content-Type: {request.content_type}")
    logger.info(f"✅ [TEST-MINIMAL] JSON: {request.get_json(silent=True)}")

    return jsonify({
        'success': True,
        'message': f'Test minimal OK para emission {emission_id}',
        'received_id': emission_id,
        'method': request.method
    }), 200


@emission_bp.route('/<int:emission_id>/generate', methods=['POST', 'OPTIONS'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def generate_document(emission_id):
    """
    Gera PDF para emissão existente
    POST /emissions/<id>/generate
    """
    # Handle OPTIONS for CORS
    if request.method == 'OPTIONS':
        return jsonify({'success': True}), 200

    logger.info(f"🚀 [GENERATE] FUNÇÃO CHAMADA! emission_id={emission_id}, method={request.method}")
    logger.info(f"🚀 [GENERATE] Headers: {dict(request.headers)}")
    logger.info(f"🚀 [GENERATE] Body: {request.get_data()}")

    try:
        current_user = get_jwt_identity()
        logger.info(f"[GENERATE] Iniciando geração de PDF para emissão {emission_id}")
        with db_session_manager(current_user):
            # Obter emissão (objeto para poder fazer update)
            emission = EmissionCoreService.get_emission_object(current_user, emission_id)
            if not emission:
                logger.error(f"[GENERATE] Emissão {emission_id} não encontrada")
                return jsonify({'success': False, 'message': 'Emissão não encontrada'}), 404

            logger.info(f"[GENERATE] Emissão encontrada: {emission.emission_number}")

            # ✅ VALIDAÇÃO: Só permite gerar se for rascunho OU forçar re-geração
            force_regenerate = request.json.get('force_regenerate', False) if request.json else False

            if emission.ts_letterstatus != emission.STATUS_DRAFT and not force_regenerate:
                logger.warning(f"[GENERATE] Tentativa de gerar PDF para emissão já emitida (status={emission.ts_letterstatus})")
                return jsonify({
                    'success': False,
                    'message': 'Esta emissão já foi emitida. Use o botão Download para obter o PDF existente.',
                    'already_generated': True,
                    'filename': emission.filename
                }), 400

            # Obter template
            if not emission.template:
                logger.error(f"[GENERATE] Template não encontrado para emissão {emission_id}")
                return jsonify({'success': False, 'message': 'Template não encontrado'}), 404

            logger.info(f"[GENERATE] Template encontrado: {emission.template.name}")

            # Mapear recipient_data para variáveis do template (MAIÚSCULAS)
            recipient_data = emission.recipient_data or {}

            # Context para render
            context = {
                # Variáveis do sistema
                'EMISSION_NUMBER': emission.emission_number,
                'NUMERO_OFICIO': emission.emission_number,
                'SUBJECT': emission.subject or '',
                'ASSUNTO': emission.subject or '',
                'DATE': emission.emission_date.strftime('%d/%m/%Y'),
                'DATA': emission.emission_date.strftime('%d/%m/%Y'),

                # Variáveis do destinatário (mapeamento de minúsculas para MAIÚSCULAS)
                'NOME': recipient_data.get('nome', recipient_data.get('name', '')),
                'MORADA': recipient_data.get('morada', recipient_data.get('address', '')),
                'LOCALIDADE': recipient_data.get('localidade', recipient_data.get('city', '')),
                'CODIGO_POSTAL': recipient_data.get('codigo_postal', recipient_data.get('postal_code', '')),
                'PORTA': recipient_data.get('porta', recipient_data.get('door', '')),
                'NIF': recipient_data.get('nif', recipient_data.get('tax_id', '')),

                # Adicionar custom_data e recipient_data originais para flexibilidade
                **emission.custom_data,
                **recipient_data
            }

            logger.info(f"[GENERATE] Contexto preparado com {len(context)} variáveis")
            logger.info(f"[GENERATE] Variáveis principais: NOME={context.get('NOME')}, MORADA={context.get('MORADA')}, LOCALIDADE={context.get('LOCALIDADE')}, CODIGO_POSTAL={context.get('CODIGO_POSTAL')}")

            # Gerar PDF no diretório correto
            pdf_path = generate_emission_pdf(
                emission=emission,
                template=emission.template,
                context=context,
                output_dir='generated_pdfs'
            )

            logger.info(f"[GENERATE] PDF gerado em: {pdf_path}")

            # Atualizar emissão via VIEW vbf_letter (trigger chama fbf_letter automaticamente)
            filename = os.path.basename(pdf_path)

            from app import db
            from sqlalchemy import text
            import json

            # UPDATE na VIEW - o trigger INSTEAD OF chama automaticamente fbf_letter
            update_sql = text("""
                UPDATE vbf_letter
                SET ts_letterstatus = :ts_letterstatus,
                    filename = :filename
                WHERE pk = :pk
            """)

            db.session.execute(update_sql, {
                'pk': emission_id,
                'ts_letterstatus': 2,  # STATUS_ISSUED
                'filename': filename
            })
            db.session.commit()

            logger.info(f"[GENERATE] Emissão atualizada via VIEW vbf_letter: {filename}")

            return jsonify({
                'success': True,
                'message': 'PDF gerado com sucesso',
                'data': {
                    'filename': filename,
                    'emission_number': emission.emission_number
                }
            }), 200

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"[GENERATE] Erro ao gerar PDF: {str(e)}", exc_info=True)
        from app import db
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@emission_bp.route('/<int:emission_id>/upload-pdf', methods=['POST'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def upload_pdf(emission_id):
    """Recebe PDF gerado no frontend e salva no servidor"""
    try:
        from werkzeug.utils import secure_filename
        from app import db
        from sqlalchemy import text

        current_user = get_jwt_identity()

        with db_session_manager(current_user):
            # Verificar se o arquivo foi enviado
            if 'pdf' not in request.files:
                return jsonify({'success': False, 'message': 'Nenhum arquivo PDF enviado'}), 400

            pdf_file = request.files['pdf']

            if pdf_file.filename == '':
                return jsonify({'success': False, 'message': 'Nome de arquivo vazio'}), 400

            if not pdf_file.filename.endswith('.pdf'):
                return jsonify({'success': False, 'message': 'Arquivo deve ser PDF'}), 400

            # Buscar emissão (usando get_emission que retorna dict)
            emission_dict = EmissionCoreService.get_emission(current_user, emission_id)

            if not emission_dict:
                return jsonify({'success': False, 'message': 'Emissão não encontrada'}), 404

            # Verificar se é rascunho (status 'draft')
            if emission_dict.get('status') != 'draft':
                return jsonify({'success': False, 'message': 'Apenas rascunhos podem receber PDF'}), 400

            logger.info(f"[UPLOAD_PDF] Recebendo PDF para emissão {emission_id}")

            # Criar diretório se não existir
            pdf_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'generated_pdfs')
            os.makedirs(pdf_dir, exist_ok=True)

            # Salvar arquivo com nome seguro
            filename = secure_filename(pdf_file.filename)
            pdf_path = os.path.join(pdf_dir, filename)

            # Se já existe, adicionar timestamp
            if os.path.exists(pdf_path):
                name_parts = filename.rsplit('.', 1)
                timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
                filename = f"{name_parts[0]}_{timestamp}.{name_parts[1]}"
                pdf_path = os.path.join(pdf_dir, filename)

            pdf_file.save(pdf_path)
            logger.info(f"[UPLOAD_PDF] PDF salvo em: {pdf_path}")

            # Atualizar emissão via VIEW vbf_letter
            update_sql = text("""
                UPDATE vbf_letter
                SET ts_letterstatus = :ts_letterstatus,
                    filename = :filename
                WHERE pk = :pk
            """)

            db.session.execute(update_sql, {
                'pk': emission_id,
                'ts_letterstatus': 2,  # STATUS_ISSUED
                'filename': filename
            })
            db.session.commit()

            logger.info(f"[UPLOAD_PDF] Emissão {emission_id} atualizada: status=2, filename={filename}")

            return jsonify({
                'success': True,
                'message': 'PDF recebido e emissão oficializada com sucesso',
                'data': {
                    'filename': filename,
                    'emission_number': emission_dict.get('emission_number')
                }
            }), 200

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"[UPLOAD_PDF] Erro ao receber PDF: {str(e)}", exc_info=True)
        from app import db
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@emission_bp.route('/<int:emission_id>/download', methods=['GET'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def download_document(emission_id):
    """Download do PDF da emissão"""
    try:
        current_user = get_jwt_identity()
        with db_session_manager(current_user):
            emission = EmissionCoreService.get_emission(current_user, emission_id)

            if not emission:
                return jsonify({'success': False, 'message': 'Emissão não encontrada'}), 404

            if not emission.get('filename'):
                return jsonify({'success': False, 'message': 'PDF ainda não foi gerado'}), 404

            # Construir caminho do ficheiro (PDFs são salvos em app/generated_pdfs)
            pdf_dir = os.path.join(os.path.dirname(__file__), '../generated_pdfs')
            file_path = os.path.join(pdf_dir, emission['filename'])

            if not os.path.exists(file_path):
                return jsonify({'success': False, 'message': 'Ficheiro PDF não encontrado no servidor'}), 404

            return send_file(
                file_path,
                as_attachment=True,
                download_name=emission['filename'],
                mimetype='application/pdf'
            ), 200

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao fazer download: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


@emission_bp.route('/<int:emission_id>/view', methods=['GET'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def view_document(emission_id):
    """Visualizar PDF inline"""
    try:
        current_user = get_jwt_identity()
        with db_session_manager(current_user):
            emission = EmissionCoreService.get_emission(current_user, emission_id)

            if not emission:
                return jsonify({'success': False, 'message': 'Emissão não encontrada'}), 404

            if not emission.get('filename'):
                return jsonify({'success': False, 'message': 'PDF ainda não foi gerado'}), 404

            # Construir caminho do ficheiro (PDFs são salvos em app/generated_pdfs)
            pdf_dir = os.path.join(os.path.dirname(__file__), '../generated_pdfs')
            file_path = os.path.join(pdf_dir, emission['filename'])

            if not os.path.exists(file_path):
                return jsonify({'success': False, 'message': 'Ficheiro PDF não encontrado no servidor'}), 404

            return send_file(
                file_path,
                mimetype='application/pdf'
            ), 200

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao visualizar: {str(e)}")
        return jsonify({'success': False, 'message': str(e)}), 500


# =============================================================================
# TEMPLATE PREVIEW
# =============================================================================

@emission_bp.route('/templates/preview', methods=['POST'])
@jwt_required()
@require_permission(PERMISSION_MANAGE_EMISSIONS)
def preview_template():
    """
    Gera pré-visualização de um template com dados de exemplo
    POST /emissions/templates/preview
    Body: {
        "template_body": "<html>...",
        "header_template": "<html>...",
        "footer_template": "<html>...",
        "context": {"VAR1": "value1", ...}
    }
    """
    try:
        current_user = get_jwt_identity()

        # Extrair dados do request (não precisa de db_session_manager para preview)
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'message': 'Nenhum dado recebido'
            }), 400

        # Extrair templates e contexto
        template_body = data.get('template_body', '')
        header_template = data.get('header_template', '')
        footer_template = data.get('footer_template', '')
        context = data.get('context', {})
        logo_path = data.get('logo_path', None)

        logger.info(f"[PREVIEW] Gerando preview - body: {len(template_body)} chars, logo: {logo_path}")

        if not template_body:
            return jsonify({
                'success': False,
                'message': 'O corpo do template é obrigatório'
            }), 400

        # Importar gerador HTML (WeasyPrint - suporta HTML/CSS completo)
        from app.services.emissions.html_generator_service import html_pdf_generator
        from app.models.emission import DocumentType, Emission
        from datetime import datetime

        # Criar objeto mock de emissão para preview
        mock_emission = type('MockEmission', (), {
            'emission_number': context.get('NUMERO_OFICIO', 'PREVIEW-2024'),
            'emission_date': datetime.now(),
            'document_type': type('MockDocType', (), {
                'name': 'Ofício',
                'acron': 'OFI'
            })()
        })()

        # Gerar PDF temporário
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp:
            pdf_path = tmp.name

        # Gerar PDF com HTML generator (suporta HTML/CSS completo)
        html_pdf_generator.generate_pdf(
            emission=mock_emission,
            output_path=pdf_path,
            template_body=template_body,
            context=context,
            header_template=header_template if header_template else None,
            footer_template=footer_template if footer_template else None,
            logo_path=logo_path
        )

        # Enviar arquivo e deletar
        response = send_file(
            pdf_path,
            mimetype='application/pdf',
            as_attachment=False,
            download_name='preview.pdf'
        )

        # Agendar deleção do arquivo temporário após envio
        @response.call_on_close
        def cleanup():
            try:
                if os.path.exists(pdf_path):
                    os.unlink(pdf_path)
            except Exception as e:
                logger.warning(f"Erro ao deletar preview temporário: {e}")

        return response

    except InvalidSessionError as e:
        logger.warning(f"Sessão inválida: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 401
    except Exception as e:
        logger.error(f"Erro ao gerar preview: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'Erro ao gerar pré-visualização: {str(e)}'
        }), 500


# =============================================================================
# HEALTH CHECK
# =============================================================================

@emission_bp.route('/health', methods=['GET'])
def health_check():
    """Health check do módulo de emissões"""
    return jsonify({
        'success': True,
        'module': 'emissions',
        'status': 'healthy',
        'version': '1.0.0',
        'timestamp': datetime.now().isoformat()
    }), 200
