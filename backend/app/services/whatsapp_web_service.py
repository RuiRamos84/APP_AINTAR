# app/services/whatsapp_web_service.py
"""
Serviço Flask que comunica com o microserviço Node.js whatsapp-web.js.

Variáveis de ambiente necessárias:
    WA_SERVICE_URL   URL base do microserviço  (default: http://localhost:3010)
    WA_API_KEY       Chave de API partilhada    (default: aintar-wa-2025)
"""

import os
import json as _json
import subprocess
import sys
from app.utils.error_handler import api_error_handler, APIError
from app.utils.logger import get_logger
from app.services.alert_whatsapp_service import get_latest_alert

logger = get_logger(__name__)

WA_SERVICE_URL  = os.getenv('WA_SERVICE_URL', 'http://localhost:3010')
WA_API_KEY      = os.getenv('WA_API_KEY', 'aintar-wa-2025')
WA_GROUP_INVITE = os.getenv('WA_GROUP_INVITE', '')

# Script inline executado em subprocess separado — fora do eventlet monkey-patch
_HTTP_SCRIPT = """
import sys, json, urllib.request, urllib.error
p = json.loads(sys.argv[1])
url  = p['url']
meth = p['method']
body = json.dumps(p['body']).encode() if p.get('body') else None
req  = urllib.request.Request(url, data=body, method=meth)
req.add_header('x-api-key', p['api_key'])
req.add_header('Content-Type', 'application/json')
try:
    with urllib.request.urlopen(req, timeout=15) as r:
        print(json.dumps({'status': r.status, 'body': json.loads(r.read())}))
except urllib.error.HTTPError as e:
    b = json.loads(e.read()) if e.fp else {}
    print(json.dumps({'status': e.code, 'body': b}))
except Exception as e:
    print(json.dumps({'status': 502, 'body': {'error': str(e)}}))
"""


def _call(method: str, path: str, body: dict = None):
    """
    Chama o microserviço WhatsApp via subprocess para contornar o
    monkey-patch do eventlet que bloqueia I/O de rede no processo principal.
    """
    payload = _json.dumps({
        'url':     f'{WA_SERVICE_URL}{path}',
        'method':  method,
        'body':    body,
        'api_key': WA_API_KEY,
    })
    try:
        result = subprocess.run(
            [sys.executable, '-c', _HTTP_SCRIPT, payload],
            capture_output=True, text=True, timeout=20,
        )
        if result.returncode != 0:
            raise APIError(f'Subprocess falhou: {result.stderr.strip()}', 502, 'ERR_WA_CONNECT')

        data = _json.loads(result.stdout.strip())
        return data['body'], data['status']

    except subprocess.TimeoutExpired:
        raise APIError('Microserviço WhatsApp não respondeu (timeout)', 504, 'ERR_WA_TIMEOUT')
    except APIError:
        raise
    except Exception as e:
        raise APIError(f'Erro ao contactar microserviço WhatsApp: {str(e)}', 502, 'ERR_WA_CONNECT')


@api_error_handler
def get_whatsapp_status():
    data, _ = _call('GET', '/status')
    return data, 200


@api_error_handler
def get_qr_code():
    data, _ = _call('GET', '/qr')
    return data, 200


@api_error_handler
def open_whatsapp():
    """Abre o Chrome com web.whatsapp.com para o utilizador fazer o scan do QR."""
    data, _ = _call('POST', '/open')
    return data, 200


@api_error_handler
def disconnect_whatsapp():
    data, _ = _call('POST', '/disconnect')
    return data, 200


@api_error_handler
def send_whatsapp_message(phone: str, message: str):
    data, status = _call('POST', '/send', body={'phone': phone, 'message': message})
    if status != 200:
        raise APIError(data.get('error', 'Erro ao enviar mensagem'), status, 'ERR_WA_SEND')
    return data, 200


@api_error_handler
def join_whatsapp_group(invite_code: str):
    """Entra num grupo WhatsApp via link de convite e devolve o groupId."""
    data, status = _call('POST', '/join', body={'inviteCode': invite_code})
    if status != 200:
        raise APIError(data.get('error', 'Erro ao entrar no grupo'), status, 'ERR_WA_JOIN')
    return data, 200


