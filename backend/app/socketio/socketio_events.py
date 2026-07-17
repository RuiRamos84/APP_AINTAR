from flask import request, current_app
import jwt
from flask_socketio import emit, join_room, leave_room, Namespace
from threading import Lock
from ..services.notification_service import notification_service, task_notification_service, central_notification_service
from ..services.auth_service import update_last_activity
from app.utils.logger import get_logger

logger = get_logger(__name__)

class SocketIOEvents(Namespace):
    def __init__(self, namespace=None):
        super().__init__(namespace)
        self.connected_users = {}
        self.user_lock = Lock()
        self.socketio = None  # Será definido no register_socket_events

    def on_connect(self):
        token = request.args.get('token')
        user_id_param = request.args.get('userId')

        try:
            if not token:
                logger.warning("Token não fornecido na conexão Socket.IO")
                return False

            decoded_token = jwt.decode(
                token, current_app.config['JWT_SECRET_KEY'], algorithms=["HS256"])
            user_id = decoded_token.get('user_id')
            session_id = decoded_token.get('session_id')

            if not user_id or not session_id:
                logger.warning(f"Dados inválidos na conexão Socket.IO - UserID: {user_id}, SessionID: {session_id}")
                return False

            room = f'user_{user_id}'
            join_room(room)
            with self.user_lock:
                self.connected_users[user_id] = request.sid

            emit('connection_response', {
                'status': 'connected',
                'userId': user_id,
                'sessionId': session_id
            })

            return True

        except Exception as e:
            logger.error(f'Erro na conexão Socket.IO: {str(e)}')
            return False

    def on_disconnect(self):
        """Remove o utilizador de connected_users para não emitir para sockets mortos."""
        sid = request.sid
        with self.user_lock:
            stale_user_id = next(
                (uid for uid, s in self.connected_users.items() if s == sid), None
            )
            if stale_user_id is not None:
                del self.connected_users[stale_user_id]

    def on_heartbeat(self, data):
        """Heartbeat via socket — substitui o pedido HTTP POST /auth/heartbeat
        quando o socket está ligado (AuthManager.sendHeartbeat() salta-o de
        propósito nesse caso). Mesma chave de cache que a rota HTTP: o
        session_id do JWT (get_jwt_identity()), não o user_id.
        """
        session_id = data.get('sessionId')
        if not session_id:
            return
        try:
            update_last_activity(session_id)
        except Exception as e:
            logger.error(f"Erro ao processar heartbeat via socket: {str(e)}")

    def emit_notification_count(self, user_id, session_id):
        """Busca a contagem de notificações no serviço e emite para o utilizador."""
        try:
            count = notification_service.get_notification_count(session_id)
            emit('notification_update', {'count': count}, room=f'user_{user_id}')
        except Exception as e:
            logger.error(f"Erro ao emitir contagem: {str(e)}")

    def on_get_notifications(self, data):
        user_id = data.get('userId')
        session_id = data.get('sessionId')
        if user_id and session_id:
            self.emit_notification_count(user_id, session_id)

    def on_mark_notification_read(self, data):
        document_id = data.get('documentId')
        user_id = data.get('userId')
        session_id = data.get('sessionId')

        if document_id and session_id:
            try:
                notification_service.mark_notification_as_read(document_id, session_id)
                self.emit_notification_count(user_id, session_id)
            except Exception as e:
                logger.error(
                    f"Erro ao marcar notificação: {str(e)}")

    def on_add_notification(self, data):
        document_id = data.get('documentId')
        user_id = data.get('userId')
        session_id = data.get('sessionId')

        if document_id and session_id:
            try:
                notification_service.add_notification(document_id, session_id)
                self.emit_notification_count(user_id, session_id)
            except Exception as e:
                logger.error(
                    f"Erro ao adicionar notificação: {str(e)}")

    # Método para emitir contagem de notificações de tarefas
    def emit_task_notification_count(self, user_id, session_id):
        try:
            count = task_notification_service.get_task_notification_count(user_id, session_id)
            room_id = f'user_{user_id}'
            # Emitir sempre para a room: socketio.emit é inofensivo se vazia,
            # e o gate por connected_users tem janelas de falso-negativo
            # (reconexão, múltiplos separadores) que perdiam a notificação.
            self.socketio.emit('task_notification_count', {'count': count}, room=room_id, namespace='/')
        except Exception as e:
            logger.error(
                f"Erro ao emitir contagem de tarefas: {str(e)}")

    # Handler para quando uma nota é adicionada ou tarefa atualizada
    def emit_task_notification(self, task_id, session_id, **kwargs):
        """Emite notificações quando uma tarefa é atualizada"""
        try:
            result = task_notification_service.prepare_task_notification(task_id, session_id)
            recipient_id = result['recipient_id']
            notification_data = result['notification_data']
            notification_data.update(kwargs)  # Adiciona dados extra como 'notification_type'

            # Dual-write na tabela central (fase A da unificação): os flags
            # legados (tb_task.notification_*) continuam a ser a fonte da UI
            # por-item por agora; isto só alimenta o feed central do sino.
            # Best-effort: se falhar, a notificação legada já foi escrita e o
            # utilizador continua a vê-la no card.
            try:
                notification_type = kwargs.get('notification_type', 'task_update')
                if notification_type == 'status_update':
                    message = f"Estado alterado para: {kwargs.get('status', '')}"
                else:
                    message = notification_data.get('content', 'Nova atualização')
                central_notification_service.add(
                    ts_client=recipient_id, type_='task', notification_type=notification_type,
                    title=notification_data.get('taskName', 'Tarefa'), message=message,
                    route=f"/intern/tasks?taskId={task_id}",
                    metadata={'task_id': task_id},
                )
            except Exception as central_err:
                logger.warning(f"Falha no dual-write central de notificação de tarefa: {central_err}")

            room_id = f'user_{recipient_id}'
            # Emitir sempre para a room (ver nota em emit_task_notification_count):
            # o destinatário pode estar ligado noutro separador/dispositivo que o
            # connected_users deste worker não conhece.
            # 'task_notification' é o gatilho de invalidação do feed central no
            # frontend-v2 (fase D da unificação) — os eventos de contagem/lista
            # legados ('task_notification_count', 'task_notifications') já não
            # têm listener e deixaram de ser emitidos aqui.
            self.socketio.emit('task_notification', notification_data, room=room_id, namespace='/')
        except Exception as e:
            logger.error(f"Erro ao emitir notificação de tarefa: {str(e)}", exc_info=True)

    # Handler para marcar notificação de tarefa como lida
    def on_mark_task_notification_read(self, data):
        task_id = data.get('taskId')
        user_id = data.get('userId')
        session_id = data.get('sessionId')

        logger.info(f"📖 MARK_TASK_NOTIFICATION_READ: task_id={task_id}, user_id={user_id}, session_id={session_id}")

        if task_id and user_id and session_id:
            try:
                logger.info(f"💾 Chamando task_notification_service.mark_task_notification_as_read...")
                task_notification_service.mark_task_notification_as_read(task_id, user_id, session_id)
                logger.info(f"✅ Notificação marcada como lida na BD para task_id={task_id}, user_id={user_id}")

                self.emit_task_notification_count(user_id, session_id)
                logger.info(f"🔢 Contador atualizado")

                self.socketio.emit('task_notifications_updated', {'taskId': task_id, 'read': True}, room=f'user_{user_id}', namespace='/')
                logger.info(f"📤 Evento task_notifications_updated emitido")
            except Exception as e:
                logger.error(f"❌ Erro ao marcar notificação: {str(e)}", exc_info=True)

    # Handler para obter todas as notificações de tarefa
    def on_get_task_notifications(self, data):
        user_id = data.get('userId')
        session_id = data.get('sessionId')

        if user_id and session_id:
            try:
                notifications = task_notification_service.get_all_task_notifications(user_id, session_id)
                # Usar self.socketio.emit para funcionar tanto em contexto Socket.IO quanto HTTP
                self.socketio.emit('task_notifications', {
                    'notifications': notifications,
                    'count': len(notifications)
                }, room=f'user_{user_id}', namespace='/')
            except Exception as e:
                logger.error(
                    f"Erro ao obter notificações: {str(e)}")

    # =========================================================================
    # PAYMENT NOTIFICATION HANDLERS
    # =========================================================================

    def emit_payment_status_update(self, transaction_id, payment_status, payment_method=None, webhook_data=None):
        """
        Emite notificação de atualização de status de pagamento via webhook SIBS.

        Faz broadcast para TODOS os utilizadores conectados, pois o webhook
        não contém informação sobre qual utilizador iniciou o pagamento.
        O frontend filtra pelo transaction_id relevante.
        """
        try:
            notification_data = {
                'type': 'payment_status_update',
                'transaction_id': transaction_id,
                'payment_status': payment_status,
                'payment_method': payment_method,
                **(webhook_data or {})
            }

            logger.info(
                f"Emitindo payment_status_update: transaction={transaction_id}, "
                f"status={payment_status}, method={payment_method}"
            )

            # Broadcast para todos os utilizadores conectados
            self.socketio.emit(
                'payment_status_update',
                notification_data,
                namespace='/'
            )

            logger.info(f"payment_status_update emitido com sucesso (broadcast)")

        except Exception as e:
            logger.error(f"Erro ao emitir payment_status_update: {str(e)}", exc_info=True)


    # =========================================================================
    # CENTRAL NOTIFICATION — caminho único para tipos persistidos
    # =========================================================================

    def emit_central_notification(self, user_ids: list, type_: str,
                                  notification_type: str, title: str,
                                  message: str, route: str, metadata: dict = None):
        """
        Persiste na tabela central e emite o evento genérico 'central_notification'
        para a room de cada destinatário. Tipos novos entram por aqui — não
        precisam de evento nem de handler próprios no frontend-v2 (handler único
        faz toast+som e invalida o feed React Query).

        Persist-then-emit: a linha tem de estar commitada antes do push, senão
        o refetch do cliente chega antes do INSERT e a notificação só aparece
        após reload. Emitir sempre para a room (inofensivo se vazia): o gate
        por connected_users tinha janelas de falso-negativo (reconexão,
        múltiplos separadores) que perdiam notificações.
        """
        import datetime
        for user_id in user_ids:
            if user_id is None:
                continue
            try:
                pk = central_notification_service.add(
                    ts_client=user_id, type_=type_, notification_type=notification_type,
                    title=title, message=message, route=route, metadata=metadata,
                )
                self.socketio.emit('central_notification', {
                    'notification_id': pk,
                    'type': type_,
                    'notification_type': notification_type,
                    'title': title,
                    'message': message,
                    'timestamp': datetime.datetime.now().isoformat(),
                    'route': route,
                    'metadata': metadata or {},
                }, room=f'user_{user_id}', namespace='/')
                logger.info(f"[CentralNotif] {type_}/{notification_type} → user {user_id}")
            except Exception as e:
                logger.error(f"[CentralNotif] Erro ao emitir {type_} para user {user_id}: {e}")

    def emit_operacao_notification(self, user_ids: list, notification_type: str,
                                   title: str, message: str,
                                   meta_pk: int = None, operacao_pk: int = None):
        """
        Notificação de operação.

        notification_type:
          - 'nova_tarefa'      → nova meta atribuída ao operador
          - 'tarefa_executada' → operador concluiu execução (notifica supervisor)
          - 'tarefa_validada'  → supervisor validou execução (notifica operador)
        """
        # nova_tarefa é dirigida ao operador (ecrã de tarefas); os restantes
        # tipos notificam o supervisor. A rota persistida tem de refletir isso
        # para a navegação genérica por `route` no NotificationCenter.
        route = '/operation/tasks' if notification_type == 'nova_tarefa' else '/operation/supervisor'
        self.emit_central_notification(
            user_ids, 'operacao', notification_type, title, message, route,
            metadata={'meta_pk': meta_pk, 'operacao_pk': operacao_pk},
        )

    def emit_licenca_notification(self, user_ids: list, notification_type: str,
                                   title: str, message: str, tb_etar: int = None):
        """
        Notificação de renovação de licença (APA) de uma ETAR para
        utilizadores com acesso ao módulo Gestão.

        notification_type:
          - 'licenca_expirar'  → licença a aproximar-se do fim (90/60/30/15/7/1 dias)
          - 'licenca_expirada' → licença já expirada (repete a cada 7 dias)
        """
        self.emit_central_notification(
            user_ids, 'licenca', notification_type, title, message, '/etar',
            metadata={'tb_etar': tb_etar},
        )

    def emit_fleet_notification(self, user_ids: list, notification_type: str,
                                 title: str, message: str,
                                 tb_vehicle: int = None, maintenance_pk: int = None,
                                 tt_maintenancetype: int = None):
        """
        Notificação de frota para utilizadores com fleet.edit (ou admin).

        notification_type:
          - 'avaria_reportada' → condutor reportou avaria via "A Minha Viatura"
          - '{seguro|inspecao|iuc}_a_expirar' / '_expirado' → documento de
            viatura a expirar/expirado (job diário, ver
            app/services/vehicle_alert_service.py). maintenance_pk fica None
            nestes casos — o parâmetro é opcional.
          - 'manutencao_atencao' / 'manutencao_atraso' → revisão/manutenção
            por km ou meses em atenção/atraso (job diário, ver
            check_vehicle_maintenance_expirando em vehicle_alert_service.py).
            tt_maintenancetype identifica o tipo (Revisão/Pneus/...) — usado
            também para o próprio job saber se já alertou esta viatura+tipo
            (consulta o histórico em tb_notification via metadata).
        """
        self.emit_central_notification(
            user_ids, 'fleet', notification_type, title, message, '/fleet',
            metadata={
                'tb_vehicle': tb_vehicle, 'maintenance_pk': maintenance_pk,
                'tt_maintenancetype': tt_maintenancetype,
            },
        )

    def emit_rh_notification(self, user_ids: list, notification_type: str,
                              title: str, message: str,
                              route: str = '/rh/pessoal/faltas'):
        """
        Notificação do módulo RH.

        notification_type:
          - 'participacao_workflow' → estado da participação alterado
          - 'participacao_criada'   → participação criada automaticamente (regresso)
          - 'ponto_registo'         → ponto registado por admin em nome do colaborador
        """
        self.emit_central_notification(
            user_ids, 'rh', notification_type, title, message, route,
        )


def register_socket_events(socketio):
    # Criamos uma instância da classe e a registramos no socketio
    socket_events = SocketIOEvents('/')
    socket_events.socketio = socketio  # Armazenar referência ao socketio
    socketio.on_namespace(socket_events)

    # Armazenamos a instância para que outros módulos possam acedê-la
    current_app.extensions['socketio_events'] = socket_events
