from reportlab.lib import colors
from flask import current_app
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.pagesizes import letter
from docx import Document
from pdfrw import PdfReader, PdfWriter, PdfDict, PdfName
from sqlalchemy.sql import text
from ..utils.utils import format_message, db_session_manager
from .auth_service import fs_login, validate_session, fs_logout
from datetime import datetime
import os
from app import socket_io
from flask import request, jsonify, send_file
from app.utils.utils import send_mail
from .file_service import FileService
from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def ensure_directories(regnumber):
    """
    Garante que as pastas necessárias existam para um pedido
    """
    base_path = current_app.config['FILES_DIR']
    request_path = os.path.join(base_path, str(regnumber))
    anexos_path = os.path.join(request_path, 'anexos')
    oficios_path = os.path.join(request_path, 'Oficios')

    os.makedirs(request_path, exist_ok=True)
    os.makedirs(anexos_path, exist_ok=True)
    os.makedirs(oficios_path, exist_ok=True)

    return request_path, anexos_path, oficios_path


def list_documents(current_user):
    try:
        with db_session_manager(current_user) as session:
            documents_query = text("SELECT * FROM vbl_document")
            documents_result = session.execute(documents_query).fetchall()
            if documents_result:
                documents_list = []
                for document in documents_result:
                    document_dict = document._asdict()
                    if isinstance(document_dict["submission"], datetime):
                        document_dict["submission"] = document_dict["submission"].isoformat()
                    documents_list.append(document_dict)
                return {'documents': documents_list}, 200
            else:
                return {'message': 'Nenhum documento encontrado'}, 200
    except Exception as e:
        return {'error': f"Erro ao obter lista de documentos: {str(e)}"}, 500


def document_self(current_user):
    try:
        with db_session_manager(current_user) as session:
            document_self_query = text("SELECT * FROM vbl_document$self")
            document_self_result = session.execute(
                document_self_query).fetchall()
            if document_self_result:
                document_self_list = []
                for document in document_self_result:
                    document_dict = document._asdict()
                    if isinstance(document_dict["submission"], datetime):
                        document_dict["submission"] = document_dict["submission"].isoformat(
                        )
                    document_self_list.append(document_dict)
                return {'document_self': document_self_list}, 200
            else:
                return {'mensagem': 'Não existem Pedidos atribuídos a si'}, 200
    except Exception as e:
        return {'erro': f"Erro ao obter lista de document_self: {str(e)}"}, 500


def check_vacation_status(user_pk, current_user):
    try:
        with db_session_manager(current_user) as session:
            vacation_query = text("SELECT vacation FROM vsl_client WHERE pk = :pk")
            result = session.execute(vacation_query, {'pk': user_pk}).fetchone()
            if result:
                return {'vacation': result.vacation}, 200
            else:
                return {'error': 'Usuário não encontrado'}, 404
    except Exception as e:
        return {'error': f"Erro ao verificar status de férias: {str(e)}"}, 500


