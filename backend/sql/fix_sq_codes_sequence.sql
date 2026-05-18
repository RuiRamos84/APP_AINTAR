-- Fix: sq_codes sequence out of sync (UniqueViolation on tb_document_step_pk)
-- Run once on the affected database (dev and/or prod if needed).
-- Safe to re-run — setval only advances, never goes below current last_value.

DO $$
DECLARE
    v_max bigint;
    v_cur bigint;
BEGIN
    -- Find the true max PK across all tables that use fs_nextcode() / sq_codes
    SELECT GREATEST(
        COALESCE((SELECT MAX(pk) FROM tb_document),            0),
        COALESCE((SELECT MAX(pk) FROM tb_document_step),       0),
        COALESCE((SELECT MAX(pk) FROM tb_document_file),       0),
        COALESCE((SELECT MAX(pk) FROM tb_codes),               0),
        COALESCE((SELECT MAX(pk) FROM tb_instalacao_volume),   0),
        COALESCE((SELECT MAX(pk) FROM tb_notification),        0),
        COALESCE((SELECT MAX(pk) FROM tb_equipamento),         0),
        COALESCE((SELECT MAX(pk) FROM tb_obra),                0),
        COALESCE((SELECT MAX(pk) FROM tb_letter),              0),
        (SELECT last_value FROM sq_codes)
    ) INTO v_max;

    v_cur := (SELECT last_value FROM sq_codes);

    RAISE NOTICE 'sq_codes current last_value: %, true max across tables: %', v_cur, v_max;

    IF v_max > v_cur THEN
        PERFORM setval('sq_codes', v_max + 50);
        RAISE NOTICE 'Sequence advanced to %', v_max + 50;
    ELSE
        RAISE NOTICE 'Sequence already ahead of data — no change needed.';
    END IF;
END;
$$;
