from app.utils.logger import get_logger

logger = get_logger(__name__)


# utils/serializers.py
def model_to_dict(model):
    """Converte modelo SQLAlchemy em dicionário serializável"""
    if model is None:
        return None

    result = {}
    for column in model.__table__.columns:
        result[column.name] = getattr(model, column.name)
    return result
