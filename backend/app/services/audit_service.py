"""
Trilho de auditoria persistente (ts_audit_log) — transversal à aplicação,
não específico de nenhum módulo. Ver backend/app/sql/audit_log.sql.
"""
import json
from sqlalchemy import text


def record(session, *, hist_client: int, action: str, resource: str,
           resource_id: int = None, meta: dict = None, ip: str = None) -> None:
    """
    Regista uma entrada em ts_audit_log usando uma sessão já aberta pelo
    chamador — a entrada participa na mesma transacção da acção que
    descreve (tudo-ou-nada: se a acção fizer rollback, a auditoria também).
    Nunca abre a sua própria sessão.
    """
    session.execute(text("""
        SELECT fbf_audit_log(:hist_client, :action, :resource, :resource_id, :meta, :ip)
    """), {
        'hist_client': hist_client,
        'action': action,
        'resource': resource,
        'resource_id': resource_id,
        'meta': json.dumps(meta) if meta is not None else None,
        'ip': ip,
    })