@api_error_handler
def get_whatsapp_groups():
    """Devolve a lista de grupos WhatsApp onde a conta participa (via microserviço)."""
    data, _ = _call('GET', '/groups')
    return data, 200


# ── Configuração de grupos auto-alerta (tabela tb_whatsapp_config) ──────────

@api_error_handler
def get_configured_groups():
    """Devolve os grupos guardados em tb_whatsapp_config."""
    from app import db
    from sqlalchemy import text
    rows = db.session.execute(
        text("SELECT pk, group_id, group_name, ativo, criado_em FROM tb_whatsapp_config ORDER BY group_name")
    ).mappings().fetchall()
    groups = [
        {
            'pk':         r['pk'],
            'group_id':   r['group_id'],
            'group_name': r['group_name'],
            'ativo':      r['ativo'],
            'criado_em':  r['criado_em'].isoformat() if r['criado_em'] else None,
        }
        for r in rows
    ]
    return {'status': 'ok', 'groups': groups}, 200


@api_error_handler
def add_configured_group(group_id: str, group_name: str):
    """Adiciona um grupo à lista de auto-alerta."""
    from app import db
    from sqlalchemy import text
    from sqlalchemy.exc import IntegrityError
    try:
        db.session.execute(
            text("""
                INSERT INTO tb_whatsapp_config (group_id, group_name)
                VALUES (:gid, :name)
                ON CONFLICT (group_id) DO UPDATE SET group_name = EXCLUDED.group_name, ativo = TRUE
            """),
            {'gid': group_id, 'name': group_name},
        )
        db.session.commit()
        return {'status': 'ok', 'message': 'Grupo adicionado'}, 201
    except IntegrityError:
        db.session.rollback()
        raise APIError('Grupo já existe', 409, 'ERR_DUPLICATE')


@api_error_handler
def remove_configured_group(pk: int):
    """Remove um grupo da lista de auto-alerta."""
    from app import db
    from sqlalchemy import text
    db.session.execute(
        text("DELETE FROM tb_whatsapp_config WHERE pk = :pk"),
        {'pk': pk},
    )
    db.session.commit()
    return {'status': 'ok', 'message': 'Grupo removido'}, 200


@api_error_handler
def toggle_configured_group(pk: int, ativo: bool):
    """Activa ou desactiva um grupo sem o remover."""
    from app import db
    from sqlalchemy import text
    db.session.execute(
        text("UPDATE tb_whatsapp_config SET ativo = :ativo WHERE pk = :pk"),
        {'ativo': ativo, 'pk': pk},
    )
    db.session.commit()
    return {'status': 'ok', 'message': 'Estado actualizado'}, 200


def _get_default_group_id() -> str:
    """
    Devolve o group_id do grupo padrão.
    Se ainda não estiver em tb_whatsapp_config, junta-se via WA_GROUP_INVITE e guarda.
    """
    from app import db
    from sqlalchemy import text

    row = db.session.execute(
        text("SELECT group_id, group_name FROM tb_whatsapp_config ORDER BY pk LIMIT 1")
    ).mappings().fetchone()

    if row:
        return row['group_id']

    if not WA_GROUP_INVITE:
        raise APIError('Nenhum grupo configurado e WA_GROUP_INVITE não definido', 400, 'ERR_NO_GROUP')

    # Junta-se ao grupo pela primeira vez
    invite_code = WA_GROUP_INVITE.replace('https://chat.whatsapp.com/', '').strip()
    join_data, join_status = _call('POST', '/join', body={'inviteCode': invite_code})
    if join_status != 200:
        raise APIError(join_data.get('error', 'Erro ao entrar no grupo'), join_status, 'ERR_WA_JOIN')

    group_id = join_data.get('groupId', '')
    if not group_id:
        raise APIError('Não foi possível obter o ID do grupo', 500, 'ERR_WA_JOIN')

    # Tenta obter o nome real
    groups_data, _ = _call('GET', '/groups')
    groups = groups_data.get('groups', [])
    match = next((g for g in groups if g['id'] == group_id), None)
    group_name = match['name'] if match else group_id

    db.session.execute(
        text("""
            INSERT INTO tb_whatsapp_config (group_id, group_name)
            VALUES (:gid, :name)
            ON CONFLICT (group_id) DO UPDATE SET group_name = EXCLUDED.group_name, ativo = TRUE
        """),
        {'gid': group_id, 'name': group_name},
    )
    db.session.commit()
    logger.info(f"Grupo padrão configurado automaticamente: {group_name} ({group_id})")
    return group_id


