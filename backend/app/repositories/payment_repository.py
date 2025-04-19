# app/repositories/payment_repository.py
from .base_repository import BaseRepository
from app.models import SIBSPayment
from app import db
from datetime import datetime


class PaymentRepository(BaseRepository):
    model = SIBSPayment

    @classmethod
    def find_by_order_id(cls, order_id):
        return cls.model.query.filter_by(order_id=order_id).first()

    @classmethod
    def find_by_transaction_id(cls, transaction_id):
        return cls.model.query.filter_by(transaction_id=transaction_id).first()

    @classmethod
    def update_status(cls, transaction_id, status):
        payment = cls.find_by_transaction_id(transaction_id)
        if payment:
            payment.payment_status = status
            payment.updated_at = datetime.now()
            db.session.commit()
            return True
        return False

    @classmethod
    def approve_payment(cls, payment_id, validator_id):
        payment = cls.get_by_id(payment_id)
        if payment:
            payment.payment_status = 'Success'
            payment.validated_by = validator_id
            payment.validated_at = datetime.now()
            payment.updated_at = datetime.now()
            db.session.commit()
            return True
        return False