def create_document(data, files, current_user):
    try:
        # current_app.logger.info(f"Dados recebidos: {data}")
        with db_session_manager(current_user) as session:
            ts_entity = data.get('ts_entity')
            if not ts_entity:
                return {'erro': 'ID da entidade não fornecido.'}, 400

            tt_type = data['tt_type']
            ts_associate = data['ts_associate']
            representative_nipc = data.get('tb_representative')
            tt_presentation = data.get('tt_presentation')

            # Buscar o PK do representante usando o NIF
            if representative_nipc:
                representative_query = text(
                    "SELECT pk FROM vbf_entity WHERE nipc = :nipc")
                representative_result = session.execute(
                    representative_query, {'nipc': representative_nipc}).scalar()
                if not representative_result:
                    return {'erro': 'O representante fornecido não existe.'}, 400
                tb_representative = representative_result
            else:
                tb_representative = None

            memo = data['memo']
            is_different_address = data.get('isDifferentAddress') == 'true'

            # Dicionário para armazenar todos os campos do documento
            doc_fields = {
                'address': data.get('address'),
                'postal': data.get('postal'),
                'door': data.get('door'),
                'floor': data.get('floor'),
                'nut1': data.get('nut1'),
                'nut2': data.get('nut2'),
                'nut3': data.get('nut3'),
                'nut4': data.get('nut4'),
                'glat': data.get('glat'),
                'glong': data.get('glong'),
                'notification': 1,
                'tt_presentation': tt_presentation
            }

            if is_different_address:
                for field in ['address', 'postal', 'door', 'floor', 'nut1', 'nut2', 'nut3', 'nut4']:
                    doc_fields[field] = data.get(
                        f'shipping_{field}', doc_fields[field])

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
                'ts_entity': ts_entity,
                'tt_type': tt_type,
                'ts_associate': ts_associate,
                'tb_representative': tb_representative,
                'memo': memo,
                **doc_fields
            }
            # print(query_params)
            session.execute(insert_query, query_params)
            session.commit()

            reg_query = text("SELECT regnumber FROM vbf_document WHERE pk = :pk")
            reg_result = session.execute(reg_query, {'pk': pk_result}).scalar()

            # Processar arquivos
            UPLOAD_FOLDER = current_app.config['FILES_DIR']
            order_folder = os.path.join(UPLOAD_FOLDER, str(reg_result))
            os.makedirs(order_folder, exist_ok=True)

            file_descriptions = data.getlist('descr')
            for i, file in enumerate(files[:5]):
                filename_query = text("SELECT fs_nextcode()")
                file_pk = session.execute(filename_query).scalar()
                description = file_descriptions[i] if i < len(
                    file_descriptions) else 'file description'
                extension = os.path.splitext(file.filename)[1]
                filename = f"{file_pk}{extension}"
                filepath = os.path.join(order_folder, filename)
                file.save(filepath)

                annex_query = text(
                    "SELECT fbf_document_annex(0, :pk, :tb_document, :data, :descr, :filename)")
                session.execute(annex_query, {
                    'pk': file_pk,
                    'tb_document': pk_result,
                    'data': datetime.now(),
                    'descr': description,
                    'filename': filename
                })
                session.commit()

            # Emitir notificação
            who_query = text(
                "SELECT who FROM vbf_document_step WHERE tb_document = :pk and ord = 0")
            who_id = session.execute(who_query, {'pk': pk_result}).scalar()

            notification_data = {
                "document_id": pk_result,
                "regnumber": reg_result,
                "message": f"Novo pedido criado: {reg_result}"
            }
            try:
                socketio = current_app.extensions['socketio']
                socketio.emit('new_notification', notification_data, room=f"user_{who_id}")
                current_app.logger.info(
                    f"Notificação enviada para o usuário {who_id}")
            except Exception as e:
                current_app.logger.error(
                    f"Erro ao enviar notificação via socket: {str(e)}")
            
            # Buscar os parâmetros adicionais necessários para este tipo de documento
            param_query = text("""
                SELECT tb_param, value, memo 
                FROM vbf_document_param 
                WHERE tb_document = :pk
            """)
            params = session.execute(
                param_query, {'pk': pk_result}).fetchall()
            print(params)

            # Inserir ou atualizar os parâmetros adicionais
            for param in params:
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

            session.commit()

            return {
                'message': 'Pedido criado com sucesso',
                'order_id': pk_result,
                'regnumber': reg_result,
                'ts_entity': ts_entity,
                'tt_type': tt_type,
                'ts_associate': ts_associate,
                'tb_representative': tb_representative,
                'memo': memo,
                **doc_fields,
            }, 201

    except Exception as e:
        current_app.logger.error(f"Erro ao criar documento: {str(e)}")
        return {'erro': f"Erro ao criar documento: {str(e)}"}, 500


def get_document_type_param(current_user, type_id):
    try:
        with db_session_manager(current_user) as session:
            query = text("""
                SELECT * FROM vbl_document_param
                WHERE tb_document = :type_id
            """)
            result = session.execute(query, {'type_id': type_id})

            response = {
                'params': [dict(row) for row in result.mappings()]
            }

            # session.commit()
            return jsonify(response), 200
    except Exception as e:
        formatted_error = format_message(str(e))
        return jsonify({'error': formatted_error}), 500


