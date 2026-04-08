# backend/app/routes/payment_routes.py - MIGRAÇÃO PARA NOVO SISTEMA
#
# MAPEAMENTO DE PERMISSÕES (ts_interface):
# - 30:  admin.payments (Gestão de pagamentos)
# - 700: payments.mbway
# - 710: payments.multibanco
# - 720: payments.bank_transfer
# - 730: payments.cash.action
# - 740: payments.municipality

from app.services.payment_service import payment_service
from app.utils.error_handler import api_error_handler
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from ..utils.utils import set_session, token_required

# ✅ NOVO SISTEMA DE PERMISSÕES
from app.utils.permissions_decorator import require_permission, get_user_permissions_from_jwt
from app.core.permissions import permission_manager
from app.utils.logger import get_logger


bp = Blueprint("payments", __name__)
logger = get_logger(__name__)

# ===== TRANSIÇÃO: MANTER COMPATIBILIDADE COM SISTEMA ANTIGO =====
# Estas constantes serão removidas gradualmente

PAYMENT_METHODS = {
    'MBWAY': 'MBWAY',
    'MULTIBANCO': 'MULTIBANCO',
    'CASH': 'CASH',
    'BANK_TRANSFER': 'BANK_TRANSFER',
    'MUNICIPALITY': 'MUNICIPALITY'
}

# ⚠️ DEPRECATED: Usar novo sistema
PAYMENT_ADMIN_IDS = [12, 100111, 82, 10]


def get_user_info_from_jwt():
    """Extrair informações do JWT - MANTIDO PARA COMPATIBILIDADE"""
    try:
        jwt_data = get_jwt()
        user_id = jwt_data.get('user_id')
        if isinstance(user_id, dict):
            user_id = user_id.get('user_id')

        user_profile = (
            jwt_data.get('profil') or
            jwt_data.get('profile') or
            jwt_data.get('user_profile')
        )

        logger.debug(
            f"🔍 JWT dados - User ID: {user_id}, Perfil: {user_profile}")
        return int(user_id) if user_id else None, str(user_profile) if user_profile else None
    except Exception as e:
        logger.error(f"Erro extrair JWT: {e}")
        return None, None

# ✅ NOVA FUNÇÃO USANDO SISTEMA CENTRALIZADO


def check_payment_method_permission(payment_method):
    """Verificar permissão para método de pagamento usando novo sistema"""
    user_id, user_profile, user_interfaces, _ = get_user_permissions_from_jwt()

    if not user_id:
        return False, user_id, user_profile

    # Mapeamento para IDs numéricos (ts_interface)
    permission_map = {
        'CASH': 730,            # payments.cash.action
        'BANK_TRANSFER': 720,   # payments.bank_transfer
        'MUNICIPALITY': 740,    # payments.municipality
        'MBWAY': 700,           # payments.mbway
        'MULTIBANCO': 710       # payments.multibanco
    }

    required_permission_id = permission_map.get(payment_method)
    if not required_permission_id:
        logger.warning(f"Método de pagamento desconhecido: {payment_method}")
        return False, user_id, user_profile

    # Super admin sempre tem acesso
    if user_profile == "0":
        return True, user_id, user_profile

    # Verificar se o ID está na lista de interfaces do utilizador
    has_permission = required_permission_id in (user_interfaces or [])

    logger.debug(
        f"Permissão ID {required_permission_id} para user {user_id}: {has_permission}")
    return has_permission, user_id, user_profile

# ✅ NOVA FUNÇÃO PARA VERIFICAR GESTÃO DE PAGAMENTOS


def check_payment_admin_permission():
    """Verificar permissão de administração de pagamentos"""
    user_id, user_profile, user_interfaces, _ = get_user_permissions_from_jwt()

    if not user_id:
        return False, user_id, user_profile

    # Super admin sempre tem acesso
    if user_profile == "0":
        return True, user_id, user_profile

    # Verificar se tem a permissão de admin de pagamentos (ID 30)
    has_permission = 30 in (user_interfaces or [])  # admin.payments

    logger.debug(
        f"Permissão admin.payments (ID 30) para user {user_id}: {has_permission}")
    return has_permission, user_id, user_profile

