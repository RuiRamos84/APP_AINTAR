-- Fix fbf_document function to use base table instead of view
-- Production only - view vbf_document_step doesn't have INSTEAD OF INSERT trigger

CREATE OR REPLACE FUNCTION aintar_server.fbf_document(
    pop integer,
    pnpk integer,
    pnts_entity integer,
    pntt_type integer,
    pnts_associate integer,
    pntb_representative integer,
    pnaddress text,
    pnpostal text,
    pndoor text,
    pnfloor text,
    pnnut1 text,
    pnnut2 text,
    pnnut3 text,
    pnnut4 text,
    pnmemo text,
    pnglat numeric,
    pnglong numeric,
    pnnotification integer,
    pntt_presentation integer,
    pntb_instalacao integer
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
 res text;
 typ integer;
 pnwho integer;
begin
  -- RULES VALIDATION ZONE
  select intern into typ from tt_doctype where pk = pntt_type;

  -- utilizadores internos podem não colocar entidade, sendo automaticamente substituida pela AINTAR
  if (typ = 1 and fs_profile() = 1 and pnts_entity is null) then pnts_entity := fs_entityaintar(); end if;

  -- NOT NULL ZONE
  res := fbv_document(pnts_entity, pntt_type, pnts_associate);
  if (res != '') then select fs_errors (7, 'document', res); end if;

  -- RULES VALIDATION ZONE
  select intern into typ from tt_doctype where pk = pntt_type;

  -- utilizadores externos (clientes e municipios) não podem introduzir pedidos internos
  if (typ = 1 and fs_profile() not in (0,1)) then select fs_errors (12, 'document', res); end if;

  -- forcar que perfil cliente apenas insere pedidos para a sua entidade
  if (fs_profile() = 3 and pnts_entity != fs_entity()) then select fs_errors (13, 'document', res); end if;

  -- pedidos internos ficam com associate = AINTAR
  if (typ = 1 and pnts_associate is null) then pnts_associate := 1; end if;

 -- INSERT ZONE
 if (pop = 0) then
  insert into tb_document (pk,ts_entity,tt_type,type_countyear,type_countall,regnumber,submission,memo,ts_associate,tb_representative,address,postal,door,floor,nut1,nut2,nut3,nut4,glat,glong,notification,tt_presentation,tb_instalacao,intern,hist_client,hist_time)
  values (pnpk,pnts_entity,pntt_type,fbo_document_typecountyear(pnts_entity,pntt_type)+1,fbo_document_typecountall(pnts_entity,pntt_type)+1,fs_regnumber(pntt_type),current_timestamp,fs_format_text(pnmemo),pnts_associate, pntb_representative,pnaddress,pnpostal,pndoor,pnfloor,pnnut1,pnnut2,pnnut3,pnnut4,pnglat,pnglong,pnnotification,pntt_presentation,pntb_instalacao,typ,fs_client(),current_timestamp);

  -- inserção do step de arranque
  -- CORRIGIDO: usar tb_document_step (tabela base) em vez de vbf_document_step (view)
  select responsable into pnwho from tt_doctype where pk = pntt_type;
  insert into tb_document_step (pk, tb_document, what, who, hist_client, hist_time)
  values (nextval('sq_codes'), pnpk, 1, pnwho, fs_client(), current_timestamp);

  -- inserção dos param
  call fbf_document_param$init (pnpk, pntt_type);

  return pnpk;
 end if;

 -- UPDATE ZONE
 -- Não há edição de documentos submetidos; se for necessário anula-se e cria-se um novo. Apenas se pode editar o campo notification
 if (pop = 1) then
  update tb_document set notification = pnnotification where pk = pnpk;
  return pnpk;
 end if;

 -- DELETE ZONE
 -- Não há remoção de documentos submetidos; se for necessário anula-se.

 if (pop = 2) then select fs_errors (8, 'document'); end if;
end;
$function$;

-- Comentário explicativo
COMMENT ON FUNCTION aintar_server.fbf_document IS 'Função para criar/editar documentos. Corrigida para usar tb_document_step (tabela base) em vez de vbf_document_step (view sem trigger INSTEAD OF INSERT)';
