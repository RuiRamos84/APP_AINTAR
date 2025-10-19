-- ============================================================================
-- Adicionar campos 'what' e 'tt_type' às views de operation-legacy
-- Para suportar workflow dinâmico sem precisar de fetch adicional
-- ============================================================================

-- VIEW 1: vbr_document_fossa01 (steps 10, 17)
-- ============================================================================
CREATE OR REPLACE VIEW aintar_server_dev.vbr_document_fossa01
AS SELECT b.pk,
    e.name AS ts_entity,
    t.value AS tipo,
    COALESCE(i.nome ||
        CASE i.tipo
            WHEN 1 THEN ' (ETAR)'::text
            WHEN 2 THEN ' (EE)'::text
            ELSE NULL::text
        END, b.address) AS address,
    b.postal,
    b.door,
    b.floor,
    b.nut1,
    b.nut2,
    b.nut3,
    b.nut4,
    e.phone,
    a.name AS ts_associate,
    b.regnumber,
    to_char(b.submission, 'YYYY-MM-DD às HH24:MI'::text) AS submission,
    b.memo,
    s.who,
    aintar_server_dev.fbo_document_urgencyget(b.pk) AS urgency,
    i.nome ||
        CASE i.tipo
            WHEN 1 THEN ' (ETAR)'::text
            WHEN 2 THEN ' (EE)'::text
            ELSE NULL::text
        END AS tb_instalacao,
    -- 🔥 NOVOS CAMPOS PARA WORKFLOW DINÂMICO
    s.what,
    b.tt_type
   FROM aintar_server_dev.tb_document b
     LEFT JOIN aintar_server_dev.ts_entity e ON b.ts_entity = e.pk
     LEFT JOIN aintar_server_dev.ts_entity a ON b.ts_associate = a.pk
     LEFT JOIN aintar_server_dev.tt_doctype t ON b.tt_type = t.pk
     LEFT JOIN aintar_server_dev.tb_document_step s ON b.pk = s.tb_document
     LEFT JOIN aintar_server_dev.tb_instalacao i ON b.tb_instalacao = i.pk
  WHERE (b.tt_type = ANY (ARRAY[2, 40, 41])) AND s.ord = 0 AND (s.what = ANY (ARRAY[10, 17]))
  ORDER BY b.submission;


-- VIEW 2: vbr_document_fossa02 (steps 11, 18, 25)
-- ============================================================================
CREATE OR REPLACE VIEW aintar_server_dev.vbr_document_fossa02
AS SELECT b.pk,
    e.name AS ts_entity,
    t.value AS tipo,
    COALESCE(i.nome ||
        CASE i.tipo
            WHEN 1 THEN ' (ETAR)'::text
            WHEN 2 THEN ' (EE)'::text
            ELSE NULL::text
        END, b.address) AS address,
    b.postal,
    b.door,
    b.floor,
    b.nut1,
    b.nut2,
    b.nut3,
    b.nut4,
    e.phone,
    a.name AS ts_associate,
    b.regnumber,
    to_char(b.submission, 'YYYY-MM-DD às HH24:MI'::text) AS submission,
    b.memo,
    s.who,
    aintar_server_dev.fbo_document_urgencyget(b.pk) AS urgency,
    i.nome ||
        CASE i.tipo
            WHEN 1 THEN ' (ETAR)'::text
            WHEN 2 THEN ' (EE)'::text
            ELSE NULL::text
        END AS tb_instalacao,
    -- 🔥 NOVOS CAMPOS PARA WORKFLOW DINÂMICO
    s.what,
    b.tt_type
   FROM aintar_server_dev.tb_document b
     LEFT JOIN aintar_server_dev.ts_entity e ON b.ts_entity = e.pk
     LEFT JOIN aintar_server_dev.ts_entity a ON b.ts_associate = a.pk
     LEFT JOIN aintar_server_dev.tt_doctype t ON b.tt_type = t.pk
     LEFT JOIN aintar_server_dev.tb_document_step s ON b.pk = s.tb_document
     LEFT JOIN aintar_server_dev.tb_instalacao i ON b.tb_instalacao = i.pk
  WHERE (b.tt_type = ANY (ARRAY[2, 40, 41])) AND s.ord = 0 AND (s.what = ANY (ARRAY[11, 18, 25]))
  ORDER BY b.submission;


