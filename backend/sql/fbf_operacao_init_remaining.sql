-- DROP PROCEDURE IF EXISTS "fbf_operacao$init_remaining"(int4);

CREATE OR REPLACE PROCEDURE "fbf_operacao$init_remaining"(
    IN pntt_operacaomodo integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
DECLARE
    v_data          date;
    v_fim_mes       date;
    v_semana        integer;
    v_dia_semana    integer;
    v_operacaodia_id integer;
    v_exists        integer;
    i1 integer; i2 integer; i3 integer; i4 integer; i5 integer;
    oper_type           integer;
    oper_photo          integer;
    oper_refobj         text;
    oper_refpk          text;
    oper_refvalue       text;
    oper_updatedelay    integer;
    oper_analparam      integer;
    oper_analponto      integer;
    oper_analforma      integer;
    newpk               integer;
BEGIN
    -- Começa hoje (dias restantes do mês corrente, incluindo hoje)
    v_data    := current_date;
    v_fim_mes := (date_trunc('month', current_date) + interval '1 month - 1 day')::date;

    IF v_data > v_fim_mes THEN
        RAISE EXCEPTION 'fbf_operacao$init_remaining - sem dias restantes no mês corrente';
    END IF;

    WHILE v_data <= v_fim_mes LOOP
        v_semana     := ceil(extract(day from v_data) / 7.0);
        IF v_semana > 4 THEN v_semana := 1; END IF;

        v_dia_semana := extract(dow from v_data);

        SELECT pk INTO v_operacaodia_id
        FROM tt_operacaodia
        WHERE week = v_semana AND dayn = v_dia_semana;

        FOR i1, i2, i3, i4, i5 IN
            SELECT tt_operacaomodo, tb_instalacao, ts_operador1, ts_operador2, tt_operacaoaccao
            FROM tb_operacaometa
            WHERE tt_operacaodia   = v_operacaodia_id
              AND tt_operacaomodo  = pntt_operacaomodo
        LOOP
            -- Não inserir se já existe tarefa para este dia+instalação+ação+modo
            SELECT COUNT(*) INTO v_exists
            FROM tb_operacao
            WHERE data             = v_data
              AND tb_instalacao    = i2
              AND tt_operacaoaccao = i5
              AND tt_operacaomodo  = i1;

            IF v_exists = 0 THEN
                SELECT type, photo, refobj, refpk, refvalue, updatedelay,
                       tt_analiseparam, tt_analiseponto, tt_analiseforma
                INTO   oper_type, oper_photo, oper_refobj, oper_refpk, oper_refvalue,
                       oper_updatedelay, oper_analparam, oper_analponto, oper_analforma
                FROM tt_operacaoaccao WHERE pk = i5;

                newpk := nextval('sq_codes');

                INSERT INTO tb_operacao (
                    pk, data, photo, tt_operacaomodo, tb_instalacao,
                    ts_operador1, ts_operador2, tt_operacaoaccao,
                    tt_operacaoaccao_type, tt_operacaoaccao_refobj, tt_operacaoaccao_refpk,
                    tt_operacaoaccao_refvalue, tt_operacaoaccao_updatedelay,
                    tt_operacaoaccao_analiseparam, tt_operacaoaccao_analiseponto,
                    tt_operacaoaccao_analiseforma
                )
                VALUES (
                    newpk, v_data, oper_photo, i1, i2, i3, i4, i5,
                    oper_type, oper_refobj, oper_refpk, oper_refvalue, oper_updatedelay,
                    oper_analparam, oper_analponto, oper_analforma
                );

                IF oper_type = 5 THEN
                    INSERT INTO tb_instalacao_analise (
                        pk, data, tb_instalacao, tt_analiseponto, tt_analiseparam,
                        tt_analiseforma, operador1, operador2, tb_operacao
                    )
                    VALUES (
                        nextval('sq_codes'), v_data, i2, oper_analponto, oper_analparam,
                        oper_analforma, i3, i4, newpk
                    );
                END IF;
            END IF;
        END LOOP;

        v_data := v_data + 1;
    END LOOP;
END;
$procedure$;