def update_document_params(current_user, type_id, data):
    try:
        with db_session_manager(current_user) as session:
            for param in data.get('params', []):
                query = text("""
                    UPDATE vbf_document_param 
                    SET value = :value, 
                        memo = :memo
                    WHERE pk = :pk 
                    AND tb_document = :type_id
                """)
                session.execute(query, {
                    'value': param.get('value'),
                    'memo': param.get('memo'),
                    'pk': param.get('pk'),
                    'type_id': type_id
                })

            session.commit()

            # Retorna os dados atualizados
            return get_document_type_param(current_user, type_id)

    except Exception as e:
        session.rollback()
        formatted_error = format_message(str(e))
        return jsonify({'error': formatted_error}), 500


def update_document_notification(pk, current_user):
    try:
        with db_session_manager(current_user) as session:
            update_query = text(
                "UPDATE vbf_document SET notification = 0 WHERE pk = :pk"
            )
            session.execute(update_query, {'pk': pk})
            session.commit()
            return {'sucesso': 'Status de notificação atualizado com sucesso'}, 200
    except Exception as e:
        message = format_message(str(e))
        print(message)
        return {'erro': message}, 500


def get_document_steps(pk, current_user):
    try:
        with db_session_manager(current_user) as session:
            document_step_query = text("SELECT * FROM vbl_document_step WHERE tb_document = :pk order by ord")
            document_step_result = session.execute(document_step_query, {'pk': pk})
            document_step_list = []
            for row in document_step_result.mappings():
                document_step_list.append(dict(row))
            session.commit()
            return document_step_list
    except Exception as e:
        formatted_error = format_message(str(e))
        return {'erro': f"{formatted_error}"}, 500


def get_document_anex_steps(pk, current_user):
    try:
        with db_session_manager(current_user) as session:
            document_anex_query = text("SELECT * FROM vbl_document_annex WHERE tb_document = :pk order by data desc")
            document_anex_result = session.execute(document_anex_query, {'pk': pk})
            document_anex_list = []
            for row in document_anex_result.mappings():
                document_anex_list.append(dict(row))
            session.commit()
            return document_anex_list
    except Exception as e:
        formatted_error = format_message(str(e))
        return {'erro': f"{formatted_error}"}, 500


def add_document_step(data, pk, current_user):
    try:
        with db_session_manager(current_user) as session:
            tb_document = data.get('tb_document')
            what = data.get('what')
            who = data.get('who')
            memo = data.get('memo')
            document_step_query = text(
                "SELECT * FROM vbf_document_step WHERE pk = :pk")
            document_step_result = session.execute(
                document_step_query, {'pk': pk}).fetchone()
            if document_step_result is None:
                pk_query = text("SELECT fs_nextcode()")
                pk_result = session.execute(pk_query).scalar()
                insert_query = text(
                    "INSERT INTO vbf_document_step (pk, tb_document, what, who, memo) "
                    "VALUES (:pk, :tb_document, :what, :who, :memo)"
                )
                session.execute(insert_query, {
                                'pk': pk_result, 'tb_document': tb_document, 'what': what, 'who': who, 'memo': memo})
                session.commit()
            else:
                update_query = text(
                    "UPDATE vbf_document_step SET memo = :memo, what = :what, who = :who WHERE pk = :pk"
                )
                session.execute(
                    update_query, {'pk': pk, 'memo': memo, 'what': what, 'who': who})
                session.commit()

            # Emitir notificação via Socket.IO
            notification_data = {
                "document_id": tb_document,
                "message": f"Novo passo adicionado ao pedido {tb_document}"
            }
            try:
                socket_io.emit('new_notification', notification_data, room=f"user_{who}")
                current_app.logger.info(
                    f"Notificação enviada para o usuário {who}")
            except Exception as e:
                current_app.logger.error(
                    f"Erro ao enviar notificação via socket: {str(e)}")

            return {'sucesso': 'Passo do pedido criado ou atualizado com sucesso'}, 201
    except Exception as e:
        message = format_message(str(e))
        current_app.logger.error(
            f"Erro ao adicionar passo do documento: {message}")
        return {'erro': message}, 500


