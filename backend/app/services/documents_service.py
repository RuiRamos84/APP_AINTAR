from flask import current_app
from pydantic import BaseModel, Field, conint, constr
from typing import Optional, List
from sqlalchemy.sql import text
from ..utils.utils import format_message, db_session_manager
from .auth_service import fs_login, validate_session, fs_logout
from datetime import datetime
import os
from app import socket_io
from flask import request, send_file
from app.utils.utils import send_mail
from .file_service import FileService
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from app.utils.error_handler import api_error_handler, ResourceNotFoundError
from . import pdf_filler_service
from app.utils.logger import get_logger

logger = get_logger(__name__)


# ===================================================================
# MODELOS DE DADOS COM PYDANTIC
# ===================================================================

class DocumentCreate(BaseModel):
    ts_entity: int
    tt_type: int
    ts_associate: int
    tb_representative: Optional[str] = None # NIPC do representante
    tt_presentation: int
    memo: str
    isDifferentAddress: bool = False
    address: Optional[str] = None
    postal: Optional[str] = None
    door: Optional[str] = None
    floor: Optional[str] = None
    nut1: Optional[str] = None
    nut2: Optional[str] = None
    nut3: Optional[str] = None
    nut4: Optional[str] = None
    shipping_address: Optional[str] = None
    shipping_postal: Optional[str] = None
    shipping_door: Optional[str] = None
    shipping_floor: Optional[str] = None
    shipping_nut1: Optional[str] = None
    shipping_nut2: Optional[str] = None
    shipping_nut3: Optional[str] = None
    shipping_nut4: Optional[str] = None
    glat: Optional[float] = None
    glong: Optional[float] = None

class DocumentStepAdd(BaseModel):
    tb_document: int
    what: int
    who: int
    memo: Optional[str] = None

class DocumentParamUpdate(BaseModel):
    pk: int
    value: str
    memo: Optional[str] = None


@api_error_handler
def list_documents(current_user: str):
    with db_session_manager(current_user) as session:
        documents_query = text("SELECT * FROM vbl_document ORDER BY submission DESC")
        documents_result = session.execute(documents_query).mappings().all()
        documents_list = []
        for doc in documents_result:
            doc_dict = dict(doc)
            if isinstance(doc_dict.get("submission"), datetime):
                doc_dict["submission"] = doc_dict["submission"].isoformat()
            documents_list.append(doc_dict)
        return {'documents': documents_list}, 200


@api_error_handler
def documentById(documentId: int, current_user: str):
    with db_session_manager(current_user) as session:
        document_query = text("SELECT * FROM vbl_document WHERE regnumber = :documentId")
        document_result = session.execute(document_query, {"documentId": documentId}).fetchone()

        if not document_result:
            raise ResourceNotFoundError('Documento', documentId)

        document_dict = document_result._asdict()
        if isinstance(document_dict.get("submission"), datetime):
            document_dict["submission"] = document_dict["submission"].isoformat()
        return {'document': document_dict}, 200


@api_error_handler
def document_self(current_user: str):
    with db_session_manager(current_user) as session:
        document_self_query = text("SELECT * FROM vbl_document$self ORDER BY submission DESC")
        document_self_result = session.execute(document_self_query).mappings().all()
        document_self_list = []
        for doc in document_self_result:
            doc_dict = dict(doc)
            if isinstance(doc_dict.get("submission"), datetime):
                doc_dict["submission"] = doc_dict["submission"].isoformat()
            document_self_list.append(doc_dict)
        return {'document_self': document_self_list}, 200


