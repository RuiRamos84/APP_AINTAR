import time
from app.utils.logger import get_logger

logger = get_logger(__name__)


last_activity = int(time.time())  # Gera um timestamp atual
print(last_activity)  # Imprime o timestamp atual