def add_document_annex(data, current_user):
    try:
        with db_session_manager(current_user) as session:
            tb_document = data.get('tb_document')
            files = request.files.getlist('files')
            file_descriptions = request.form.getlist('descr')

            if not tb_document:
                return {'erro': 'O campo tb_document é obrigatório'}, 400
            if not files:
                return {'erro': 'Nenhum arquivo enviado'}, 400

            # Buscar o regnumber do documento
            reg_query = text(
                "SELECT regnumber FROM vbf_document WHERE pk = :tb_document")
            reg_result = session.execute(
                reg_query, {'tb_document': tb_document}).scalar()

            file_service = FileService()

            for i, file in enumerate(files[:5]):
                description = file_descriptions[i] if i < len(
                    file_descriptions) else 'file description'

                # Gerar nome único para o arquivo
                pk_query = text("SELECT fs_nextcode()")
                pk_result = session.execute(pk_query).scalar()
                extension = os.path.splitext(file.filename)[1]
                filename = f"{pk_result}{extension}"

                # Salvar o arquivo usando o FileService
                if file_service.save_attachment(file, reg_result, filename, current_user):
                    # Registrar no banco de dados
                    annex_query = text(
                        "SELECT fbf_document_annex(0, :pk, :tb_document, :data, :descr, :filename)"
                    )
                    session.execute(
                        annex_query,
                        {
                            'pk': pk_result,
                            'tb_document': tb_document,
                            'data': datetime.now(),
                            'descr': description,
                            'filename': filename
                        }
                    )

            session.commit()
            return {'sucesso': 'Anexos adicionados com sucesso'}, 201

    except Exception as e:
        message = format_message(str(e))
        return {'erro': message}, 500


def download_file(regnumber, filename, current_user):
    try:
        base_path = current_app.config['FILES_DIR']
        request_path = os.path.join(base_path, regnumber)

        file_path = os.path.join(request_path, 'anexos', filename)
        if not os.path.exists(file_path):
            file_path = os.path.join(request_path, filename)

        if os.path.exists(file_path):            
            response = send_file(file_path, as_attachment=True)
            response.headers["Cache-Control"] = ("no-cache, no-store, must-revalidate")
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
            return response
        else:
            current_app.logger.error(
                f"Arquivo não encontrado: {file_path}")
            return jsonify({'error': 'Arquivo não encontrado'}), 404
    except Exception as e:
        current_app.logger.error(f"Erro ao baixar arquivo: {str(e)}")
        return jsonify({'error': 'Erro interno ao baixar arquivo'}), 500


def document_owner(current_user):
    try:
        with db_session_manager(current_user) as session:
            document_owner_query = text("SELECT * FROM vbl_document$owner")
            document_owner_result = session.execute(
                document_owner_query).fetchall()
            if document_owner_result:
                document_owner_list = []
                for document in document_owner_result:
                    document_dict = document._asdict()
                    if isinstance(document_dict["submission"], datetime):
                        document_dict["submission"] = document_dict["submission"].isoformat(
                        )
                    document_owner_list.append(document_dict)
                # session.commit()
                return {'document_owner': document_owner_list}, 200
            else:
                return {'mensagem': 'Não existem Documentos atribuídos a si'}, 200
    except Exception as e:
        print({str(e)})
        return {'erro': f"Erro ao obter lista de document_owner: {str(e)}"}, 500


def get_entity_count_types(pk, current_user):
    try:
        with db_session_manager(current_user) as session:
            query = text(
                "SELECT * FROM vbl_entity_counttypes WHERE ts_entity = :pk")
            result = session.execute(query, {'pk': pk}).mappings().all()

            if result:
                count_types_list = []
                for row in result:
                    count_types_list.append(dict(row))
                # session.commit()
                return {'count_types': count_types_list}, 200
            else:
                return {'mensagem': 'Nenhum tipo de pedido encontrado para esta entidade.'}, 200
    except Exception as e:
        return {'erro': f"Erro ao obter tipos de pedidos: {str(e)}"}, 500


