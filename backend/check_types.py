#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Script para verificar tipos de documentos na base de dados"""

from app import app, db
from app.models.emission import DocumentType

with app.app_context():
    try:
        total = DocumentType.query.count()
        print(f'Total de tipos de documentos: {total}')

        tipos = DocumentType.query.all()

        if tipos:
            print('\nTipos encontrados:')
            for t in tipos:
                print(f'  ID {t.pk}: [{t.acron}] {t.name}')
                print(f'     Descricao: {t.description}')
        else:
            print('\nNENHUM tipo encontrado! A tabela ts_lettertype esta vazia.')
            print('Precisamos popular a tabela com dados iniciais.')

    except Exception as e:
        print(f'ERRO ao consultar: {e}')
        import traceback
        traceback.print_exc()
