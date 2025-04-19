# models/payment.py
from app import db
from datetime import datetime


class SIBSPayment(db.Model):
    __tablename__ = 'vbf_sibs'

    pk = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.String(100), nullable=False)
    transaction_id = db.Column(db.String(100), nullable=False)
    transaction_signature = db.Column(db.String(255))
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    currency = db.Column(db.String(3), default='EUR')
    payment_method = db.Column(db.String(20))
    payment_status = db.Column(db.String(50), default='PENDING')
    payment_reference = db.Column(db.Text)
    entity = db.Column(db.String(50))
    expiry_date = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.now)
    updated_at = db.Column(db.DateTime, onupdate=datetime.now)
    validated_by = db.Column(db.Integer, db.ForeignKey(
        'vbf_entity.pk'), nullable=True)
    validated_at = db.Column(db.DateTime, nullable=True)

    validator = db.relationship('User', foreign_keys=[validated_by])