-- VIEW 3: vbr_document_fossa03 (step 12)
-- ============================================================================
CREATE OR REPLACE VIEW aintar_server_dev.vbr_document_fossa03
AS SELECT b.pk,
    e.name AS ts_entity,
    t.value AS tipo,
    COALESCE(i.nome ||
        CASE i.tipo
            WHEN 1 THEN ' (ETAR)'::text
            WHEN 2 THEN ' (EE)'::text
            ELSE NULL::text
        END, b.address) AS address,
    b.postal,
    b.door,
    b.floor,
    b.nut1,
    b.nut2,
    b.nut3,
    b.nut4,
    e.phone,
    a.name AS ts_associate,
    b.regnumber,
    to_char(b.submission, 'YYYY-MM-DD às HH24:MI'::text) AS submission,
    b.memo,
    s.who,
    aintar_server_dev.fbo_document_urgencyget(b.pk) AS urgency,
    i.nome ||
        CASE i.tipo
            WHEN 1 THEN ' (ETAR)'::text
            WHEN 2 THEN ' (EE)'::text
            ELSE NULL::text
        END AS tb_instalacao,
    -- 🔥 NOVOS CAMPOS PARA WORKFLOW DINÂMICO
    s.what,
    b.tt_type
   FROM aintar_server_dev.tb_document b
     LEFT JOIN aintar_server_dev.ts_entity e ON b.ts_entity = e.pk
     LEFT JOIN aintar_server_dev.ts_entity a ON b.ts_associate = a.pk
     LEFT JOIN aintar_server_dev.tt_doctype t ON b.tt_type = t.pk
     LEFT JOIN aintar_server_dev.tb_document_step s ON b.pk = s.tb_document
     LEFT JOIN aintar_server_dev.tb_instalacao i ON b.tb_instalacao = i.pk
  WHERE (b.tt_type = ANY (ARRAY[2, 40, 41])) AND s.ord = 0 AND s.what = 12
  ORDER BY b.submission;


-- VIEW 4: vbr_document_fossa04 (steps 13, 19)
-- ============================================================================
CREATE OR REPLACE VIEW aintar_server_dev.vbr_document_fossa04
AS SELECT b.pk,
    e.name AS ts_entity,
    t.value AS tipo,
    COALESCE(i.nome ||
        CASE i.tipo
            WHEN 1 THEN ' (ETAR)'::text
            WHEN 2 THEN ' (EE)'::text
            ELSE NULL::text
        END, b.address) AS address,
    b.postal,
    b.door,
    b.floor,
    b.nut1,
    b.nut2,
    b.nut3,
    b.nut4,
    e.phone,
    a.name AS ts_associate,
    b.regnumber,
    to_char(b.submission, 'YYYY-MM-DD às HH24:MI'::text) AS submission,
    b.memo,
    s.who,
    aintar_server_dev.fbo_document_urgencyget(b.pk) AS urgency,
    i.nome ||
        CASE i.tipo
            WHEN 1 THEN ' (ETAR)'::text
            WHEN 2 THEN ' (EE)'::text
            ELSE NULL::text
        END AS tb_instalacao,
    -- 🔥 NOVOS CAMPOS PARA WORKFLOW DINÂMICO
    s.what,
    b.tt_type
   FROM aintar_server_dev.tb_document b
     LEFT JOIN aintar_server_dev.ts_entity e ON b.ts_entity = e.pk
     LEFT JOIN aintar_server_dev.ts_entity a ON b.ts_associate = a.pk
     LEFT JOIN aintar_server_dev.tt_doctype t ON b.tt_type = t.pk
     LEFT JOIN aintar_server_dev.tb_document_step s ON b.pk = s.tb_document
     LEFT JOIN aintar_server_dev.tb_instalacao i ON b.tb_instalacao = i.pk
  WHERE (b.tt_type = ANY (ARRAY[2, 40, 41])) AND s.ord = 0 AND (s.what = ANY (ARRAY[13, 19]))
  ORDER BY b.submission;

-- ============================================================================
-- FIM DA MIGRAÇÃO
-- ============================================================================

COMMENT ON VIEW aintar_server_dev.vbr_document_fossa01 IS 'View para operation-legacy steps 10, 17 - Incluindo campos what e tt_type para workflow dinâmico';
COMMENT ON VIEW aintar_server_dev.vbr_document_fossa02 IS 'View para operation-legacy steps 11, 18, 25 - Incluindo campos what e tt_type para workflow dinâmico';
COMMENT ON VIEW aintar_server_dev.vbr_document_fossa03 IS 'View para operation-legacy step 12 - Incluindo campos what e tt_type para workflow dinâmico';
COMMENT ON VIEW aintar_server_dev.vbr_document_fossa04 IS 'View para operation-legacy steps 13, 19 - Incluindo campos what e tt_type para workflow dinâmico';
