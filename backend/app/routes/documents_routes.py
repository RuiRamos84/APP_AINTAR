from flask import current_app, jsonify, send_file
from flask import Blueprint, request, jsonify, g, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from ..services.documents import (
    list_documents,
    create_document,
    get_document_steps,
    get_document_anex_steps,
    add_document_step,
    document_self,
    document_owner,
    add_document_annex,
    download_file,
    check_vacation_status,
    get_entity_count_types,
    create_document_direct,
    update_document_notification,
    buscar_dados_pedido, 
    gerar_comprovativo_pdf,
    preencher_pdf,
    get_document_type_param,
    update_document_params,
    create_etar_document_direct,
    create_ee_document_direct,
    get_document_ramais,
    update_document_pavenext,
    get_document_ramais_concluded,
    replicate_document_service,
    reopen_document,
    documentById,
    get_documents_late
)
import jwt
from .. import limiter
from ..utils.utils import token_required, set_session, db_session_manager
from app.utils.error_handler import api_error_handler


bp = Blueprint('documents_routes', __name__)


@bp.route('/documents', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_documents():
    """Listar todos os documentos"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return list_documents(current_user)


@bp.route('/document/<string:documentId>', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def documentById_route(documentId):  # Adicione o parâmetro documentId aqui
    """Obter dados do documento"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        # Parâmetros na ordem correta
        return documentById(documentId, current_user)


@bp.route('/document_self', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_document_self():
    """Listar documentos atribuídos a si"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return document_self(current_user)


@bp.route('/check_vacation_status/<int:user_pk>', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def check_vacation_status_route(user_pk):
    """Verificar status de férias do usuário"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return check_vacation_status(user_pk, current_user)


@bp.route('/create_document', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def create_new_document():
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        data = request.form
        files = request.files.getlist('files')
        return create_document(data, files, current_user)


@bp.route('/update_document_notification/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def update_document_notification_route(pk):
    """Atualizar o status de notificação de um documento"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return update_document_notification(pk, current_user)


@bp.route('/document_owner', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_document_owner():
    """Listar documentos criados por si"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return document_owner(current_user)


@bp.route('/get_document_step/<int:pk>', methods=['GET'])
@limiter.exempt
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_document_step(pk):
    """Obter passos do documento"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return jsonify(get_document_steps(pk, current_user))


@bp.route('/document/<int:document_id>/params', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_document_params(document_id):
    """Obter parâmetros do documento"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return get_document_type_param(current_user, document_id)


@bp.route('/document/<int:document_id>/params', methods=['PUT'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def update_document_params_route(document_id):
    """Atualizar parâmetros do documento"""
    current_user = get_jwt_identity()
    data = request.get_json()
    return update_document_params(current_user, document_id, data)


@bp.route('/get_document_anex/<int:pk>', methods=['GET'])
@limiter.exempt
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_document_anex_step(pk):
    """Adicionar anexos ao documento"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return jsonify(get_document_anex_steps(pk, current_user))


@bp.route('/add_document_step/<int:pk>', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def add_document_steps(pk):
    """Criar ou atualizar passo do documento"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        data = request.form
        return add_document_step(data, pk, current_user)


@bp.route('/files/<string:regnumber>/<string:filename>', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def download_file_route(regnumber, filename):
    """Servir ficheiros com normalização de extensões"""
    current_user = get_jwt_identity()
    print(f"Download file request: regnumber={regnumber}, filename={filename}")    
    try:
        # # Verificar token
        # token = request.headers.get('Authorization', '').split(' ')[-1]
        # if not token:
        #     current_app.logger.warning("Token não fornecido na requisição")
        #     return jsonify({"error": "Token não fornecido"}), 401

        # try:
        #     decode_token(token)
        # except jwt.ExpiredSignatureError:
        #     current_app.logger.warning("Token expirado")
        #     return jsonify({"error": "Token expirado"}), 401
        # except jwt.InvalidTokenError:
        #     current_app.logger.warning("Token inválido")
        #     return jsonify({"error": "Token inválido"}), 401

        # Usar função corrigida
        with db_session_manager(current_user):
            print(f"Download: {regnumber}/{filename}")            
            return download_file(regnumber, filename, current_user)
            
    except Exception as e:
        current_app.logger.error(f"Erro servir ficheiro: {str(e)}")
        return jsonify({'error': 'Erro interno'}), 500


@bp.route('/add_document_annex', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def add_document_annex_endpoint():
    """Adicionar anexos com normalização"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        data = request.form
        response = add_document_annex(data, current_user)
        return jsonify(response[0]), response[1]


# Rota debug (opcional - apenas para teste)
@bp.route('/debug/file-test/<string:regnumber>/<string:filename>', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def debug_file_test(regnumber, filename):
    """Debug: testar ficheiro específico"""
    current_user = get_jwt_identity()
    
    if not current_user.get('profil') == "1":
        return jsonify({'error': 'Sem permissão'}), 403
    
    try:
        from .services.attachments import normalize_filename_extensions
        
        base_path = current_app.config.get('FILES_DIR', '/var/www/html/files')
        request_path = os.path.join(base_path, regnumber)
        
        variations = normalize_filename_extensions(filename)
        results = []
        
        for var in variations:
            for subdir in ['anexos', 'Oficios', '']:
                if subdir:
                    test_path = os.path.join(request_path, subdir, var)
                else:
                    test_path = os.path.join(request_path, var)
                
                result = {
                    'filename': var,
                    'path': test_path,
                    'exists': os.path.exists(test_path),
                    'readable': os.access(test_path, os.R_OK) if os.path.exists(test_path) else False
                }
                
                if os.path.exists(test_path):
                    result['size'] = os.path.getsize(test_path)
                    result['permissions'] = oct(os.stat(test_path).st_mode)[-3:]
                
                results.append(result)
        
        return jsonify({
            'regnumber': regnumber,
            'filename': filename,
            'variations': variations,
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/entity_count_types/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_entity_count_types_route(pk):
    """Obter tipos de pedidos efetuados por uma entidade"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return jsonify(get_entity_count_types(pk, current_user))


@bp.route('document/create_direct', methods=['POST'])
@api_error_handler
def create_document_extern():
    data = request.json
    try:
        result = create_document_direct(
            data.get('ntype'),
            data.get('associate'),
            data.get('nif'),
            data.get('name'),
            data.get('phone'),
            data.get('email'),
            data.get('text')
        )
        return jsonify({"message": result}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@bp.route('/extrair_comprovativo/<int:pk>', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def extrair_comprovativo(pk):
    try:
        current_user = get_jwt_identity()
        current_app.logger.info(f"Iniciando extração de comprovativo para o pedido {pk}")

        dados_pedido = buscar_dados_pedido(pk, current_user)

        if dados_pedido is None:
            current_app.logger.warning(f"Pedido {pk} não encontrado")
            return jsonify({"erro": "Pedido não encontrado"}), 404

        current_app.logger.info(f"Dados do pedido {pk} recuperados com sucesso")
        current_app.logger.debug(f"Dados para preenchimento do PDF: {dados_pedido}")

        # Preencher o PDF com os dados do pedido
        current_app.logger.info(f"Iniciando preenchimento do PDF para o pedido {pk}")
        pdf_buffer = preencher_pdf(dados_pedido)

        current_app.logger.info(f"PDF para o pedido {pk} gerado com sucesso")

        # Retornar o PDF gerado para o utilizador
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=f"comprovativo_pedido_{pk}.pdf",
            mimetype='application/pdf'
        )

    except Exception as e:
        current_app.logger.error(f"Erro ao gerar comprovativo para o pedido {pk}: {str(e)}", exc_info=True)
        return jsonify({"erro": str(e)}), 500


@bp.route('/create_etar_document/<int:etar_pk>', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def create_etar_document(etar_pk):
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        try:
            # Chama a função que cria o pedido ETAR
            result = create_etar_document_direct(etar_pk, current_user)
            return jsonify(result)
        except Exception as e:
            current_app.logger.error(f"Erro ao criar pedido ETAR: {str(e)}")
            return jsonify({"erro": str(e)}), 500


@bp.route('/create_ee_document/<int:ee_pk>', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def create_ee_document(ee_pk):
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        try:
            # Chama a função que cria o pedido EE
            result = create_ee_document_direct(ee_pk, current_user)
            return jsonify(result)
        except Exception as e:
            current_app.logger.error(f"Erro ao criar pedido EE: {str(e)}")
            return jsonify({"erro": str(e)}), 500


@bp.route('/document_ramais', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_document_ramais_route():
    """Obter dados dos ramais"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return get_document_ramais(current_user)


@bp.route('/document_pavenext/<int:pk>', methods=['PUT'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def update_document_pavenext_route(pk):
    """Atualizar status do documento para próximo passo"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return update_document_pavenext(pk, current_user)


@bp.route('/document_ramais_concluded', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_document_ramais_concluded_route():
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return get_document_ramais_concluded(current_user)


@bp.route('/document/replicate/<int:pk>', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def replicate_document(pk):
    """
    Replicar um documento existente com novo tipo.
    A replicação copia todos os dados do documento original e seus anexos.
    
    Args:
        pk (int): PK do documento original
    
    Request Body:
        {
            "new_type": integer (ID do novo tipo de documento)
        }
    
    Returns:
        JSON com resultado da operação incluindo detalhes do documento original e novo
    """
    try:
        current_user = get_jwt_identity()
        data = request.get_json()

        if not data or 'new_type' not in data:
            return jsonify({
                'error': 'Novo tipo de documento não especificado',
                'details': 'O campo new_type é obrigatório no corpo da requisição'
            }), 400

        new_type = data.get('new_type')

        # Valida se new_type é um número
        if not isinstance(new_type, int):
            try:
                new_type = int(new_type)
            except (TypeError, ValueError):
                return jsonify({
                    'error': 'Tipo de documento inválido',
                    'details': 'O new_type deve ser um número inteiro'
                }), 400

        with db_session_manager(current_user):
            result = replicate_document_service(pk, new_type, current_user)
            return jsonify(result[0]), result[1]

    except Exception as e:
        current_app.logger.error(f"Erro ao replicar documento: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/document/reopen', methods=['POST'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def reopen_document_route():
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        regnumber = data.get('regnumber')
        user_id = data.get('user_id')

        if not regnumber or not user_id:
            return jsonify({'error': 'regnumber e user_id são obrigatórios'}), 400

        return reopen_document(regnumber, user_id, current_user)

    except Exception as e:
        current_app.logger.error(f"Erro na rota de reabrir pedido: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/documents/late', methods=['GET'])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_documents_late_route():
    """Listar documentos em atraso (mais de 30 dias)"""
    current_user = get_jwt_identity()
    with db_session_manager(current_user):
        return get_documents_late(current_user)


@bp.after_request
@api_error_handler
def cleanup_session(response):
    if hasattr(g, 'current_user'):
        delattr(g, 'current_user')
    if hasattr(g, 'current_session_id'):
        delattr(g, 'current_session_id')
    # current_app.logger.debug("Sessão limpa após requisição documents")
    return response



# Registrar a função de limpeza de sessão
bp.after_request(cleanup_session)
