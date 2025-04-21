# app/services/documents/__init__.py

# Operações CRUD básicas
from .core import (
    list_documents,
    documentById,
    document_self,
    document_owner,
    create_document,
    create_document_direct,
    update_document_notification,
    check_vacation_status,
)

# Workflow
from .workflow import (
    get_document_steps,
    add_document_step,
    update_document_pavenext,
    get_document_type_param,
    update_document_params,
)

# Anexos
from .attachments import (
    get_document_anex_steps,
    add_document_annex,
    download_file,
)

# Relatórios
from .reports import (
    buscar_dados_pedido,
    gerar_comprovativo_pdf,
    preencher_pdf,
)

# Operações especializadas
from .specialized import (
    create_etar_document_direct,
    create_ee_document_direct,
    get_document_ramais,
    get_document_ramais_concluded,
    get_entity_count_types,
)

# Replicação
from .replication import (
    replicate_document_service,
    reopen_document,
)

# Exportar todos os símbolos como interface pública
__all__ = [
    # Core
    'list_documents', 'documentById', 'document_self', 'document_owner',
    'create_document', 'create_document_direct', 'update_document_notification',
    'check_vacation_status',

    # Workflow
    'get_document_steps', 'add_document_step', 'update_document_pavenext',
    'get_document_type_param', 'update_document_params',

    # Anexos
    'get_document_anex_steps', 'add_document_annex', 'download_file',

    # Relatórios
    'buscar_dados_pedido', 'gerar_comprovativo_pdf', 'preencher_pdf',

    # Especializadas
    'create_etar_document_direct', 'create_ee_document_direct',
    'get_document_ramais', 'get_document_ramais_concluded', 'get_entity_count_types',

    # Replicação
    'replicate_document_service', 'reopen_document',
]
