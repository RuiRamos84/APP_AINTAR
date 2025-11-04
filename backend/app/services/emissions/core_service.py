# services/emissions/core_service.py
# Serviço Core - CRUD genérico para sistema unificado de emissões
from app import db
from app.models.emission import DocumentType, EmissionTemplate, EmissionTemplateRead, Emission, EmissionRead
from datetime import datetime
from sqlalchemy import desc, or_
from app.utils.utils import db_session_manager


class EmissionCoreService:
    """
    Serviço centralizado para operações CRUD em templates e emissões
    Abstrai lógica comum para todos os tipos de documentos
    """

    # =========================================================================
    # DOCUMENT TYPES
    # =========================================================================

    @staticmethod
    def get_document_types(current_user, active_only=True):
        """Lista todos os tipos de documentos disponíveis"""
        # ts_lettertype não tem campo 'active', retorna todos
        with db_session_manager(current_user):
            # ts_lettertype não tem campo active - sempre retorna todos
            types = DocumentType.query.order_by(DocumentType.name).all()
            return [t.to_dict() for t in types]

    @staticmethod
    def get_document_type_by_code(current_user, code):
        """Obtém tipo de documento por código/acronimo"""
        with db_session_manager(current_user):  
            doc_type = DocumentType.query.filter_by(acron=code).first()
            return doc_type.to_dict() if doc_type else None 

    @staticmethod
    def get_document_type_by_id(type_id, current_user):
        """Obtém tipo de documento por ID"""
        with db_session_manager(current_user):
            doc_type = DocumentType.query.get(type_id)
            return doc_type.to_dict() if doc_type else None

    # =========================================================================
    # TEMPLATES - CRUD
    # =========================================================================

    @staticmethod
    def create_template(current_user, data):
        """
        Cria novo template de emissão

        Args:
            data: dict com {tb_document_type, name, body, header_template, footer_template, metadata}
            current_user: username do utilizador

        Returns:
            EmissionTemplate criado
        """
        
        with db_session_manager(current_user):
            # Verificar se já existe
            existing = EmissionTemplate.query.filter_by(
                ts_lettertype=data.get('tb_document_type'),
                name=data.get('name')
            ).first()
            if existing:
                raise ValueError(f'Template com nome "{data.get("name")}" já existe para o tipo de documento {data.get("tb_document_type")}')
            
            # Criar template
            template = EmissionTemplate(
                ts_lettertype=data.get('tb_document_type'),  # Frontend usa tb_document_type, BD usa ts_lettertype
                name=data.get('name'),
                body=data.get('body'),
                header_template=data.get('header_template'),
                footer_template=data.get('footer_template'),
                version=data.get('version', 1.0),
                active=data.get('active', 1),
                meta_data=data.get('metadata', {}),
                hist_client=data.get('hist_client', 1)  # ID do utilizador que criou
            )
            db.session.add(template)
            db.session.commit()
            db.session.refresh(template)
            return template.to_dict(include_body=True)

    @staticmethod
    def get_template(current_user, template_id):
        """Obtém template por ID (USA VBL - VIEW DE LEITURA)"""

        with db_session_manager(current_user):
            # USA VBL (vbl_letter_template) para leitura
            template = EmissionTemplateRead.query.get(template_id)
            return template.to_dict(include_body=True) if template else None

    @staticmethod
    def list_templates(current_user, filters=None):
        """
        Lista templates com filtros opcionais (USA VBL - VIEW DE LEITURA)

        Args:
            filters: dict com {tb_document_type, active, search, limit, offset}

        Returns:
            Lista de templates
        """

        with db_session_manager(current_user):
            # USA VBL (vbl_letter_template) para leitura
            query = EmissionTemplateRead.query

            if filters:
                # Filtro por tipo (precisa converter ID para nome pois ts_lettertype na view é text)
                if 'tb_document_type' in filters and filters['tb_document_type']:
                    # Buscar o nome do tipo pelo ID
                    doc_type = DocumentType.query.get(filters['tb_document_type'])
                    if doc_type:
                        # ts_lettertype na view contém o NOME do tipo, não o ID
                        query = query.filter(EmissionTemplateRead.ts_lettertype == doc_type.name)

                # Filtro por ativo/inativo
                if 'active' in filters and filters['active'] is not None:
                    query = query.filter(EmissionTemplateRead.active == filters['active'])

                # Pesquisa por nome
                if 'search' in filters and filters['search']:
                    search_term = f"%{filters['search']}%"
                    query = query.filter(EmissionTemplateRead.name.ilike(search_term))

            # Ordenação
            query = query.order_by(EmissionTemplateRead.name)

            # Paginação
            if filters and 'limit' in filters:
                query = query.limit(filters['limit'])
            if filters and 'offset' in filters:
                query = query.offset(filters['offset'])

            templates = query.all()

            return [template.to_dict(include_body=True) for template in templates]

    @staticmethod
    def update_template(current_user, template_id, data):
        """
        Atualiza template existente via VBF

        Args:
            template_id: ID do template
            data: dict com campos a atualizar
            current_user: username

        Returns:
            Template atualizado ou None
        """

        with db_session_manager(current_user):
            from app import db
            from sqlalchemy import text
            import json

            # Buscar template atual para obter todos os valores
            template_read = EmissionTemplateRead.query.get(template_id)
            if not template_read:
                return None

            # Converter ts_lettertype de nome (TEXT) para ID (INTEGER) - VBF espera INTEGER
            doc_type = DocumentType.query.filter_by(name=template_read.ts_lettertype).first()
            if not doc_type:
                raise ValueError(f"Document type '{template_read.ts_lettertype}' not found")

            # Preparar dados completos (mesclar valores atuais com novos)
            update_data = {
                'pk': template_id,
                'ts_lettertype': doc_type.pk,  # Usar ID (INTEGER) ao invés do nome (TEXT)
                'name': data.get('name', template_read.name),
                'body': data.get('body', template_read.body),
                'header_template': data.get('header_template', template_read.header_template),
                'footer_template': data.get('footer_template', template_read.footer_template),
                'version': data.get('version', template_read.version),
                'active': data.get('active', template_read.active),
                'metadata': json.dumps(data.get('metadata', template_read.meta_data or {})),
                'hist_client': int(current_user),
                'hist_time': datetime.now()
            }

            # UPDATE via SQL direto com todos os campos
            update_sql = text("""
                UPDATE vbf_letter_template SET
                    ts_lettertype = :ts_lettertype,
                    name = :name,
                    body = :body,
                    header_template = :header_template,
                    footer_template = :footer_template,
                    version = :version,
                    active = :active,
                    metadata = CAST(:metadata AS jsonb),
                    hist_client = :hist_client,
                    hist_time = :hist_time
                WHERE pk = :pk
            """)

            db.session.execute(update_sql, update_data)
            db.session.commit()

            # Buscar e retornar template atualizado
            updated_template = EmissionTemplateRead.query.get(template_id)
            return updated_template.to_dict(include_body=True) if updated_template else None

    @staticmethod
    def delete_template(current_user, template_id):
        """
        Apaga template (soft delete - marca como inativo)

        Args:
            template_id: ID do template
            current_user: username

        Returns:
            True se sucesso, False caso contrário
        """
        
        with db_session_manager(current_user):
            template = EmissionTemplate.query.get(template_id)
            if not template:
                return False

            # Soft delete
            template.active = 0
            template.hist_time = datetime.now()

            db.session.commit()

            return True

    # =========================================================================
    # EMISSIONS - CRUD
    # =========================================================================

    @staticmethod
    def create_emission(current_user, data):
        """
        Cria nova emissão

        Args:
            data: dict com todos os campos da emissão
            current_user: username

        Returns:
            Emission criada
        """
        
        with db_session_manager(current_user):
            from app import db
            from sqlalchemy import text
            import json

            # Preparar dados para insert (SEM emission_number - gerado automaticamente pela view)
            emission_data = {
                'tb_document': data.get('tb_document'),
                'tb_letter_template': data.get('tb_letter_template'),
                'ts_letterstatus': data.get('ts_letterstatus', Emission.STATUS_DRAFT),
                'emission_date': data.get('emission_date', datetime.now()),
                'subject': data.get('subject'),
                'recipient_data': json.dumps(data.get('recipient_data', {})),
                'custom_data': json.dumps(data.get('custom_data', {})),
                'filename': data.get('filename', ''),
                'hist_client': int(current_user),
                'hist_time': datetime.now(),
                'sign_client': None,
                'sign_time': None
            }

            # INSERT via SQL raw (sem RETURNING e sem emission_number) na view
            # A view/trigger gera o emission_number automaticamente
            insert_sql = text("""
                INSERT INTO vbf_letter (
                    tb_document, tb_letter_template, ts_letterstatus,
                    emission_date, subject,
                    recipient_data, custom_data, filename,
                    hist_client, hist_time, sign_client, sign_time
                ) VALUES (
                    :tb_document, :tb_letter_template, :ts_letterstatus,
                    :emission_date, :subject,
                    CAST(:recipient_data AS jsonb), CAST(:custom_data AS jsonb), :filename,
                    :hist_client, :hist_time, :sign_client, :sign_time
                )
            """)

            from app.utils.logger import get_logger
            logger = get_logger(__name__)

            logger.info(f"[CREATE_EMISSION] Inserindo emissão (número será gerado automaticamente)")
            logger.info(f"[CREATE_EMISSION] Template: {data.get('tb_letter_template')}, Subject: {data.get('subject')}")

            db.session.execute(insert_sql, emission_data)
            db.session.commit()

            logger.info(f"[CREATE_EMISSION] ✅ Emissão criada com sucesso! Frontend deve recarregar lista.")

            # Retornar sucesso simples - o número foi gerado automaticamente pela view
            # O frontend vai recarregar a lista e mostrar a nova emissão
            return {
                'success': True,
                'message': 'Emissão criada com sucesso',
                'subject': data.get('subject')
            }

    @staticmethod
    def get_emission(current_user, emission_id):
        """Obtém emissão por ID (retorna dict)"""

        with db_session_manager(current_user):
            emission = Emission.query.get(emission_id)
            return emission.to_dict() if emission else None

    @staticmethod
    def get_emission_object(current_user, emission_id):
        """
        Obtém emissão por ID (retorna objeto SQLAlchemy para update)
        NOTA: Esta função NÃO usa db_session_manager porque deve ser chamada
        dentro de um contexto que JÁ tem uma sessão ativa (ex: rota /generate)
        """
        return Emission.query.get(emission_id)

    @staticmethod
    def get_emission_by_number(emission_number, current_user):
        """Obtém emissão por número"""

        with db_session_manager(current_user):
            emission = Emission.query.filter_by(emission_number=emission_number).first()
            return emission.to_dict() if emission else None

    @staticmethod
    def list_emissions(current_user, filters=None):
        """
        Lista emissões com filtros (USA VBL - VIEW DE LEITURA)

        Args:
            filters: dict com {status, search, date_from, date_to, limit, offset, created_by, tb_document_type}

        Returns:
            Lista de emissões
        """

        with db_session_manager(current_user):
            # USA VBL (vbl_letter) para leitura - retorna nomes em vez de IDs
            query = EmissionRead.query

            if filters:
                # Filtro por tipo de documento
                if 'tb_document_type' in filters and filters['tb_document_type']:
                    # VBL usa nomes, precisamos buscar o nome do tipo
                    doc_type = DocumentType.query.get(filters['tb_document_type'])
                    if doc_type:
                        # Filtrar pelo nome do tipo (VBL retorna nomes)
                        query = query.filter(EmissionRead.ts_lettertype == doc_type.name)

                # Filtro por status (converter código para nome)
                if 'status' in filters and filters['status']:
                    status_map = {
                        1: 'Rascunho',
                        2: 'Emitido',
                        3: 'Assinado',
                        4: 'Cancelado',
                        'draft': 'Rascunho',
                        'issued': 'Emitido',
                        'signed': 'Assinado',
                        'cancelled': 'Cancelado'
                    }
                    status_name = status_map.get(filters['status'], filters['status'])
                    query = query.filter(EmissionRead.ts_letterstatus == status_name)

                # Filtro por criador
                if 'created_by' in filters and filters['created_by']:
                    query = query.filter(EmissionRead.hist_client == filters['created_by'])

                # Pesquisa
                if 'search' in filters and filters['search']:
                    search_term = f"%{filters['search']}%"
                    query = query.filter(
                        or_(
                            EmissionRead.emission_number.ilike(search_term),
                            EmissionRead.subject.ilike(search_term),
                            EmissionRead.tb_letter_template.ilike(search_term)  # Também pesquisar no nome do template
                        )
                    )

                # Filtro por data
                if 'date_from' in filters and filters['date_from']:
                    query = query.filter(EmissionRead.emission_date >= filters['date_from'])
                if 'date_to' in filters and filters['date_to']:
                    query = query.filter(EmissionRead.emission_date <= filters['date_to'])

            # Ordenação
            query = query.order_by(desc(EmissionRead.emission_date))

            # Paginação
            if filters and 'limit' in filters:
                query = query.limit(filters['limit'])
            if filters and 'offset' in filters:
                query = query.offset(filters['offset'])

            emissions = query.all()

            return [emission.to_dict() for emission in emissions]

    @staticmethod
    def update_emission(current_user, emission_id, data):
        """Atualiza emissão existente"""
        
        with db_session_manager(current_user):
            # Obter emissão
            emission = Emission.query.get(emission_id)
            if not emission:
                return None

            # Verificar se pode editar
            if not emission.can_edit:
                raise ValueError(f'Emissão {emission.emission_number} não pode ser editada (status: {emission.get_status_name()})')

            # Atualizar campos
            if 'subject' in data:
                emission.subject = data['subject']
            if 'recipient_data' in data:
                emission.recipient_data = data['recipient_data']
            if 'custom_data' in data:
                emission.custom_data = data['custom_data']
            if 'ts_letterstatus' in data:
                emission.ts_letterstatus = data['ts_letterstatus']
            if 'filename' in data:
                emission.filename = data['filename']

            emission.hist_time = datetime.now()

            db.session.commit()

            return emission.to_dict() if emission else None

    @staticmethod
    def delete_emission(current_user, emission_id):
        """Cancela emissão (soft delete)"""
        
        with db_session_manager(current_user):
            # Obter emissão
            emission = Emission.query.get(emission_id)
            if not emission:
                return False

            # Soft delete via status
            emission.ts_letterstatus = Emission.STATUS_CANCELLED
            emission.hist_time = datetime.now()

            db.session.commit()

            return True
