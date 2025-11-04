-- Fix tb_letter pk sequence
-- Este script cria e configura a sequence para auto-increment do pk

-- Criar sequence se não existir
CREATE SEQUENCE IF NOT EXISTS tb_letter_pk_seq;

-- Configurar o valor atual da sequence para o máximo pk existente + 1
SELECT setval('tb_letter_pk_seq', (SELECT COALESCE(MAX(pk), 0) + 1 FROM tb_letter));

-- Associar a sequence à coluna pk como valor padrão
ALTER TABLE tb_letter ALTER COLUMN pk SET DEFAULT nextval('tb_letter_pk_seq');

-- Associar a sequence à coluna (para que DROP TABLE também remova a sequence)
ALTER SEQUENCE tb_letter_pk_seq OWNED BY tb_letter.pk;

-- Verificar
SELECT
    'Sequence configurada com sucesso!' as status,
    (SELECT last_value FROM tb_letter_pk_seq) as proximo_valor,
    (SELECT MAX(pk) FROM tb_letter) as max_pk_atual;