@api_error_handler
def send_alert_to_default_group(pk: int = None):
    """Envia o alerta mais recente para o grupo padrão (env ou BD). Junta-se automaticamente se necessário."""
    group_id = _get_default_group_id()
    return send_sensor_alert_to_group(group_id=group_id, pk=pk)


@api_error_handler
def send_group_message(group_id: str, message: str):
    data, status = _call('POST', '/send-group', body={'groupId': group_id, 'message': message})
    if status != 200:
        raise APIError(data.get('error', 'Erro ao enviar para grupo'), status, 'ERR_WA_SEND')
    return data, 200


@api_error_handler
def send_sensor_alert_to_group(group_id: str, pk: int = None):
    """Obtém o alerta mais recente da BD e envia para um grupo WhatsApp."""
    alert_result, alert_status = get_latest_alert(pk)
    if alert_status != 200:
        return alert_result, alert_status

    sensor_id      = alert_result.get('sensor_id', 'desconhecido')
    alert_severity = alert_result.get('alert_severity', '')
    alert_message  = alert_result.get('alert_message', '')
    alert_pk       = alert_result.get('pk', '')

    if not alert_message:
        raise APIError('Sem mensagem de alerta no registo', 400, 'ERR_NO_ALERT_MESSAGE')

    severity_icon = {'critical': '🔴', 'high': '🟠', 'medium': '🟡', 'low': '🟢'}.get(
        alert_severity.lower(), '⚠️'
    )
    mensagem = (
        f"{severity_icon} *AINTAR — ALERTA DE SENSOR*\n\n"
        f"Sensor: {sensor_id}\n"
        f"Severidade: {alert_severity.upper()}\n\n"
        f"{alert_message}"
    )

    result, status = send_group_message(group_id, mensagem)
    if status != 200:
        return result, status

    logger.info(f"Alerta sensor {sensor_id} (pk={alert_pk}) enviado para grupo {group_id[:20]}...")
    return {
        'status': 'ok',
        'message': 'Alerta enviado com sucesso para o grupo WhatsApp',
        'sensor_id': sensor_id,
        'alert_severity': alert_severity,
        'pk': alert_pk,
    }, 200


@api_error_handler
def send_sensor_alert_whatsapp(phone: str, pk: int = None):
    """
    Obtém o alerta mais recente da BD e envia por WhatsApp via microserviço.
    """
    alert_result, alert_status = get_latest_alert(pk)
    if alert_status != 200:
        return alert_result, alert_status

    sensor_id      = alert_result.get('sensor_id', 'desconhecido')
    alert_severity = alert_result.get('alert_severity', '')
    alert_message  = alert_result.get('alert_message', '')
    alert_pk       = alert_result.get('pk', '')

    if not alert_message:
        raise APIError('Sem mensagem de alerta no registo', 400, 'ERR_NO_ALERT_MESSAGE')

    severity_icon = {'critical': '🔴', 'high': '🟠', 'medium': '🟡', 'low': '🟢'}.get(
        alert_severity.lower(), '⚠️'
    )

    mensagem = (
        f"{severity_icon} *AINTAR — ALERTA DE SENSOR*\n\n"
        f"Sensor: {sensor_id}\n"
        f"Severidade: {alert_severity.upper()}\n\n"
        f"{alert_message}"
    )

    send_result, send_status = send_whatsapp_message(phone, mensagem)
    if send_status != 200:
        return send_result, send_status

    logger.info(f"Alerta do sensor {sensor_id} (pk={alert_pk}) enviado para {phone[:6]}***")

    return {
        'status': 'ok',
        'message': 'Alerta enviado com sucesso via WhatsApp',
        'phone':   phone[:4] + '****' + phone[-3:],
        'sensor_id': sensor_id,
        'alert_severity': alert_severity,
        'pk': alert_pk,
    }, 200