def create_document_direct(ntype, associate, nif, name, phone, email, text_value):
    try:
        # Realizar login com um usuário específico
        session_id, profil, login_error = fs_login('site@aintar.pt', 'siteAintar@2024')
        if login_error:
            return {'erro': f"Erro no login: {login_error}"}, 500

        # Validar a sessão
        if not validate_session(session_id):
            return {'erro': 'Erro ao validar sessão após login'}, 500

        with db_session_manager(session_id) as session:
            # Construir a query SQL para chamar a função PL/pgSQL
            sql = text("""
                SELECT aintar_server_dev.fbo_document_createdirect(
                    :pntype, :pnassociate, :pnnif, :pnname, :pnphone, :pnemail, :pntext
                ) AS result
            """)
            params = {
                "pntype": ntype,
                "pnassociate": associate,
                "pnnif": nif,
                "pnname": name,
                "pnphone": phone,
                "pnemail": email,
                "pntext": text_value,
            }

            # Executar a query
            result = session.execute(sql, params).fetchone()
            session.commit()

            # Formatar a mensagem de resultado
            formatted_result = format_message(result[0])

            # Extrair o pk do resultado
            pk = int(formatted_result.split(": ")[1])

            # Obter o regnumber com base no pk
            regnumber_sql = text(
                "SELECT regnumber FROM vbl_document WHERE pk = :pk")
            regnumber_result = session.execute(
                regnumber_sql, {"pk": pk}).fetchone()

            if regnumber_result is None:
                return {'erro': 'Erro ao obter regnumber do documento'}, 500

            regnumber = regnumber_result[0]

            # Enviar o email de resposta
            subject = f"Confirmação de receção da reclamação - {regnumber}"
            body = (
                f"Caro(a) {name},\n\n"
                f"A sua reclamação foi submetida com sucesso, tendo sido atribuído  o número de registo {regnumber}.\n\n"
                f"O nosso objetivo é dar-lhe uma resposta o mais breve possível, tratando com a maior objetividade as questões que apresentou.\n\n"
                f"Agradecemos o seu contacto.\n\n"
                f"Com os melhores cumprimentos,\n\n"
                f"AINTAR, juntos pelo Ambiente."
            )
            send_mail(
                subject=subject,
                body=body,
                recipient=email,
                sender_email="geral@aintar.pt"
            )

            # Realizar logout
            logout_result = fs_logout(session_id)
            if not logout_result.get("success"):
                return {'erro': f"Erro ao fazer logout: {logout_result.get('message')}"}, 500

            return {'resultado': formatted_result, 'regnumber': regnumber}, 200

    except Exception as e:
        # Em caso de erro, tentar realizar logout e retornar o erro encontrado
        fs_logout(session_id)
        return {'erro': f"Erro ao criar documento: {str(e)}"}, 500


# Função para gerar o PDF
def gerar_comprovativo_pdf(dados_pedido):
    buffer = BytesIO()
    c = canvas.Canvas(buffer, pagesize=A4)

    # Cabeçalho do documento
    c.setFont("Helvetica-Bold", 16)
    c.drawString(100, 800, "Comprovativo de Pedido")

    # Adiciona os dados principais do pedido
    c.setFont("Helvetica", 12)
    c.drawString(100, 770, f"Pedido Nº: {dados_pedido['regnumber']}")
    c.drawString(100, 750, f"Data de Submissão: {dados_pedido['submission']}")
    c.drawString(100, 730, f"Tipo de Pedido: {dados_pedido['tt_type']}")

    # Dados do Requerente
    c.drawString(100, 700, f"Nome da Entidade: {dados_pedido['ts_entity']}")
    c.drawString(100, 680, f"NIPC: {dados_pedido['nipc']}")

    # Dados do Endereço
    c.drawString(100, 650, "Endereço:")
    c.drawString(100, 630, f"{dados_pedido['address']}, {dados_pedido['postal']}")
    c.drawString(100, 610, f"Freguesia: {dados_pedido['nut3']}")
    c.drawString(100, 590, f"Concelho: {dados_pedido['nut4']}")

    # Outras Informações
    c.drawString(100, 560, f"Memorando: {dados_pedido['memo']}")
    c.drawString(100, 540, f"Telefone: {dados_pedido['phone']}")

    # Observações adicionais (se aplicável)
    if dados_pedido['tb_representative']:
        c.drawString(100, 510, f"Representante: {dados_pedido['tb_representative']}")

    # Finalizar o PDF
    c.showPage()
    c.save()

    buffer.seek(0)
    return buffer