# ===== ENDPOINTS ATUALIZADOS =====


@bp.route("/payments/invoice/<int:document_id>", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_invoice_data(document_id):
    """
    Obter Dados para Faturação / Cobrança
    ---
    tags:
      - Pagamentos
    summary: Puxa o valor em dívida de um determinado pedido/documento associado através de interceção em SIBS / Tarifários.
    security:
      - BearerAuth: []
    parameters:
      - name: document_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Devolve dados base de pagamento do documento.
    """
    user = get_jwt_identity()
    try:
        data = payment_service.get_invoice_data(document_id, user)
        return jsonify({"success": True, "invoice_data": data}), 200
    except Exception as e:
        logger.error(f"Erro fatura {document_id}: {e}")
        return jsonify({
            "success": True,
            "invoice_data": {
                'tb_document': document_id,
                'invoice': 0.0,
                'presented': False,
                'accepted': False,
                'payed': False,
                'closed': False,
                'urgency': False,
                'tb_sibs': None
            }
        }), 200


@bp.route("/payments/checkout", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def create_checkout():
    """
    Criar Nova Transação de Checkout
    ---
    tags:
      - Pagamentos
    summary: Configura internamente uma Sessão de Pagamento com intenção declarada de utilizar um método especificamente.
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
          properties:
            document_id:
              type: integer
            amount:
              type: number
            payment_method:
              type: string
    responses:
      200:
        description: Sessão de compra autorizada.
    """
    data = request.json or {}
    required = ["document_id", "amount", "payment_method"]

    if not all(k in data for k in required):
        return jsonify({"error": f"Campos obrigatórios: {required}"}), 400

    # Garantir que amount é numérico e > 0 antes do Pydantic
    try:
        amount_val = float(data.get("amount", 0) or 0)
    except (ValueError, TypeError):
        amount_val = 0

    if amount_val <= 0:
        return jsonify({
            "success": False,
            "error": "O valor do pagamento deve ser superior a 0€. Verifique se a fatura foi calculada correctamente."
        }), 400

    # Normalizar amount para float (evita string '0' vinda da serialização Decimal)
    data["amount"] = amount_val

    # ✅ VERIFICAR PERMISSÃO PARA O MÉTODO ESPECÍFICO
    payment_method = data.get("payment_method")
    has_permission, user_id, user_profile = check_payment_method_permission(
        payment_method)

    if not has_permission:
        logger.warning(
            f"Checkout negado - método: {payment_method}, user: {user_id}")
        return jsonify({
            "success": False,
            "error": f"Sem permissão para {payment_method}",
            "required_permission": f"payments.{payment_method.lower()}"
        }), 403

    user = get_jwt_identity()
    result = payment_service.create_checkout_only(data, user)
    return jsonify(result), 200


@bp.route("/payments/mbway", methods=["POST"])
@jwt_required()
@token_required
@set_session
@require_permission(700)  # payments.mbway
@api_error_handler
def process_mbway():
    """
    Processar Pagamento (Integração SIBS MBWay)
    ---
    tags:
      - Pagamentos
    summary: Dispara uma notificação para a SIBS cobrar um token telefone indicado, associado ao checkout.
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      200:
        description: Requisitado via SIBS.
    """
    # A validação dos campos é agora feita pelo Pydantic no serviço
    data = request.get_json()
    user = get_jwt_identity()
    result = payment_service.process_mbway_from_checkout(data, user)
    return jsonify(result), 200


@bp.route("/payments/multibanco", methods=["POST"])
@jwt_required()
@token_required
@set_session
@require_permission(710)  # payments.multibanco
@api_error_handler
def process_multibanco():
    """
    Processar Pagamento (Ref. MULTIBANCO)
    ---
    tags:
      - Pagamentos
    summary: Pede à SIBS a emissão de uma Entidade, Referência de Valor Fixo limitados à transação local do Utilizador.
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      200:
        description: Referências geradas (Entidade/Referência/Valor).
    """
    data = request.get_json()
    user = get_jwt_identity()
    result = payment_service.process_multibanco_from_checkout(data, user)
    return jsonify(result), 200


@bp.route("/payments/manual-direct", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def register_manual_payment():
    """
    Registar Pagamento (Métodos Manuais / Backoffice)
    ---
    tags:
      - Pagamentos
    summary: Informa o sistema que um pagamento via Transferência, Caixa Física ou Isenção Municipalística foi recebido com sucesso.
    security:
      - BearerAuth: []
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      200:
        description: Registo interno concretizado.
    """
    data = request.get_json()
    # ✅ USAR NOVO SISTEMA DE PERMISSÕES
    payment_method = data.get("payment_type")
    has_permission, _, _ = check_payment_method_permission(payment_method)

    if not has_permission:
        return jsonify({"error": f"Sem permissão para o método de pagamento {payment_method}"}), 403
    
    user_session = get_jwt_identity()
    result = payment_service.register_manual_payment_direct(data, user_session)
    return jsonify(result), 200

# ✅ ENDPOINTS ADMINISTRATIVOS - MIGRADOS PARA NOVO SISTEMA


@bp.route("/payments/pending", methods=["GET"])
@jwt_required()
@require_permission(30)  # admin.payments  # ✅ USAR DECORATOR
@token_required
@set_session
@api_error_handler
def get_pending_payments():
    """
    Listar Pagamentos Pendentes de Validação (Admin)
    ---
    tags:
      - Pagamentos (Admin)
    summary: Visão geral de faturas que aguardam confirmação do backoffice financeiro.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Matriz de registos e talões de pagamento entregues.
    """
    user = get_jwt_identity()
    payments = payment_service.get_pending_payments(user)
    return jsonify({"success": True, "payments": payments}), 200


@bp.route("/payments/details/<int:payment_pk>", methods=["GET"])
@jwt_required()
@require_permission(30)  # admin.payments  # ✅ USAR DECORATOR
@token_required
@set_session
@api_error_handler
def get_payment_details(payment_pk):
    """
    Detalhes de Transação (Admin)
    ---
    tags:
      - Pagamentos (Admin)
    summary: Carrega detalhadamente o log operacional, metadados SIBS e talão físico (quando existr) alocado na PK Transação.
    security:
      - BearerAuth: []
    parameters:
      - name: payment_pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Informação extensa sobre a transação.
    """
    user = get_jwt_identity()
    details = payment_service.get_payment_details(payment_pk, user)
    if not details:
        return jsonify({"success": False, "error": "Não encontrado"}), 404
    return jsonify({"success": True, "payment": details}), 200


@bp.route("/payments/approve/<int:payment_pk>", methods=["PUT"])
@jwt_required()
@require_permission(30)  # admin.payments  # ✅ USAR DECORATOR
@token_required
@set_session
@api_error_handler
def approve_payment(payment_pk):
    """
    Confirmar / Aprovar Conciliação Bancaria (Admin)
    ---
    tags:
      - Pagamentos (Admin)
    summary: Dá entrada à receita. Liberta eventuais passos bloqueados aguardando pagamento no Documento.
    security:
      - BearerAuth: []
    parameters:
      - name: payment_pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Operação concilida validamente com os parâmetros do Documento.
    """
    user = get_jwt_identity()
    user_id, _, _, _ = get_user_permissions_from_jwt()

    result = payment_service.approve_payment(payment_pk, user_id, user)
    return jsonify(result), (200 if result.get("success") else 400)


@bp.route("/payments/history", methods=["GET"])
@jwt_required()
@require_permission(30)  # admin.payments  # ✅ USAR DECORATOR
@token_required
@set_session
@api_error_handler
def get_payment_history():
    """
    Histórico Exaustivo (Admin)
    ---
    tags:
      - Pagamentos (Admin)
    summary: Procura transações por método, datas e status (Com Paginação).
    security:
      - BearerAuth: []
    parameters:
      - in: query
        name: page
        type: integer
      - in: query
        name: page_size
        type: integer
      - in: query
        name: start_date
        type: string
      - in: query
        name: end_date
        type: string
      - in: query
        name: method
        type: string
      - in: query
        name: status
        type: string
    responses:
      200:
        description: Tabelas devolvidas com totais gerais incluídos na resposta.
    """
    user = get_jwt_identity()
    page = int(request.args.get('page', 1))
    page_size = min(int(request.args.get('page_size', 10)), 50)

    filters = {
        'start_date': request.args.get('start_date'),
        'end_date': request.args.get('end_date'),
        'method': request.args.get('method'),
        'status': request.args.get('status')
    }

    result = payment_service.get_payment_history(user, page, page_size, filters)
    return jsonify(result), 200

@bp.route("/payments/refund/<int:payment_pk>", methods=["POST"])
@jwt_required()
@require_permission(30)  # admin.payments
@token_required
@set_session
@api_error_handler
def refund_payment(payment_pk):
    """
    Efetuar Reembolso Parcial / Total (Admin)
    ---
    tags:
      - Pagamentos (Admin)
    summary: Regista nota de crédito e extorno físico (Quando compatível via API SIBS/Entidades).
    security:
      - BearerAuth: []
    parameters:
      - name: payment_pk
        in: path
        type: integer
        required: true
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      200:
        description: Extorno processado (nota devolvida com UUID transação).
    """
    data = request.get_json() or {}
    reason = data.get("reason", "").strip()
    user = get_jwt_identity()
    result = payment_service.refund_payment(payment_pk, reason, user)
    return jsonify(result), 200


# ===== ENDPOINTS SEM RESTRIÇÕES =====


@bp.route("/payments/status/<transaction_id>", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def check_payment_status(transaction_id):
    """
    Verificar Estado da Transação (Póling)
    ---
    tags:
      - Pagamentos
    summary: Utilizada fundamentalmente nos ecrãs de Spinner para validar alterações de estado SIBS passivas (Via App MBWay user action).
    security:
      - BearerAuth: []
    parameters:
      - name: transaction_id
        in: path
        type: string
        required: true
    responses:
      200:
        description: Info (Status Concluído = 2/Paid).
    """
    user = get_jwt_identity()
    result = payment_service.check_payment_status(transaction_id, user)
    return jsonify(result), 200


@bp.route("/payments/webhook", methods=["POST"])
def webhook():
    """
    Webhook SIBS - DEPRECATED.
    Usar /api/v1/webhook/sibs que inclui desencriptação AES-GCM.
    Este endpoint mantido para compatibilidade.
    """
    from app.routes.webhook_routes import sibs_webhook
    return sibs_webhook()


# ===== ENDPOINTS DE ISENÇÕES =====


@bp.route("/payments/exemptions/submit", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def submit_exemption():
    """
    Declarar Isenção de Taxa / Tarifa
    ---
    tags:
      - Pagamentos
    summary: Formulação oficial de requerimento em fluxo para validar como Isento a liquidação (Apenas Entidades Municipais com Acordo).
    security:
      - BearerAuth: []
    consumes:
      - application/json
    parameters:
      - in: body
        name: body
        required: true
        schema:
          type: object
    responses:
      200:
        description: Pedido registado e entregue aos Admins (Tesouraria).
    """
    data = request.get_json() or {}
    document_id = data.get("document_id")
    if not document_id:
        return jsonify({"error": "document_id é obrigatório"}), 400

    user = get_jwt_identity()
    result = payment_service.submit_exemption(document_id, user)
    return jsonify(result), 200


@bp.route("/payments/exemptions/pending", methods=["GET"])
@jwt_required()
@require_permission(30)  # admin.payments
@token_required
@set_session
@api_error_handler
def get_pending_exemptions():
    """
    Listar Pedidos de Isenção Pendentes (Admin)
    ---
    tags:
      - Pagamentos (Admin)
    summary: Monitor Tesouraria com lista e dados de fundamentação das recusas operadas aos emolumentos base de um Pedido.
    security:
      - BearerAuth: []
    responses:
      200:
        description: Array list.
    """
    user = get_jwt_identity()
    exemptions = payment_service.get_pending_exemptions(user)
    return jsonify({"success": True, "exemptions": exemptions}), 200


@bp.route("/payments/exemptions/<int:payment_pk>/approve", methods=["PUT"])
@jwt_required()
@require_permission(30)  # admin.payments
@token_required
@set_session
@api_error_handler
def approve_exemption(payment_pk):
    """
    Aprovar/Dar Aval à Isenção de Custo (Admin)
    ---
    tags:
      - Pagamentos (Admin)
    summary: Termina a transação a cêntimos/euros Zero prosseguindo o workflow de Documento formalmente (Ações Gratuitas Institucionais).
    security:
      - BearerAuth: []
    parameters:
      - name: payment_pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Sucesso.
    """
    user = get_jwt_identity()
    user_id, _, _, _ = get_user_permissions_from_jwt()
    result = payment_service.approve_exemption(payment_pk, user_id, user)
    return jsonify(result), (200 if result.get("success") else 400)


@bp.route("/payments/exemptions/<int:payment_pk>/reject", methods=["PUT"])
@jwt_required()
@require_permission(30)  # admin.payments
@token_required
@set_session
@api_error_handler
def reject_exemption(payment_pk):
    """
    Não Aprovar Isenção Tarifária (Admin)
    ---
    tags:
      - Pagamentos (Admin)
    summary: Reabre o checkout obrigando efetivamente o requerente final a desembolsar/cobrar a Entidade os emolumentos pendentes sem desconto Instituição Município.
    security:
      - BearerAuth: []
    parameters:
      - name: payment_pk
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Sucesso.
    """
    user = get_jwt_identity()
    user_id, _, _, _ = get_user_permissions_from_jwt()
    result = payment_service.reject_exemption(payment_pk, user_id, user)
    return jsonify(result), (200 if result.get("success") else 400)


# ===== ENDPOINTS DE DEBUG =====


@bp.route("/payments/debug/permissions", methods=["GET"])
@jwt_required()
@token_required
@set_session
def debug_permissions():
    """Debug permissões - ATUALIZADO PARA NOVO SISTEMA"""
    user_id, user_profile, user_interfaces, all_permissions = get_user_permissions_from_jwt()

    # ✅ USAR NOVO SISTEMA PARA DEBUG
    payment_permissions = {}
    for method_name, method_key in PAYMENT_METHODS.items():
        has_permission, _, _ = check_payment_method_permission(method_key)
        payment_permissions[method_name] = {
            'can_use': has_permission,
            'permission_id': f"payments.{method_key.lower()}"
        }

    # Verificar permissão de gestão
    has_admin, _, _ = check_payment_admin_permission()

    return jsonify({
        "user_id": user_id,
        "user_profile": user_profile,
        "user_interfaces": user_interfaces,
        "can_manage_payments": has_admin,
        "payment_permissions": payment_permissions,
        "all_permissions": all_permissions,
        "system_info": {
            "using_new_permission_system": True,
            "total_permissions": len(all_permissions)
        }
    }), 200


@bp.route("/payments/contracts", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_contracts():
    """Listar contratos da vista vbl_contract"""
    has_permission, _, _ = check_payment_admin_permission()
    if not has_permission:
        return jsonify({"erro": "Sem permissão"}), 403

    user = get_jwt_identity()
    from app.utils.utils import db_session_manager
    from sqlalchemy.sql import text

    with db_session_manager(user) as session:
        result = session.execute(text(
            "SELECT c.pk, c.ts_entity, c.nipc, c.start_date, c.stop_date, c.family, "
            "c.tt_contractfrequency, c.address, c.postal, c.door, c.floor, c.nut1, c.nut2, c.nut3, c.nut4, "
            "e.email "
            "FROM vbl_contract c "
            "LEFT JOIN vbf_entity e ON e.nipc = c.nipc "
            "ORDER BY c.pk DESC"
        ))
        columns = result.keys()
        contracts = [dict(zip(columns, row)) for row in result]

    return jsonify({"success": True, "contracts": contracts}), 200


@bp.route("/payments/contracts", methods=["POST"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def create_contract():
    """Criar contrato via vbf_contract"""
    has_permission, _, _ = check_payment_admin_permission()
    if not has_permission:
        return jsonify({"erro": "Sem permissão"}), 403

    user = get_jwt_identity()
    data = request.get_json()

    required = ['ts_entity', 'start_date']
    for field in required:
        if not data.get(field):
            return jsonify({"erro": f"Campo obrigatório em falta: {field}"}), 400

    from app.utils.utils import db_session_manager
    from sqlalchemy.sql import text

    def to_int(val):
        try:
            return int(val) if val not in (None, '', 'None') else None
        except (ValueError, TypeError):
            return None

    ts_entity = to_int(data.get("ts_entity"))

    with db_session_manager(user) as session:
        pk = session.execute(text("SELECT fs_nextcode()")).scalar()
        session.execute(text(
            "INSERT INTO vbf_contract (pk, ts_entity, start_date, stop_date, family, tt_contractfrequency, "
            "address, postal, door, floor, nut1, nut2, nut3, nut4) "
            "VALUES (:pk, :ts_entity, :start_date, :stop_date, :family, :tt_contractfrequency, "
            ":address, :postal, :door, :floor, :nut1, :nut2, :nut3, :nut4)"
        ), {
            "pk": pk,
            "ts_entity": ts_entity,
            "start_date": data.get("start_date"),
            "stop_date": data.get("stop_date") or None,
            "family": to_int(data.get("family")),
            "tt_contractfrequency": to_int(data.get("tt_contractfrequency")),
            "address": data.get("address") or None,
            "postal": data.get("postal") or None,
            "door": data.get("door") or None,
            "floor": data.get("floor") or None,
            "nut1": data.get("nut1") or None,
            "nut2": data.get("nut2") or None,
            "nut3": data.get("nut3") or None,
            "nut4": data.get("nut4") or None,
        })

    return jsonify({"success": True}), 201


@bp.route("/payments/contracts/<int:contract_pk>/payments/<int:payment_pk>/invoice", methods=["PATCH"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def invoice_contract_payment(contract_pk, payment_pk):
    """Registar data de faturação — actualiza coluna presented"""
    has_permission, _, _ = check_payment_admin_permission()
    if not has_permission:
        return jsonify({"erro": "Sem permissão"}), 403

    user = get_jwt_identity()
    from app.utils.utils import db_session_manager
    from sqlalchemy.sql import text

    data = request.get_json()
    invoice_date = data.get("invoice_date") if data else None

    with db_session_manager(user) as session:
        session.execute(text(
            "UPDATE vbf_contract_payment SET presented = :invoice_date "
            "WHERE pk = :pk AND tb_contract = :contract_pk"
        ), {"invoice_date": invoice_date, "pk": payment_pk, "contract_pk": contract_pk})

    return jsonify({"success": True}), 200


@bp.route("/payments/contracts/<int:contract_pk>/payments/<int:payment_pk>/validate", methods=["PATCH"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def validate_contract_payment(contract_pk, payment_pk):
    """Validar pagamento de contrato — actualiza coluna payed"""
    has_permission, _, _ = check_payment_admin_permission()
    if not has_permission:
        return jsonify({"erro": "Sem permissão"}), 403

    user = get_jwt_identity()
    from app.utils.utils import db_session_manager
    from sqlalchemy.sql import text

    data = request.get_json()
    payed_date = data.get("payed_date") if data else None
    if not payed_date:
        return jsonify({"erro": "Data de pagamento obrigatória"}), 400

    with db_session_manager(user) as session:
        session.execute(text(
            "UPDATE vbf_contract_payment SET payed = :payed_date "
            "WHERE pk = :pk AND tb_contract = :contract_pk"
        ), {"payed_date": payed_date, "pk": payment_pk, "contract_pk": contract_pk})

    return jsonify({"success": True}), 200


@bp.route("/payments/contracts/alerts", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_contract_payment_alerts():
    """Pagamentos faturados mas não pagos, com info de prazo (presented + 30 dias)"""
    has_permission, _, _ = check_payment_admin_permission()
    if not has_permission:
        return jsonify({"erro": "Sem permissão"}), 403

    user = get_jwt_identity()
    from app.utils.utils import db_session_manager
    from sqlalchemy.sql import text
    from datetime import date, timedelta

    today = date.today()

    with db_session_manager(user) as session:
        result = session.execute(text("""
            SELECT cp.pk, cp.tb_contract, cp.start_date, cp.stop_date, cp.value,
                   cp.presented, cp.payed,
                   c.ts_entity, c.nipc,
                   e.email
            FROM vbl_contract_payment cp
            JOIN vbl_contract c ON c.pk = cp.tb_contract
            JOIN vbf_entity e ON e.nipc = c.nipc
            WHERE cp.presented IS NOT NULL AND cp.payed IS NULL
            ORDER BY cp.presented
        """))
        columns = result.keys()
        alerts = []
        for row in result:
            r = dict(zip(columns, row))
            presented_date = r['presented'].date() if hasattr(r['presented'], 'date') else r['presented']
            deadline = (presented_date + timedelta(days=30)) if presented_date else None
            r['deadline'] = deadline.isoformat() if deadline else None
            r['overdue'] = (today > deadline) if deadline else False
            alerts.append(r)

    return jsonify({"success": True, "alerts": alerts}), 200


@bp.route("/payments/contracts/<int:contract_pk>/payments", methods=["GET"])
@jwt_required()
@token_required
@set_session
@api_error_handler
def get_contract_payments(contract_pk):
    """Listar pagamentos de um contrato via vbl_contract_payment"""
    has_permission, _, _ = check_payment_admin_permission()
    if not has_permission:
        return jsonify({"erro": "Sem permissão"}), 403

    user = get_jwt_identity()
    from app.utils.utils import db_session_manager
    from sqlalchemy.sql import text

    with db_session_manager(user) as session:
        result = session.execute(text(
            "SELECT pk, tb_contract, start_date, stop_date, value, presented, payed "
            "FROM vbl_contract_payment WHERE tb_contract = :pk ORDER BY start_date"
        ), {"pk": contract_pk})
        columns = result.keys()
        payments = [dict(zip(columns, row)) for row in result]

    return jsonify({"success": True, "payments": payments}), 200


@bp.route("/payments/debug/migration-status", methods=["GET"])
@jwt_required()
@token_required
@set_session
def debug_migration_status():
    """Debug status da migração"""
    user_id, user_profile, user_interfaces, permissions = get_user_permissions_from_jwt()

    # Comparar sistema antigo vs novo
    comparison = {}

    # Para cada método, comparar resultado antigo vs novo
    for method_name, method_key in PAYMENT_METHODS.items():
        # Novo sistema
        new_result, _, _ = check_payment_method_permission(method_key)

        comparison[method_name] = {
            'new_system': new_result,
            'permission_used': f"payments.{method_key.lower()}"
        }

    # Gestão de pagamentos
    new_admin, _, _ = check_payment_admin_permission()

    return jsonify({
        "migration_status": "IN_PROGRESS",
        "user_context": {
            "user_id": user_id,
            "profile": user_profile,
            "interfaces": user_interfaces
        },
        "permission_comparison": comparison,
        "admin_permissions": {
            "new_system": new_admin,
            "permission_used": "payments.validate"
        },
        "recommendations": [
            "✅ Sistema novo implementado",
            "⚠️ Funções antigas mantidas para compatibilidade",
            "🔄 Migração gradual em curso",
            "📊 Monitorizar logs para inconsistências"
        ]
    }), 200
