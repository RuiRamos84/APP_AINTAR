from .. import db
from ..utils.utils import format_message
from sqlalchemy import text


def get_notifications_count(user_id):
    try:
        result = db.session.execute(
            text(
                "SELECT COUNT(*) as count FROM vbl_document WHERE who = :user_id and what <> -1 AND notification = 1"),
            {"user_id": user_id}
        )
        row = result.fetchone()
        count = row.count if row else 0
        return {"count": count}  # Retorna um dicionário em vez de uma tupla
    except Exception as e:
        return {'error': f"Erro ao buscar contagem de notificações: {str(e)}"}, 500


def get_notifications(user_id):
    try:
        result = db.session.execute(
            text("SELECT * FROM vsl_client$self WHERE pk = :user_id"),
            {"user_id": user_id}
        )
        row = result.fetchone()
        return row.notification if row else None
    except Exception as e:
        return {'erro': f"Erro ao buscar notificação: {str(e)}"}, 500


def update_notification_status(document_id, status):
    try:
        db.session.execute(
            text("UPDATE vbf_document SET notification=:status WHERE pk=:document_id"),
            {"status": status, "document_id": document_id}
        )
        db.session.commit()
        return f"Notificação atualizada com sucesso para o documento {document_id}"
    except Exception as e:
        db.session.rollback()
        return f"Erro ao atualizar notificação para o documento {document_id}: {str(e)}"


def add_notification(user_id):
    try:
        result = db.session.execute(
            text("SELECT fsf_client_notificationadd(:user_id)"), {"user_id": user_id})
        s = result.scalar()
        db.session.commit()
        return format_message(s)
    except Exception as e:
        db.session.rollback()
        return f"Erro ao adicionar notificação: {str(e)}"


def delete_notifications(user_id):
    try:
        result = db.session.execute(
            text("SELECT fsf_client_notificationclean(:user_id)"), {"user_id": user_id})
        s = result.scalar()
        db.session.commit()
        return format_message(s)
    except Exception as e:
        db.session.rollback()
        return f"Erro ao deletar notificação: {str(e)}"
