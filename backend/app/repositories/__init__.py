from .user_repository import UserRepository
from .entity_repository import EntityRepository  # Adicionado
from .document_repository import DocumentRepository, DocumentStepRepository, DocumentAnnexRepository
from .task_repository import TaskRepository, TaskNoteRepository
from .etar_ee_repository import ETARRepository, EERepository
from .payment_repository import PaymentRepository

__all__ = [
    'UserRepository',
    'EntityRepository',  # Adicionado
    'DocumentRepository', 'DocumentStepRepository', 'DocumentAnnexRepository',
    'TaskRepository', 'TaskNoteRepository',
    'ETARRepository', 'EERepository',
    'PaymentRepository'
]
