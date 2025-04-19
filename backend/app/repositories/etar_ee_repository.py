# app/repositories/etar_ee_repository.py
from .base_repository import BaseRepository
from app.models import ETAR, EE, ETARVolume, EEVolume
from app import db
from datetime import date


class ETARRepository(BaseRepository):
    model = ETAR

    @classmethod
    def find_by_name(cls, name):
        return cls.model.query.filter(ETAR.nome.ilike(f"%{name}%")).all()

    @classmethod
    def add_volume_reading(cls, etar_id, value, spot_id=None, reading_date=None):
        if not reading_date:
            reading_date = date.today()

        volume = ETARVolume(
            tb_etar=etar_id,
            data=reading_date,
            val=value,
            spot=spot_id
        )
        db.session.add(volume)
        db.session.commit()
        return volume


class EERepository(BaseRepository):
    model = EE

    @classmethod
    def find_by_name(cls, name):
        return cls.model.query.filter(EE.nome.ilike(f"%{name}%")).all()

    @classmethod
    def add_volume_reading(cls, ee_id, value, spot_id=None, reading_date=None):
        if not reading_date:
            reading_date = date.today()

        volume = EEVolume(
            tb_ee=ee_id,
            data=reading_date,
            val=value,
            spot=spot_id
        )
        db.session.add(volume)
        db.session.commit()
        return volume
