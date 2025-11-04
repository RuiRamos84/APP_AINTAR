-- Corrigir função fbf_letter_template - adicionar RETURN no UPDATE
-- IMPORTANTE: Atualizar no schema aintar_server_dev (usado em desenvolvimento)
CREATE OR REPLACE FUNCTION aintar_server_dev.fbf_letter_template(
    pop integer,
    pnpk integer,
    pnts_lettertype integer,
    pnname text,
    pnbody text,
    pnheader_template text,
    pnfooter_template text,
    pnversion double precision,
    pnactive integer,
    pnmetadata jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
begin
    -- INSERT ZONE
    if (pop = 0) then
        insert into aintar_server_dev.tb_letter_template (pk, ts_lettertype, name, body, header_template, footer_template, version, active, metadata, hist_client, hist_time)
        values (pnpk, pnts_lettertype, pnname, pnbody, pnheader_template, pnfooter_template, pnversion, pnactive, pnmetadata, fs_client(), current_timestamp);

        return pnpk;
    end if;

    -- UPDATE ZONE
    if (pop = 1) then
        update aintar_server_dev.tb_letter_template set
            ts_lettertype = pnts_lettertype,
            name = pnname,
            body = pnbody,
            header_template = pnheader_template,
            footer_template = pnfooter_template,
            version = pnversion,
            active = pnactive,
            metadata = pnmetadata,
            hist_client = fs_client(),
            hist_time = current_timestamp
        where pk = pnpk;

        return pnpk;  -- ADICIONADO: retornar pk após UPDATE
    end if;

    -- DELETE ZONE
    if (pop = 2) then
        perform fs_errors(8, 'fbf_letter_template');
        return pnpk;  -- ADICIONADO: retornar pk após DELETE (caso seja implementado)
    end if;

    -- Fallback: se nenhuma operação foi executada
    return NULL;
end;
$function$;