def debug_pdf_fields(pdf_path):
    reader = PdfReader(pdf_path)
    for i, page in enumerate(reader.pages):
        if '/Annots' in page:
            for j, annotation in enumerate(page['/Annots']):
                if annotation.get('/Subtype') == '/Widget':
                    if '/T' in annotation:
                        field_name = annotation['/T'][1:-1]
                        field_type = annotation['/FT'] if '/FT' in annotation else 'Unknown'
                        current_app.logger.debug(f"Campo encontrado no PDF - Página {i+1}, Campo {j+1}: Nome: {field_name}, Tipo: {field_type}")


# Defina o caminho do formulário PDF
FORMULARIO_PATH = os.path.join(os.path.dirname(
    __file__), '..', 'utils', 'FORMULARIO_AINTAR_V05.pdf')

# Atualizar o mapeamento de campos
campo_mapping = {
    'Registo': 'pedido.regnumber',
    'Data_Registo': 'pedido.submission',
    'Rua/praça_pedido': 'pedido.address',
    'Observações': 'pedido.memo',
    'Tipo de Pedido': 'pedido.tt_type',
    'Nº Porta': 'pedido.door',
    'Andar/Lote_pedido': 'pedido.floor',
    'Codigo Postal_pedido': 'pedido.postal',
    'Freguesia_pedido': 'pedido.nut3',
    'Concelho_pedido': 'pedido.nut2',
    'Funcionario': 'pedido.creator',
    'Nome/Denominação': 'entidade.name',
    'Domicílio/Sede': 'entidade.address',
    'Código Postal': 'entidade.postal',
    'Localidade': 'entidade.nut4',
    'NIF/NIPC': 'entidade.nipc',
    'Contacto': 'entidade.phone',
    'Email': 'entidade.email',
    'Nome/Denominação_representante': 'requerente.name',
    'Domicílio/Sede_representante': 'requerente.address',
    'Código Postal_representante': 'requerente.postal',
    'Localidade_representante': 'requerente.nut4',
    'NIF/NIPC_representante': 'requerente.nipc',
    'Contacto_representante': 'requerente.phone',
    # 'Email_representante': 'requerente.email'
}