@api_error_handler
def check_vacation_status(user_pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        vacation_query = text("SELECT vacation FROM vsl_client WHERE pk = :pk")
        result = session.execute(vacation_query, {'pk': user_pk}).fetchone()
        if not result:
            raise ResourceNotFoundError('Utilizador não encontrado')
        return {'vacation': result.vacation}, 200


@api_error_handler
def create_document(data: dict, files, current_user: str):
    doc_data = DocumentCreate.model_validate(data)

    with db_session_manager(current_user) as session:
        tb_representative = None
        if doc_data.tb_representative:
            representative_query = text("SELECT pk FROM vbf_entity WHERE nipc = :nipc")
            representative_result = session.execute(representative_query, {'nipc': doc_data.tb_representative}).scalar()
            if not representative_result:
                raise ResourceNotFoundError('Representante', doc_data.tb_representative)
            tb_representative = representative_result

        # Dicionário para armazenar todos os campos do documento
        doc_fields = {
            'address': doc_data.address,
            'postal': doc_data.postal,
            'door': doc_data.door,
            'floor': doc_data.floor,
            'nut1': doc_data.nut1,
            'nut2': doc_data.nut2,
            'nut3': doc_data.nut3,
            'nut4': doc_data.nut4,
            'glat': doc_data.glat,
            'glong': doc_data.glong,
            'notification': 1,
            'tt_presentation': doc_data.tt_presentation
        }

        if doc_data.isDifferentAddress:
            doc_fields['address'] = doc_data.shipping_address
            doc_fields['postal'] = doc_data.shipping_postal
            doc_fields['door'] = doc_data.shipping_door
            doc_fields['floor'] = doc_data.shipping_floor
            doc_fields['nut1'] = doc_data.shipping_nut1
            doc_fields['nut2'] = doc_data.shipping_nut2
            doc_fields['nut3'] = doc_data.shipping_nut3
            doc_fields['nut4'] = doc_data.shipping_nut4

        pk_query = text("SELECT fs_nextcode()")
        pk_result = session.execute(pk_query).scalar()

        fields = ['pk', 'ts_entity', 'tt_type', 'ts_associate', 'tb_representative', 'memo'] + list(doc_fields.keys())
        placeholders = [f':{field}' for field in fields]

        insert_query = text(
            f"""INSERT INTO vbf_document
            ({', '.join(fields)})
            VALUES ({', '.join(placeholders)})"""
        )
        query_params = {
            'pk': pk_result,
            'ts_entity': doc_data.ts_entity,
            'tt_type': doc_data.tt_type,
            'ts_associate': doc_data.ts_associate,
            'tb_representative': tb_representative,
            'memo': doc_data.memo,
            **doc_fields
        }
        session.execute(insert_query, query_params)

        reg_query = text("SELECT regnumber, who FROM vbl_document WHERE pk = :pk")
        result = session.execute(reg_query, {'pk': pk_result}).fetchone()
        reg_result = result.regnumber
        who = result.who

        # Processar arquivos
        file_service = FileService()
        file_descriptions = data.getlist('descr') # getlist é do form-data, mantemos
        for i, file in enumerate(files[:5]):
            file_pk = session.execute(text("SELECT fs_nextcode()")).scalar()
            description = file_descriptions[i] if i < len(file_descriptions) else 'file description'
            extension = os.path.splitext(file.filename)[1]
            filename = f"{file_pk}{extension}"
            
            file_service.save_attachment(file, str(reg_result), filename, current_user)

            annex_query = text("SELECT fbf_document_annex(0, :pk, :tb_document, :data, :descr, :filename)")
            session.execute(annex_query, {
                'pk': file_pk,
                'tb_document': pk_result,
                'data': datetime.now(),
                'descr': description,
                'filename': filename
            })

        # Emitir notificação via socket com dados completos
        try:
            import time
            socketio = current_app.extensions['socketio']

            # Buscar dados completos do documento recém-criado
            doc_details_query = text("""
                SELECT d.pk, d.regnumber, d.memo as descr, d.tt_type, d.creator,
                       d.ts_entity, d.ts_associate, d.tb_representative, d.tt_presentation
                FROM vbf_document d
                WHERE d.pk = :document_id
            """)
            doc_details = session.execute(doc_details_query, {
                'document_id': pk_result
            }).fetchone()

            if doc_details:
                notification_data = {
                    "document_id": pk_result,
                    "document_number": doc_details.regnumber or f"Pedido #{pk_result}",
                    "document_description": doc_details.descr or doc_data.memo or "",
                    "document_type": doc_details.tt_type or "Documento",
                    "from_user": current_user if isinstance(current_user, int) else int(current_user) if str(current_user).isdigit() else 17,
                    "from_user_name": doc_details.creator or 'Utilizador',
                    "to_user": who,
                    "to_user_name": "Utilizador",
                    "step_name": "Documento criado",
                    "step_type": "document_creation",
                    "current_status": "Criado",
                    "message": f"Novo pedido criado: {doc_details.regnumber or f'#{pk_result}'}",
                    "timestamp": time.time(),
                    "notification_id": f"document_{pk_result}_{int(time.time() * 1000)}",
                    "metadata": {
                        "memo": doc_data.memo or "",
                        "entity_id": doc_data.ts_entity,
                        "document_type": doc_data.tt_type,
                        "document_pk": pk_result,
                        "document_regnumber": doc_details.regnumber,
                        "document_creator": doc_details.creator,
                        "workflow_action": "create_document",
                        "associate_id": doc_data.ts_associate,
                        "representative_id": doc_data.tb_representative if hasattr(doc_data, 'tb_representative') else None,
                        "notification_source": "document_creation",
                        "recipient_type": "assigned_user",
                        "creation_context": "documents_service",
                        # IDs para mapeamento no frontend
                        "entity_mapping_id": doc_details.ts_entity if doc_details else doc_data.ts_entity,  # Para metadata.ee
                        "associate_mapping_id": doc_details.ts_associate if doc_details else doc_data.ts_associate,  # Para metadata.associates
                        "representative_mapping_id": doc_details.tb_representative if doc_details else (doc_data.tb_representative if hasattr(doc_data, 'tb_representative') else None),  # Para metadata.who
                        "document_type_mapping_id": doc_details.tt_type if doc_details else doc_data.tt_type,  # Para metadata.param_doctype
                        "presentation_mapping_id": doc_details.tt_presentation if doc_details else None,  # Para metadata.presentation
                        # Flags para o frontend saber que dados mapear
                        "requires_mapping": {
                            "entity": True,
                            "associate": True if (doc_details.ts_associate if doc_details else doc_data.ts_associate) else False,
                            "representative": True if (doc_details.tb_representative if doc_details else (doc_data.tb_representative if hasattr(doc_data, 'tb_representative') else None)) else False,
                            "document_type": True,
                            "presentation": True if (doc_details.tt_presentation if doc_details else None) else False
                        }
                    }
                }
            else:
                # Fallback se não conseguir buscar detalhes
                notification_data = {
                    "document_id": pk_result,
                    "document_number": reg_result or f"Pedido #{pk_result}",
                    "from_user": current_user if isinstance(current_user, int) else int(current_user) if str(current_user).isdigit() else 17,
                    "from_user_name": 'Utilizador',
                    "to_user": who,
                    "to_user_name": "Utilizador",
                    "message": f"Novo pedido criado: {reg_result or f'#{pk_result}'}",
                    "timestamp": time.time(),
                    "notification_id": f"document_{pk_result}_{int(time.time() * 1000)}",
                    "metadata": {
                        "memo": doc_data.memo or "",
                        "entity_id": doc_data.ts_entity,
                        "document_type": doc_data.tt_type,
                        "document_pk": pk_result,
                        "workflow_action": "create_document",
                        "associate_id": doc_data.ts_associate,
                        "notification_source": "document_creation",
                        "recipient_type": "assigned_user",
                        "creation_context": "documents_service",
                        # IDs para mapeamento no frontend (fallback)
                        "entity_mapping_id": doc_data.ts_entity,  # Para metadata.ee
                        "associate_mapping_id": doc_data.ts_associate,  # Para metadata.associates
                        "document_type_mapping_id": doc_data.tt_type,  # Para metadata.param_doctype
                        # Flags para o frontend saber que dados mapear
                        "requires_mapping": {
                            "entity": True,
                            "associate": True if doc_data.ts_associate else False,
                            "document_type": True
                        }
                    }
                }

            socketio.emit('new_notification', notification_data, room=f"user_{who}")
        except Exception as e:
            logger.error(f"Erro ao enviar notificação via socket: {str(e)}")
        
        # Atualizar parâmetros adicionais
        param_query = text("SELECT tb_param FROM vbf_document_param WHERE tb_document = :pk")
        params_to_process = session.execute(param_query, {'pk': pk_result}).fetchall()

        for param in params_to_process:
            param_value = data.get(f'param_{param.tb_param}')
            param_memo = data.get(f'param_memo_{param.tb_param}')

            if param_value is not None or param_memo is not None:
                update_query = text("""
                    UPDATE vbf_document_param 
                    SET value = :value, memo = :memo
                    WHERE tb_document = :doc_id AND tb_param = :param_id
                """)
                session.execute(update_query, {
                    'value': param_value,
                    'memo': param_memo,
                    'doc_id': pk_result,
                    'param_id': param.tb_param
                })

        return {
            'message': 'Pedido criado com sucesso',
            'order_id': pk_result,
            'regnumber': reg_result,
            **doc_data.model_dump()
        }, 201


@api_error_handler
def get_document_type_param(current_user: str, type_id: int):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_document_param WHERE tb_document = :type_id")
        result = session.execute(query, {'type_id': type_id}).mappings().all()
        return {'params': [dict(row) for row in result]}, 200


@api_error_handler
def update_document_params(current_user: str, document_id: int, data: dict):
    params_to_update_raw = data.get('params', data)
    if not isinstance(params_to_update_raw, list):
        raise ValueError('Params must be an array')

    params_to_update = [DocumentParamUpdate.model_validate(p) for p in params_to_update_raw]

    with db_session_manager(current_user) as session:
        update_count = 0
        for param in params_to_update:
            update_query = text("""
                UPDATE vbf_document_param 
                SET value = :value, memo = :memo
                WHERE pk = :pk AND tb_document = :document_id
            """)
            result = session.execute(update_query, {
                'value': param.value,
                'memo': param.memo,
                'pk': param.pk,
                'document_id': document_id
            })
            update_count += result.rowcount

        return {'success': True, 'message': f'Updated {update_count} parameters successfully'}, 200


@api_error_handler
def update_document_notification(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        update_query = text("UPDATE vbf_document SET notification = 0 WHERE pk = :pk")
        result = session.execute(update_query, {'pk': pk})
        if result.rowcount == 0:
            raise ResourceNotFoundError("Documento", pk)
        return {'sucesso': 'Status de notificação atualizado com sucesso'}, 200


@api_error_handler
def get_document_steps(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_document_step WHERE tb_document = :pk order by ord")
        result = session.execute(query, {'pk': pk}).mappings().all()
        return [dict(row) for row in result]


@api_error_handler
def get_document_anex_steps(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_document_annex WHERE tb_document = :pk order by data desc")
        result = session.execute(query, {'pk': pk}).mappings().all()
        return [dict(row) for row in result]


@api_error_handler
def add_document_step(data: dict, pk: int, current_user: str):
    step_data = DocumentStepAdd.model_validate(data)
    with db_session_manager(current_user) as session:
        document_step_query = text("SELECT pk FROM vbf_document_step WHERE pk = :pk")
        exists = session.execute(document_step_query, {'pk': pk}).scalar()

        if not exists:
            pk_query = text("SELECT fs_nextcode()")
            pk_result = session.execute(pk_query).scalar()
            insert_query = text(
                "INSERT INTO vbf_document_step (pk, tb_document, what, who, memo) "
                "VALUES (:pk, :tb_document, :what, :who, :memo)"
            )
            session.execute(insert_query, {'pk': pk_result, **step_data.model_dump()})
        else:
            update_query = text(
                "UPDATE vbf_document_step SET memo = :memo, what = :what, who = :who WHERE pk = :pk"
            )
            session.execute(update_query, {'pk': pk, **step_data.model_dump()})

        # Emitir notificação de transferência de documento via Socket.IO
        try:
            # Buscar dados do documento e utilizador
            document_query = text("SELECT regnumber FROM vbf_document WHERE pk = :document_id")
            document_number = session.execute(document_query, {'document_id': step_data.tb_document}).scalar()

            # Usar nomes padrão para utilizadores (tabela de utilizadores não existe)
            to_user_name = "Utilizador"
            from_user_name = "Sistema"

            # Preparar dados da notificação com formato completo e consistente
            import time

            # Buscar dados completos do documento
            doc_details_query = text("""
                SELECT d.pk, d.regnumber, d.memo as descr, d.tt_type, d.creator,
                       d.ts_entity, d.ts_associate, d.tb_representative
                FROM vbf_document d
                WHERE d.pk = :document_id
            """)
            doc_details = session.execute(doc_details_query, {
                'document_id': step_data.tb_document
            }).fetchone()

            notification_data = {
                "document_id": step_data.tb_document,
                "document_number": document_number or f"Pedido #{step_data.tb_document}",
                "document_description": doc_details.descr if doc_details else "",
                "document_type": doc_details.tt_type if doc_details else "Documento",
                "from_user": current_user if isinstance(current_user, int) else int(current_user) if str(current_user).isdigit() else 17,
                "from_user_name": doc_details.creator if doc_details else from_user_name or "Sistema",
                "to_user": step_data.who,
                "to_user_name": to_user_name or "Utilizador",
                "step_name": step_data.what or "Novo passo adicionado",
                "step_type": "workflow_step",
                "current_status": "Em processamento",
                "message": f"Novo passo adicionado ao {document_number or f'pedido #{step_data.tb_document}'}",
                "timestamp": time.time(),
                "notification_id": f"workflow_{step_data.tb_document}_{int(time.time() * 1000)}",
                "metadata": {
                    "memo": step_data.memo or "",
                    "step_what": step_data.what,
                    "step_who": step_data.who,
                    "document_pk": step_data.tb_document,
                    "document_regnumber": document_number,
                    "document_creator": doc_details.creator if doc_details else None,
                    "workflow_action": "add_step",
                    "notification_source": "workflow_step",
                    "recipient_type": "assigned_user",
                    "step_context": "documents_service",
                    "isReceiver": True,
                    # IDs para mapeamento no frontend
                    "step_what_id": step_data.what,  # ID para mapeamento em metadata.what
                    "step_who_id": step_data.who,    # ID para mapeamento em metadata.who
                    "entity_mapping_id": doc_details.ts_entity if doc_details else None,  # Para metadata.ee
                    "associate_mapping_id": doc_details.ts_associate if doc_details else None,  # Para metadata.associates
                    "representative_mapping_id": doc_details.tb_representative if doc_details else None,  # Para metadata.who
                    "document_type_mapping_id": doc_details.tt_type if doc_details else None,  # Para metadata.param_doctype
                    # Flags para o frontend saber que dados mapear
                    "requires_mapping": {
                        "step_what": True,
                        "step_who": True,
                        "entity": True if (doc_details.ts_entity if doc_details else None) else False,
                        "associate": True if (doc_details.ts_associate if doc_details else None) else False,
                        "representative": True if (doc_details.tb_representative if doc_details else None) else False,
                        "document_type": True if (doc_details.tt_type if doc_details else None) else False
                    }
                }
            }

            # Emitir através dos handlers específicos
            socket_events = current_app.extensions.get('socketio_events')
            if socket_events:
                socket_events.emit_document_transfer(notification_data, step_data.who)
            else:
                logger.error("CRÍTICO: SocketIO events handler não encontrado - notificação não enviada")

        except Exception as e:
            logger.error(f"Erro ao enviar notificação de documento via socket: {str(e)}")

        return {'sucesso': 'Passo do pedido criado ou atualizado com sucesso'}, 201


@api_error_handler
def add_document_annex(data: dict, current_user: str):
    tb_document = data.get('tb_document')
    files = request.files.getlist('files')
    file_descriptions = request.form.getlist('descr')

    if not tb_document:
        raise ValueError('O campo tb_document é obrigatório')
    if not files:
        raise ValueError('Nenhum arquivo enviado')

    with db_session_manager(current_user) as session:
        reg_query = text("SELECT regnumber FROM vbf_document WHERE pk = :tb_document")
        reg_result = session.execute(reg_query, {'tb_document': tb_document}).scalar()
        if not reg_result:
            raise ResourceNotFoundError("Documento", tb_document)

        file_service = FileService()

        for i, file in enumerate(files[:5]):
            description = file_descriptions[i] if i < len(file_descriptions) else 'file description'
            pk_result = session.execute(text("SELECT fs_nextcode()")).scalar()
            extension = os.path.splitext(file.filename)[1]
            filename = f"{pk_result}{extension}"

            if file_service.save_attachment(file, str(reg_result), filename, current_user):
                annex_query = text("SELECT fbf_document_annex(0, :pk, :tb_document, :data, :descr, :filename)")
                session.execute(annex_query, {
                    'pk': pk_result,
                    'tb_document': tb_document,
                    'data': datetime.now(),
                    'descr': description,
                    'filename': filename
                })

        return {'sucesso': 'Anexos adicionados com sucesso'}, 201


@api_error_handler
def document_owner(current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_document$owner ORDER BY submission DESC")
        result = session.execute(query).mappings().all()
        doc_list = []
        for doc in result:
            doc_dict = dict(doc)
            if isinstance(doc_dict.get("submission"), datetime):
                doc_dict["submission"] = doc_dict["submission"].isoformat()
            doc_list.append(doc_dict)
        return {'document_owner': doc_list}, 200


@api_error_handler
def get_entity_count_types(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbl_entity_counttypes WHERE ts_entity = :pk")
        result = session.execute(query, {'pk': pk}).mappings().all()
        return {'count_types': [dict(row) for row in result]}, 200


@api_error_handler
def create_document_direct(ntype, associate, nif, name, phone, email, text_value):
    # Esta função já tem uma lógica complexa de login/logout,
    # mantê-la com try/except específico é mais seguro.
    session_id = None
    try:
        session_id, profil, login_error = fs_login('site@aintar.pt', 'siteAintar@2024')
        if login_error:
            raise APIError(f"Erro no login de serviço: {login_error}", 500)

        if not validate_session(session_id):
            raise APIError('Erro ao validar sessão de serviço', 500)

        with db_session_manager(session_id) as session:
            sql = text("""
                SELECT fbo_document_createdirect(
                    :pntype, :pnassociate, :pnnif, :pnname, :pnphone, :pnemail, :pntext
                ) AS result
            """)
            params = {
                "pntype": ntype, "pnassociate": associate, "pnnif": nif,
                "pnname": name, "pnphone": phone, "pnemail": email, "pntext": text_value,
            }
            result = session.execute(sql, params).scalar()
            formatted_result = format_message(result)
            pk = int(formatted_result.split(": ")[1])

            regnumber_sql = text("SELECT regnumber FROM vbl_document WHERE pk = :pk")
            regnumber = session.execute(regnumber_sql, {"pk": pk}).scalar()
            if not regnumber:
                raise APIError('Erro ao obter regnumber do documento', 500)

            subject = f"Confirmação de receção da reclamação - {regnumber}"
            body = (
                f"Caro(a) {name},\n\n"
                f"A sua reclamação foi submetida com sucesso, tendo sido atribuído  o número de registo {regnumber}.\n\n"
                f"O nosso objetivo é dar-lhe uma resposta o mais breve possível, tratando com a maior objetividade as questões que apresentou.\n\n"
                f"Agradecemos o seu contacto.\n\n"
                f"Com os melhores cumprimentos,\n\n"
                f"AINTAR, juntos pelo Ambiente."
            )
            send_mail(subject=subject, body=body, recipient=email, sender_email="geral@aintar.pt")

            return {'resultado': formatted_result, 'regnumber': regnumber}, 200
    except Exception:
        logger.error("Erro em create_document_direct", exc_info=True)
        raise # Relança a exceção para ser tratada pelo @api_error_handler

    finally:
        if session_id:
            fs_logout(session_id)


@api_error_handler
def generate_document_form_pdf(document_pk: int, current_user: str):
    """
    Gera o PDF do formulário de um documento, utilizando o PdfFillerService.
    """
    pdf_buffer = pdf_filler_service.generate_filled_pdf(document_pk, current_user)
    
    # O buffer já vem com o seek(0), pronto para ser enviado.
    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f'Formulario_Pedido_{document_pk}.pdf',
        mimetype='application/pdf'
    )


@api_error_handler
def create_etar_document_direct(etar_pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        sql = text("SELECT fbo_etar_document_createdirect(:pnpk) AS result")
        result = session.execute(sql, {"pnpk": etar_pk}).scalar()
        if not result or "<sucess>" not in result:
            raise APIError("Erro ao criar pedido ETAR", 500)
        formatted_result = format_message(result)
        return {"message": f"Pedido ETAR criado com sucesso: {formatted_result}"}, 201


@api_error_handler
def create_ee_document_direct(ee_pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        sql = text("SELECT fbo_ee_document_createdirect(:pnpk) AS result")
        result = session.execute(sql, {"pnpk": ee_pk}).scalar()
        if not result or "<sucess>" not in result:
            raise APIError("Erro ao criar pedido EE", 500)
        formatted_result = format_message(result)
        return {"message": f"Pedido EE criado com sucesso: {formatted_result}"}, 201


@api_error_handler
def get_document_ramais(current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbr_document_pav01")
        result = session.execute(query).mappings().all()
        return {'ramais': [dict(row) for row in result]}, 200


@api_error_handler
def update_document_pavenext(pk: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_document_pavenext(:pk) AS result")
        result = session.execute(query, {'pk': pk}).scalar()
        if not result:
            raise Exception('Falha ao atualizar documento')
        return {'message': 'Documento atualizado com sucesso', 'result': format_message(result)}, 200


@api_error_handler
def get_document_ramais_concluded(current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT * FROM vbr_document_pav02")
        result = session.execute(query).mappings().all()
        return {'ramais': [dict(row) for row in result]}, 200


@api_error_handler
def replicate_document_service(pk: int, new_type: int, current_user: str):
    with db_session_manager(current_user) as session:
        query = text("SELECT fbo_document_replicate(:popk, :pntype) AS result")
        result = session.execute(query, {'popk': pk, 'pntype': new_type}).scalar()
        if not result or "<sucess>" not in result:
            raise APIError('Falha ao replicar documento. Verifique se o tipo de destino é válido.', 500)
        return {'message': format_message(result)}, 201


@api_error_handler
def reopen_document(regnumber: str, user_id: int, current_user: str):
    with db_session_manager(current_user) as session:
        result = session.execute(
            text("SELECT fbs_document_open(:regnumber, :user_id)"),
            {'regnumber': regnumber, 'user_id': user_id}
        ).scalar()
        if not result:
            raise Exception('Falha ao reabrir pedido')
        return {'message': 'Pedido reaberto com sucesso', 'result': format_message(result)}, 200
