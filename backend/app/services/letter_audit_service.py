"""
Letter Audit Service - Sistema completo de auditoria para ofícios
Registra todas as ações realizadas no módulo de ofícios
"""

from sqlalchemy.sql import text
from datetime import datetime
from typing import Dict, List, Optional
import json
import logging
from app.utils.error_handler import api_error_handler
from ..utils.utils import db_session_manager

logger = logging.getLogger(__name__)


class LetterAuditService:
    """Serviço de auditoria para ofícios"""

    # Tipos de ações auditáveis
    ACTION_TYPES = {
        # Templates
        'TEMPLATE_CREATE': 'Criação de template',
        'TEMPLATE_UPDATE': 'Atualização de template',
        'TEMPLATE_DELETE': 'Eliminação de template',
        'TEMPLATE_VIEW': 'Visualização de template',

        # Emissão
        'LETTER_GENERATE': 'Geração de ofício',
        'LETTER_PREVIEW': 'Preview de ofício',
        'LETTER_VIEW': 'Visualização de ofício',
        'LETTER_DOWNLOAD': 'Download de ofício',

        # Assinatura
        'LETTER_SIGN_CMD': 'Assinatura com CMD',
        'LETTER_SIGN_CC': 'Assinatura com CC',
        'LETTER_SIGN_VALIDATE': 'Validação de assinatura',

        # Administração
        'ADMIN_CLEANUP': 'Limpeza de ficheiros',
        'ADMIN_ORGANIZE': 'Organização de ficheiros',
        'ADMIN_ARCHIVE': 'Arquivamento de ofícios',

        # Sistema
        'NUMBERING_GENERATE': 'Geração de número',
        'TEMPLATE_VALIDATE': 'Validação de template',
    }

    @staticmethod
    @api_error_handler
    def log_action(
        user: str,
        action: str,
        letter_id: Optional[int] = None,
        letterstore_id: Optional[int] = None,
        details: Optional[Dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> int:
        """
        Regista uma ação no sistema de auditoria

        Args:
            user: Username do utilizador
            action: Tipo de ação (usar ACTION_TYPES)
            letter_id: ID do template (opcional)
            letterstore_id: ID do ofício emitido (opcional)
            details: Dados adicionais em formato dict
            ip_address: Endereço IP do utilizador
            user_agent: User agent do browser

        Returns:
            int: ID do registro de auditoria criado
        """
        with db_session_manager(user) as session:
            # Validar ação
            if action not in LetterAuditService.ACTION_TYPES:
                logger.warning(f"Tipo de ação desconhecido: {action}")

            # Preparar dados
            details_json = json.dumps(details) if details else None

            # Inserir registro
            query = text("""
                INSERT INTO tb_letter_audit (
                    pk, user_id, action, action_description,
                    letter_id, letterstore_id, details,
                    ip_address, user_agent, timestamp
                )
                VALUES (
                    fs_nextcode(), :user_id, :action, :action_description,
                    :letter_id, :letterstore_id, :details,
                    :ip_address, :user_agent, NOW()
                )
                RETURNING pk
            """)

            audit_id = session.execute(query, {
                'user_id': user,
                'action': action,
                'action_description': LetterAuditService.ACTION_TYPES.get(
                    action, 'Ação desconhecida'
                ),
                'letter_id': letter_id,
                'letterstore_id': letterstore_id,
                'details': details_json,
                'ip_address': ip_address,
                'user_agent': user_agent
            }).scalar()

            logger.info(
                f"Auditoria registada: {action} por {user} "
                f"(ID: {audit_id})"
            )

            return audit_id

    @staticmethod
    @api_error_handler
    def get_user_activity(
        user: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        action_type: Optional[str] = None,
        limit: int = 100,
        current_user: str = None
    ) -> List[Dict]:
        """
        Obtém histórico de atividades de um utilizador

        Args:
            user: Username do utilizador
            start_date: Data inicial (opcional)
            end_date: Data final (opcional)
            action_type: Filtrar por tipo de ação
            limit: Número máximo de resultados
            current_user: Utilizador que faz a consulta

        Returns:
            List[Dict]: Lista de atividades
        """
        with db_session_manager(current_user) as session:
            query = """
                SELECT
                    pk, user_id, action, action_description,
                    letter_id, letterstore_id, details,
                    ip_address, user_agent, timestamp
                FROM tb_letter_audit
                WHERE user_id = :user_id
            """

            params = {'user_id': user}

            if start_date:
                query += " AND timestamp >= :start_date"
                params['start_date'] = start_date

            if end_date:
                query += " AND timestamp <= :end_date"
                params['end_date'] = end_date

            if action_type:
                query += " AND action = :action_type"
                params['action_type'] = action_type

            query += " ORDER BY timestamp DESC LIMIT :limit"
            params['limit'] = limit

            result = session.execute(text(query), params).mappings().all()

            activities = []
            for row in result:
                activity = dict(row)
                # Parse JSON details
                if activity.get('details'):
                    try:
                        activity['details'] = json.loads(activity['details'])
                    except:
                        pass
                activities.append(activity)

            return activities

    @staticmethod
    @api_error_handler
    def get_letter_history(
        letter_id: Optional[int] = None,
        letterstore_id: Optional[int] = None,
        current_user: str = None
    ) -> List[Dict]:
        """
        Obtém histórico completo de um template ou ofício emitido

        Args:
            letter_id: ID do template
            letterstore_id: ID do ofício emitido
            current_user: Utilizador que faz a consulta

        Returns:
            List[Dict]: Histórico ordenado por data
        """
        if not letter_id and not letterstore_id:
            raise ValueError("Deve fornecer letter_id ou letterstore_id")

        with db_session_manager(current_user) as session:
            query = """
                SELECT
                    pk, user_id, action, action_description,
                    letter_id, letterstore_id, details,
                    ip_address, timestamp
                FROM tb_letter_audit
                WHERE 1=1
            """

            params = {}

            if letter_id:
                query += " AND letter_id = :letter_id"
                params['letter_id'] = letter_id

            if letterstore_id:
                query += " AND letterstore_id = :letterstore_id"
                params['letterstore_id'] = letterstore_id

            query += " ORDER BY timestamp DESC"

            result = session.execute(text(query), params).mappings().all()

            history = []
            for row in result:
                entry = dict(row)
                if entry.get('details'):
                    try:
                        entry['details'] = json.loads(entry['details'])
                    except:
                        pass
                history.append(entry)

            return history

    @staticmethod
    @api_error_handler
    def get_statistics(
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        current_user: str = None
    ) -> Dict:
        """
        Obtém estatísticas de auditoria

        Args:
            start_date: Data inicial (opcional)
            end_date: Data final (opcional)
            current_user: Utilizador que faz a consulta

        Returns:
            Dict com estatísticas:
            {
                'total_actions': 1500,
                'by_action_type': {...},
                'by_user': {...},
                'most_active_users': [...],
                'recent_actions': [...]
            }
        """
        with db_session_manager(current_user) as session:
            base_query = "FROM tb_letter_audit WHERE 1=1"
            params = {}

            if start_date:
                base_query += " AND timestamp >= :start_date"
                params['start_date'] = start_date

            if end_date:
                base_query += " AND timestamp <= :end_date"
                params['end_date'] = end_date

            # Total de ações
            total_query = text(f"SELECT COUNT(*) {base_query}")
            total = session.execute(total_query, params).scalar()

            # Por tipo de ação
            action_query = text(f"""
                SELECT action, action_description, COUNT(*) as count
                {base_query}
                GROUP BY action, action_description
                ORDER BY count DESC
            """)
            by_action = session.execute(action_query, params).fetchall()

            # Por utilizador (top 10)
            user_query = text(f"""
                SELECT user_id, COUNT(*) as count
                {base_query}
                GROUP BY user_id
                ORDER BY count DESC
                LIMIT 10
            """)
            by_user = session.execute(user_query, params).fetchall()

            # Ações recentes (últimas 20)
            recent_query = text(f"""
                SELECT user_id, action, action_description, timestamp
                {base_query}
                ORDER BY timestamp DESC
                LIMIT 20
            """)
            recent = session.execute(recent_query, params).fetchall()

            return {
                'total_actions': total,
                'by_action_type': {
                    row[0]: {
                        'description': row[1],
                        'count': row[2]
                    }
                    for row in by_action
                },
                'most_active_users': [
                    {'user': row[0], 'actions': row[1]}
                    for row in by_user
                ],
                'recent_actions': [
                    {
                        'user': row[0],
                        'action': row[1],
                        'description': row[2],
                        'timestamp': row[3].isoformat() if row[3] else None
                    }
                    for row in recent
                ]
            }

    @staticmethod
    @api_error_handler
    def search_audit_logs(
        search_term: str,
        search_field: str = 'all',
        limit: int = 100,
        current_user: str = None
    ) -> List[Dict]:
        """
        Pesquisa nos logs de auditoria

        Args:
            search_term: Termo de pesquisa
            search_field: Campo onde pesquisar ('all', 'user', 'action', 'details')
            limit: Número máximo de resultados
            current_user: Utilizador que faz a consulta

        Returns:
            List[Dict]: Registros encontrados
        """
        with db_session_manager(current_user) as session:
            if search_field == 'all':
                query = """
                    SELECT *
                    FROM tb_letter_audit
                    WHERE
                        user_id ILIKE :search_term OR
                        action ILIKE :search_term OR
                        action_description ILIKE :search_term OR
                        details::text ILIKE :search_term
                    ORDER BY timestamp DESC
                    LIMIT :limit
                """
            else:
                field_map = {
                    'user': 'user_id',
                    'action': 'action',
                    'details': 'details::text'
                }
                field = field_map.get(search_field, 'user_id')

                query = f"""
                    SELECT *
                    FROM tb_letter_audit
                    WHERE {field} ILIKE :search_term
                    ORDER BY timestamp DESC
                    LIMIT :limit
                """

            result = session.execute(
                text(query),
                {
                    'search_term': f'%{search_term}%',
                    'limit': limit
                }
            ).mappings().all()

            return [dict(row) for row in result]

    @staticmethod
    @api_error_handler
    def export_audit_logs(
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        format: str = 'json',
        current_user: str = None
    ) -> str:
        """
        Exporta logs de auditoria

        Args:
            start_date: Data inicial
            end_date: Data final
            format: Formato de exportação ('json' ou 'csv')
            current_user: Utilizador que faz a consulta

        Returns:
            str: Dados exportados no formato escolhido
        """
        activities = LetterAuditService.get_user_activity(
            user='%',  # Todos os utilizadores
            start_date=start_date,
            end_date=end_date,
            limit=10000,
            current_user=current_user
        )

        if format == 'json':
            return json.dumps(activities, indent=2, default=str)

        elif format == 'csv':
            import csv
            from io import StringIO

            output = StringIO()
            if activities:
                writer = csv.DictWriter(output, fieldnames=activities[0].keys())
                writer.writeheader()
                writer.writerows(activities)

            return output.getvalue()

        else:
            raise ValueError(f"Formato não suportado: {format}")


# Decorador para auditoria automática
def audit_action(action_type: str):
    """
    Decorador para registar automaticamente ações auditáveis

    Uso:
        @audit_action('TEMPLATE_CREATE')
        def create_template(...):
            ...
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Executar função
            result = func(*args, **kwargs)

            # Registar auditoria
            try:
                current_user = kwargs.get('current_user')
                if current_user:
                    LetterAuditService.log_action(
                        user=current_user,
                        action=action_type,
                        details={
                            'function': func.__name__,
                            'args': str(args)[:200],  # Limitar tamanho
                        }
                    )
            except Exception as e:
                logger.error(f"Erro ao registar auditoria: {str(e)}")

            return result

        return wrapper
    return decorator


# Script SQL para criar tabela de auditoria
CREATE_AUDIT_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS tb_letter_audit (
    pk SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    action_description VARCHAR(255),
    letter_id INTEGER REFERENCES tb_letter(pk) ON DELETE SET NULL,
    letterstore_id INTEGER REFERENCES tb_letterstore(pk) ON DELETE SET NULL,
    details JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_letter_audit_user ON tb_letter_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_letter_audit_action ON tb_letter_audit(action);
CREATE INDEX IF NOT EXISTS idx_letter_audit_timestamp ON tb_letter_audit(timestamp);
CREATE INDEX IF NOT EXISTS idx_letter_audit_letter ON tb_letter_audit(letter_id);
CREATE INDEX IF NOT EXISTS idx_letter_audit_letterstore ON tb_letter_audit(letterstore_id);
CREATE INDEX IF NOT EXISTS idx_letter_audit_details ON tb_letter_audit USING GIN(details);

-- Comentários
COMMENT ON TABLE tb_letter_audit IS 'Auditoria de ações no módulo de ofícios';
COMMENT ON COLUMN tb_letter_audit.details IS 'Dados adicionais em formato JSON';
"""


if __name__ == "__main__":
    print("Letter Audit Service")
    print("=" * 50)
    print("\nAction Types:")
    for key, value in LetterAuditService.ACTION_TYPES.items():
        print(f"  {key}: {value}")