def preencher_pdf(dados_estruturados):
    if not os.path.exists(FORMULARIO_PATH):
        current_app.logger.error(f"Ficheiro não encontrado: {FORMULARIO_PATH}")
        raise FileNotFoundError(f"Ficheiro não encontrado: {FORMULARIO_PATH}")
    try:
        current_app.logger.debug("Iniciando preenchimento do PDF")
        template_pdf = PdfReader(FORMULARIO_PATH)
        output_pdf = PdfWriter()
        for page in template_pdf.pages:
            output_pdf.addpage(page)
        for i, page in enumerate(template_pdf.pages):
            current_app.logger.debug(f"Processando página {i+1}")
            if '/Annots' in page:
                for annotation in page['/Annots']:
                    if annotation.get('/Subtype') == '/Widget':
                        if '/T' in annotation:
                            pdf_field_name = annotation['/T'][1:-1]
                            current_app.logger.debug(
                                f"Processando campo do PDF: {pdf_field_name}")
                            if pdf_field_name in campo_mapping:
                                campo_estruturado = campo_mapping[pdf_field_name].split(
                                    '.')
                                if campo_estruturado[0] in dados_estruturados and campo_estruturado[1] in dados_estruturados[campo_estruturado[0]]:
                                    valor = dados_estruturados[campo_estruturado[0]][campo_estruturado[1]]
                                    current_app.logger.debug(f"Valor encontrado para {pdf_field_name}: {valor}")
                                    if valor is not None:
                                        valor = str(valor)
                                        current_app.logger.debug(
                                            f"Preenchendo {pdf_field_name} com {valor}")
                                        field_type = annotation.get('/FT')
                                        if field_type == '/Tx':  # Campo de texto
                                            annotation.update(
                                                PdfDict(V=valor, AP=''))
                                        elif field_type == '/Btn':  # Botão/Checkbox
                                            if valor.lower() in ['true', '1', 'yes', 'on']:
                                                annotation.update(
                                                    PdfDict(AS=PdfName('Yes'), V=PdfName('Yes')))
                                            else:
                                                annotation.update(
                                                    PdfDict(AS=PdfName('Off'), V=PdfName('Off')))
                                    else:
                                        current_app.logger.warning(
                                            f"Valor nulo encontrado para o campo {pdf_field_name}")
                                else:
                                    current_app.logger.warning(
                                        f"Campo {campo_mapping[pdf_field_name]} não encontrado nos dados estruturados")
                            else:
                                current_app.logger.warning(
                                    f"Mapeamento não encontrado para o campo {pdf_field_name}")
        buffer = BytesIO()
        output_pdf.write(buffer)
        buffer.seek(0)
        current_app.logger.info("PDF preenchido com sucesso")
        return buffer
    except Exception as e:
        current_app.logger.error(f"Erro ao preencher o PDF: {str(e)}", exc_info=True)
        raise Exception(f"Erro ao preencher o PDF: {str(e)}")


def buscar_dados_pedido(pk, current_user):
    try:
        with db_session_manager(current_user) as session:
            current_app.logger.debug(f"Iniciando busca de dados para o pedido {pk}")
            query_pedido = text("SELECT * FROM vbl_document WHERE pk = :pk")
            result_pedido = session.execute(query_pedido, {'pk': pk}).fetchone()
            if result_pedido is None:
                current_app.logger.warning(f"Pedido {pk} não encontrado")
                return None
            current_app.logger.debug(f"Resultado da query do pedido: {result_pedido}")
            query_entidade = text("SELECT * FROM vbf_entity WHERE nipc = :nipc")
            result_entidade = session.execute(query_entidade, {'nipc': result_pedido.nipc}).fetchone()
            if result_entidade is None:
                current_app.logger.warning(f"Entidade com NIPC {result_pedido.nipc} não encontrada")
                return None
            current_app.logger.debug(f"Resultado da query da entidade: {result_entidade}")
            result_requerente = None
            if result_pedido.tb_representative:
                query_requerente = text("SELECT * FROM vbf_entity WHERE pk = :pk")
                result_requerente = session.execute(query_requerente, {'pk': result_pedido.tb_representative}).fetchone()
                current_app.logger.debug(f"Resultado da query do requerente: {result_requerente}")

            def result_to_dict(result):
                return {key: getattr(result, key) for key in result._fields}
            dados_estruturados = {
                'pedido': result_to_dict(result_pedido),
                'entidade': result_to_dict(result_entidade),
                'requerente': result_to_dict(result_requerente) if result_requerente else {}
            }
            current_app.logger.debug(f"Dados estruturados: {dados_estruturados}")
            return dados_estruturados
    except Exception as e:
        current_app.logger.error(f"Erro ao buscar os dados do pedido: {str(e)}", exc_info=True)
        raise Exception(f"Erro ao buscar os dados do pedido: {str(e)}")


