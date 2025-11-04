# models/emission.py
# Sistema Unificado de Emissões - Modelos SQLAlchemy mapeados para estrutura existente
from app import db
from datetime import datetime
from sqlalchemy.dialects.postgresql import JSONB


class DocumentType(db.Model):
    """
    Tipos de documentos emitidos pelo sistema (mapeado para ts_lettertype)
    (Ofícios, Notificações, Declarações, Informações, Deliberações)
    """
    __tablename__ = 'ts_lettertype'

    pk = db.Column(db.Integer, primary_key=True)
    acron = db.Column(db.String(10), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False, unique=True)
    description = db.Column(db.Text, nullable=False)

    # Relationships
    templates = db.relationship('EmissionTemplate', back_populates='document_type', lazy='dynamic')

    def __repr__(self):
        return f'<DocumentType {self.acron}: {self.name}>'

    def to_dict(self):
        return {
            'pk': self.pk,
            'acron': self.acron,  # Campo original
            'code': self.acron,  # Mapeado de acron para code (compatibilidade frontend)
            'name': self.name,
            'prefix': self.acron,  # Usar acron como prefix
            'description': self.description,
            'active': 1  # Sempre ativo por agora
        }


class EmissionTemplateRead(db.Model):
    """
    Templates - VIEW DE LEITURA (VBL)
    Usa vbl_letter_template para operações SELECT
    """
    __tablename__ = 'vbl_letter_template'

    pk = db.Column(db.Integer, primary_key=True)
    ts_lettertype = db.Column(db.String, db.ForeignKey('ts_lettertype.pk'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False, unique=True, index=True)
    body = db.Column(db.Text, nullable=False)
    header_template = db.Column(db.Text)
    footer_template = db.Column(db.Text)
    version = db.Column(db.Float, default=1.0)
    active = db.Column(db.Integer, default=1)
    meta_data = db.Column('metadata', JSONB, default={})  # Usar meta_data como atributo Python
    hist_client = db.Column(db.Integer)
    hist_time = db.Column(db.DateTime)

    # Sem relacionamento direto pois ts_lettertype é TEXT (nome), não INTEGER (FK)

    def __repr__(self):
        return f'<EmissionTemplateRead {self.pk}: {self.name}>'

    def to_dict(self, include_body=False):
        # Buscar document_type pelo nome (ts_lettertype contém o nome, não o ID)
        doc_type = DocumentType.query.filter_by(name=self.ts_lettertype).first()

        data = {
            'pk': self.pk,
            'tb_document_type': doc_type.pk if doc_type else None,  # Retornar o ID
            'document_type': doc_type.to_dict() if doc_type else None,
            'name': self.name,
            'version': self.version,
            'active': self.active,
            'meta_data': self.meta_data or {},
            'hist_time': self.hist_time.isoformat() if self.hist_time else None
        }

        if include_body:
            data['body'] = self.body
            data['header_template'] = self.header_template
            data['footer_template'] = self.footer_template

        return data


class EmissionTemplate(db.Model):
    """
    Templates - VIEW DE ESCRITA (VBF)
    Usa vbf_letter_template para operações INSERT/UPDATE/DELETE
    """
    __tablename__ = 'vbf_letter_template'

    pk = db.Column(db.Integer, primary_key=True, autoincrement=True)
    ts_lettertype = db.Column(db.String, db.ForeignKey('ts_lettertype.pk'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False, unique=True, index=True)
    body = db.Column(db.Text, nullable=False)
    header_template = db.Column(db.Text)
    footer_template = db.Column(db.Text)
    version = db.Column(db.Float, default=1.0)
    active = db.Column(db.Integer, default=1)
    meta_data = db.Column('metadata', JSONB, default={})
    hist_client = db.Column(db.Integer)
    hist_time = db.Column(db.DateTime)

    # Relationships
    document_type = db.relationship('DocumentType', back_populates='templates')

    def __repr__(self):
        return f'<EmissionTemplate {self.pk}: {self.name}>'

    def to_dict(self, include_body=False):
        data = {
            'pk': self.pk,
            'tb_document_type': self.ts_lettertype,
            'document_type': self.document_type.to_dict() if self.document_type else None,
            'name': self.name,
            'version': self.version,
            'active': self.active,
            'meta_data': self.meta_data or {},
            'hist_time': self.hist_time.isoformat() if self.hist_time else None
        }

        if include_body:
            data['body'] = self.body
            data['header_template'] = self.header_template
            data['footer_template'] = self.footer_template

        return data


class Emission(db.Model):
    """
    Registro centralizado de todas as emissões (mapeado para vbf_letter view)
    """
    __tablename__ = 'vbf_letter'
    __mapper_args__ = {
        'eager_defaults': False,  # Não usar RETURNING
    }

    pk = db.Column(db.Integer, primary_key=True)
    tb_document = db.Column(db.Integer, db.ForeignKey('vbf_document.pk'), nullable=True, index=True)
    tb_letter_template = db.Column(db.Integer, db.ForeignKey('tb_letter_template.pk'), nullable=False, index=True)
    ts_letterstatus = db.Column(db.Integer, nullable=False, index=True)

    emission_number = db.Column(db.String(50), unique=True, nullable=False)
    emission_date = db.Column(db.DateTime, default=datetime.now, nullable=False)
    subject = db.Column(db.Text, nullable=False)

    recipient_data = db.Column(JSONB, default={}, nullable=False)
    custom_data = db.Column(JSONB, default={}, nullable=False)

    filename = db.Column(db.Text, nullable=False)

    hist_client = db.Column(db.Integer, nullable=False)
    hist_time = db.Column(db.DateTime, default=datetime.now, nullable=False)

    sign_client = db.Column(db.Integer)
    sign_time = db.Column(db.DateTime)
    sign_data = db.Column(JSONB)

    # Relationships
    template = db.relationship('EmissionTemplate',
                              primaryjoin='Emission.tb_letter_template == foreign(EmissionTemplate.pk)',
                              viewonly=True,
                              uselist=False)
    document = db.relationship('Document', foreign_keys=[tb_document])

    @property
    def document_type(self):
        """Retorna o tipo de documento através do template"""
        if self.template and self.template.document_type:
            return self.template.document_type
        return None

    # Status constants (mapeado de ts_letterstatus)
    STATUS_DRAFT = 1      # Rascunho
    STATUS_ISSUED = 2     # Emitido
    STATUS_SIGNED = 3     # Assinado
    STATUS_CANCELLED = 4  # Cancelado

    def __repr__(self):
        return f'<Emission {self.emission_number}: {self.subject}>'

    def to_dict(self, include_file=False):
        data = {
            'pk': self.pk,
            'tb_emission_template': self.tb_letter_template,
            'template': self.template.to_dict(include_body=True) if self.template else None,
            'tb_document_type': self.template.ts_lettertype if self.template else None,
            'document_type': self.document_type.to_dict() if self.document_type else None,
            'tb_document': self.tb_document,
            'emission_number': self.emission_number,
            'emission_date': self.emission_date.isoformat() if self.emission_date else None,
            'subject': self.subject,
            'recipient_data': self.recipient_data or {},
            'custom_data': self.custom_data or {},
            'status': self.get_status_name(),
            'created_at': self.hist_time.isoformat() if self.hist_time else None,
            'created_by': self.hist_client,
            'hist_time': self.hist_time.isoformat() if self.hist_time else None,
            'hist_client': self.hist_client,
            'signed_at': self.sign_time.isoformat() if self.sign_time else None,
            'signed_by': self.sign_client,
            'has_signature': bool(self.sign_data),
            'filename': self.filename  # Sempre incluir filename
        }

        return data

    def get_status_name(self):
        """Retorna o nome do status baseado no ts_letterstatus"""
        status_map = {
            1: 'draft',
            2: 'issued',
            3: 'signed',
            4: 'cancelled'
        }
        return status_map.get(self.ts_letterstatus, 'unknown')

    @property
    def is_draft(self):
        return self.ts_letterstatus == self.STATUS_DRAFT

    @property
    def is_issued(self):
        return self.ts_letterstatus == self.STATUS_ISSUED

    @property
    def is_signed(self):
        return self.ts_letterstatus == self.STATUS_SIGNED


class EmissionRead(db.Model):
    """
    Emissions - VIEW DE LEITURA (VBL)
    Usa vbl_letter que retorna dados humanizados (nomes em vez de IDs)
    """
    __tablename__ = 'vbl_letter'
    __table_args__ = {'info': {'skip_autogenerate': True}}

    pk = db.Column(db.Integer, primary_key=True)
    tb_document = db.Column(db.Integer, index=True)
    regnumber = db.Column(db.String)
    tb_letter_template = db.Column(db.String, index=True)  # TEXT: nome do template
    ts_lettertype = db.Column(db.String, index=True)  # TEXT: nome do tipo (ex: "Ofício")
    ts_letterstatus = db.Column(db.String, index=True)  # TEXT: nome do status (ex: "Emitido", "Rascunho")

    emission_number = db.Column(db.String(50), unique=True, nullable=False)
    emission_date = db.Column(db.DateTime, nullable=False)
    subject = db.Column(db.Text, nullable=False)

    recipient_data = db.Column(JSONB, default={}, nullable=False)
    custom_data = db.Column(JSONB, default={}, nullable=False)

    filename = db.Column(db.Text)

    hist_client = db.Column(db.Integer)
    hist_time = db.Column(db.DateTime)

    sign_client = db.Column(db.Integer)
    sign_time = db.Column(db.DateTime)
    sign_data = db.Column(JSONB)

    def __repr__(self):
        return f'<EmissionRead {self.emission_number}: {self.subject}>'

    def to_dict(self, include_file=False):
        """Converte para dict, tratando os nomes que vêm da VBL"""

        # Buscar document type pelo nome
        doc_type = None
        if self.ts_lettertype:
            doc_type = DocumentType.query.filter_by(name=self.ts_lettertype).first()

        # Mapear status name para código
        status_map = {
            'Rascunho': 'draft',
            'Emitido': 'issued',
            'Assinado': 'signed',
            'Cancelado': 'cancelled'
        }
        status_code = status_map.get(self.ts_letterstatus, 'unknown')

        data = {
            'pk': self.pk,
            'tb_document': self.tb_document,
            'regnumber': self.regnumber,
            'template_name': self.tb_letter_template,  # Nome do template
            'document_type_name': self.ts_lettertype,  # Nome do tipo
            'document_type': doc_type.to_dict() if doc_type else None,
            'tb_document_type': doc_type.pk if doc_type else None,
            'emission_number': self.emission_number,
            'emission_date': self.emission_date.isoformat() if self.emission_date else None,
            'subject': self.subject,
            'recipient_data': self.recipient_data or {},
            'custom_data': self.custom_data or {},
            'status': status_code,
            'status_display': self.ts_letterstatus,  # Status em texto
            'created_at': self.hist_time.isoformat() if self.hist_time else None,
            'created_by': self.hist_client,
            'hist_time': self.hist_time.isoformat() if self.hist_time else None,
            'hist_client': self.hist_client,
            'signed_at': self.sign_time.isoformat() if self.sign_time else None,
            'signed_by': self.sign_client,
            'has_signature': bool(self.sign_data),
            'filename': self.filename
        }

        return data

    @property
    def can_sign(self):
        return self.ts_letterstatus == self.STATUS_ISSUED


class EmissionAudit(db.Model):
    """
    Auditoria de emissões (nova tabela opcional - pode ser criada depois)
    Por agora, mantemos mas não é obrigatório
    """
    __tablename__ = 'tb_emission_audit'

    pk = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.String(100), nullable=False, index=True)
    action = db.Column(db.String(50), nullable=False, index=True)
    action_description = db.Column(db.String(255))

    emission_template_id = db.Column(db.Integer, nullable=True, index=True)
    emission_id = db.Column(db.Integer, nullable=True, index=True)

    details = db.Column(JSONB)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.now, index=True)

    # Action constants
    ACTION_TEMPLATE_CREATE = 'TEMPLATE_CREATE'
    ACTION_TEMPLATE_UPDATE = 'TEMPLATE_UPDATE'
    ACTION_TEMPLATE_DELETE = 'TEMPLATE_DELETE'
    ACTION_TEMPLATE_VIEW = 'TEMPLATE_VIEW'

    ACTION_EMISSION_CREATE = 'EMISSION_CREATE'
    ACTION_EMISSION_UPDATE = 'EMISSION_UPDATE'
    ACTION_EMISSION_DELETE = 'EMISSION_DELETE'
    ACTION_EMISSION_GENERATE = 'EMISSION_GENERATE'
    ACTION_EMISSION_PREVIEW = 'EMISSION_PREVIEW'
    ACTION_EMISSION_VIEW = 'EMISSION_VIEW'
    ACTION_EMISSION_DOWNLOAD = 'EMISSION_DOWNLOAD'

    ACTION_SIGN_CMD = 'EMISSION_SIGN_CMD'
    ACTION_SIGN_CC = 'EMISSION_SIGN_CC'
    ACTION_SIGN_VALIDATE = 'EMISSION_SIGN_VALIDATE'

    def __repr__(self):
        return f'<EmissionAudit {self.pk}: {self.action} by {self.user_id}>'

    def to_dict(self):
        return {
            'pk': self.pk,
            'user_id': self.user_id,
            'action': self.action,
            'action_description': self.action_description,
            'emission_template_id': self.emission_template_id,
            'emission_id': self.emission_id,
            'details': self.details,
            'ip_address': self.ip_address,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
