from app import db
from datetime import datetime


class Entity(db.Model):
    __tablename__ = 'entities'

    pk = db.Column(db.Integer, primary_key=True)
    nipc = db.Column(db.String(20), unique=True, nullable=False, index=True)
    name = db.Column(db.String(150), nullable=False)
    address = db.Column(db.String(255))
    postal = db.Column(db.String(20))
    door = db.Column(db.String(20))
    floor = db.Column(db.String(20))
    nut1 = db.Column(db.String(50))
    nut2 = db.Column(db.String(50))
    nut3 = db.Column(db.String(50))
    nut4 = db.Column(db.String(50))
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    ident_type = db.Column(
        db.Integer, db.ForeignKey('identification_types.pk'))
    ident_value = db.Column(db.String(50))
    descr = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relações
    documents = db.relationship('Document', backref='entity', lazy='dynamic')

    def to_dict(self):
        return {
            'pk': self.pk,
            'nipc': self.nipc,
            'name': self.name,
            'address': self.address,
            'postal': self.postal,
            'door': self.door,
            'floor': self.floor,
            'nut1': self.nut1,
            'nut2': self.nut2,
            'nut3': self.nut3,
            'nut4': self.nut4,
            'phone': self.phone,
            'email': self.email,
            'ident_type': self.ident_type,
            'ident_value': self.ident_value,
            'descr': self.descr,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'documents': [doc.to_dict() for doc in self.documents.all()]
        }