def create_etar_document_direct(etar_pk, current_user):
    try:
        with db_session_manager(current_user) as session:
            # Executar a função PL/pgSQL que cria o pedido ETAR
            sql = text(
                "SELECT aintar_server_dev.fbo_etar_document_createdirect(:pnpk) AS result")
            result = session.execute(sql, {"pnpk": etar_pk}).fetchone()

            if not result or not result.result:
                raise Exception("Erro ao criar pedido ETAR")

            # Usar a função format_message para limpar a resposta em XML
            formatted_result = format_message(result.result)

            return {"message": f"Pedido ETAR criado com sucesso: {formatted_result}"}, 201

    except Exception as e:
        current_app.logger.error(f"Erro ao criar pedido ETAR: {str(e)}")
        raise


def create_ee_document_direct(ee_pk, current_user):
    try:
        with db_session_manager(current_user) as session:
            # Executar a função PL/pgSQL que cria o pedido EE
            sql = text(
                "SELECT aintar_server_dev.fbo_ee_document_createdirect(:pnpk) AS result")
            result = session.execute(sql, {"pnpk": ee_pk}).fetchone()

            if not result or not result.result:
                raise Exception("Erro ao criar pedido EE")

            # Usar a função format_message para limpar a resposta em XML
            formatted_result = format_message(result.result)

            return {"message": f"Pedido EE criado com sucesso: {formatted_result}"}, 201

    except Exception as e:
        current_app.logger.error(f"Erro ao criar pedido EE: {str(e)}")
        raise


def get_document_ramais(current_user):
    """
    Obtém dados dos ramais do documento da vista vbr_document_ramais02
    """
    try:
        with db_session_manager(current_user) as session:
            ramais_query = text("SELECT * FROM vbr_document_ramais02")
            result = session.execute(ramais_query).mappings().all()

            if result:
                return {'ramais': [dict(row) for row in result]}, 200
            return {'ramais': [], 'message': 'Nenhum ramal encontrado'}, 200

    except Exception as e:
        current_app.logger.error(f"Erro ao obter ramais: {str(e)}")
        return {'error': format_message(str(e))}, 500


def update_document_pavenext(pk, current_user):
    """
    Atualiza o documento usando a função fbo_document_pavenext
    """
    try:
        with db_session_manager(current_user) as session:
            update_query = text("""
                SELECT aintar_server_dev.fbo_document_pavenext(:pk) AS result
            """)
            result = session.execute(update_query, {'pk': pk}).scalar()

            if result:
                formatted_result = format_message(result)
                session.commit()
                return {
                    'message': 'Documento atualizado com sucesso',
                    'result': formatted_result
                }, 200

            return {
                'error': 'Falha ao atualizar documento'
            }, 400

    except Exception as e:
        current_app.logger.error(f"Erro ao atualizar documento: {str(e)}")
        return {'error': format_message(str(e))}, 500


def get_document_ramais_concluded(current_user):
    try:
        with db_session_manager(current_user) as session:
            ramais_query = text("SELECT * FROM vbr_document_ramais03")
            result = session.execute(ramais_query).mappings().all()

            if result:
                return {'ramais': [dict(row) for row in result]}, 200
            return {'ramais': [], 'message': 'Nenhum ramal concluído encontrado'}, 200

    except Exception as e:
        current_app.logger.error(f"Erro ao obter ramais concluídos: {str(e)}")
        return {'error': format_message(str(e))}, 500


def replicate_document_service(pk, new_type, current_user):
    """
    Serviço simplificado para replicar um documento com novo tipo.
    
    Args:
        pk (int): PK do documento original
        new_type (int): Novo tipo de documento
        current_user: Usuário atual
    """
    try:
        with db_session_manager(current_user) as session:
            # Executa a função de replicação
            replicate_query = text("""
            SELECT fbo_document_replicate(:popk, :pntype) AS result
            """)

            result = session.execute(replicate_query, {
                'popk': pk,
                'pntype': new_type
            }).scalar()

            if not result:
                return {'error': 'Falha ao replicar documento'}, 500

            # Retorna o resultado formatado
            return {'message': format_message(result)}, 201

    except Exception as e:
        current_app.logger.error(f"Erro ao replicar documento: {str(e)}")
        return {'error': format_message(str(e))}, 500
