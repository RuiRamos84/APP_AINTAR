-- backend/app/sql/rh/01_lookups.sql
-- Lookups do módulo RH Pessoal
-- Executar como superuser ou owner da BD

-- Tipo de jornada
CREATE TABLE IF NOT EXISTS tt_rh_tipo_jornada (
    pk   INTEGER PRIMARY KEY,
    descr VARCHAR(50) NOT NULL
);
INSERT INTO tt_rh_tipo_jornada (pk, descr) VALUES
    (1, 'Partida'),
    (2, 'Contínua')
ON CONFLICT (pk) DO NOTHING;

-- Tipo de evento de ponto
CREATE TABLE IF NOT EXISTS tt_rh_ponto_evento (
    pk   INTEGER PRIMARY KEY,
    descr VARCHAR(50) NOT NULL,
    ordem INTEGER NOT NULL
);
INSERT INTO tt_rh_ponto_evento (pk, descr, ordem) VALUES
    (1, 'Entrada',         1),
    (2, 'Início Almoço',   2),
    (3, 'Fim Almoço',      3),
    (4, 'Saída',           4)
ON CONFLICT (pk) DO NOTHING;

-- Tipo de férias/tolerância
CREATE TABLE IF NOT EXISTS tt_rh_tipo_ferias (
    pk   INTEGER PRIMARY KEY,
    descr VARCHAR(80) NOT NULL,
    debita_saldo BOOLEAN NOT NULL DEFAULT TRUE
);
INSERT INTO tt_rh_tipo_ferias (pk, descr, debita_saldo) VALUES
    (1, 'Férias',              TRUE),
    (2, 'Tolerância de Ponto', FALSE),
    (3, 'Aniversário',         FALSE)
ON CONFLICT (pk) DO NOTHING;

-- Tipo de falta
CREATE TABLE IF NOT EXISTS tt_rh_tipo_falta (
    pk   INTEGER PRIMARY KEY,
    descr VARCHAR(80) NOT NULL,
    requer_justificativo BOOLEAN NOT NULL DEFAULT FALSE
);
INSERT INTO tt_rh_tipo_falta (pk, descr, requer_justificativo) VALUES
    (1, 'Justificada',         TRUE),
    (2, 'Injustificada',       FALSE),
    (3, 'Tolerância de Ponto', FALSE),
    (4, 'Licença',             TRUE)
ON CONFLICT (pk) DO NOTHING;

-- Estado do workflow (partilhado por ponto, férias e faltas)
CREATE TABLE IF NOT EXISTS tt_rh_estado_workflow (
    pk   INTEGER PRIMARY KEY,
    descr VARCHAR(50) NOT NULL,
    cor   VARCHAR(20)
);
INSERT INTO tt_rh_estado_workflow (pk, descr, cor) VALUES
    (1, 'Pendente',            'warning'),
    (2, 'Validado Superior',   'info'),
    (3, 'Aprovado RH',         'success'),
    (4, 'Rejeitado',           'error')
ON CONFLICT (pk) DO NOTHING;

-- Tipo de ocorrência de piquete
CREATE TABLE IF NOT EXISTS tt_rh_piquete_ocorrencia (
    pk   INTEGER PRIMARY KEY,
    descr VARCHAR(80) NOT NULL
);
INSERT INTO tt_rh_piquete_ocorrencia (pk, descr) VALUES
    (1, 'Chamada Telefónica'),
    (2, 'Intervenção no Local'),
    (3, 'Equipa Accionada'),
    (4, 'Outro')
ON CONFLICT (pk) DO NOTHING;
