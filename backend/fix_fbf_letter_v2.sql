-- Corrigir função fbf_letter - REMOVER linha problemática emission_date do UPDATE
-- O emission_date não deve mudar após criação, e o parâmetro não existe

CREATE OR REPLACE FUNCTION aintar_server_dev.fbf_letter(
    pop integer,
    pnpk integer,
    pntb_document integer,
    pntb_letter_template integer,
    pnts_letterstatus integer,
    pnsubject text,
    pnrecipient_data jsonb,
    pncustom_data jsonb,
    pnfilename text,
    pnsign_client integer,
    pnsign_time timestamp without time zone,
    pnsign_data jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
declare
 t integer;
begin
 -- INSERT ZONE
 if (pop = 0) then
  select ts_lettertype into t from tb_letter_template where pk = pntb_letter_template;

  insert into tb_letter (pk, tb_document, tb_letter_template, ts_letterstatus, emission_number, emission_date, subject, recipient_data, custom_data, filename, sign_client, sign_time, sign_data, hist_client, hist_time)
  values (pnpk, pntb_document, pntb_letter_template, pnts_letterstatus, fs_letternumber (t), current_timestamp, pnsubject, pnrecipient_data, pncustom_data, pnfilename, pnsign_client, pnsign_time, pnsign_data, fs_client(), current_timestamp);

  return pnpk;
 end if;

 -- UPDATE ZONE
 if (pop = 1) then
  update tb_letter set
  ts_letterstatus = pnts_letterstatus,
  -- emission_date = pnemission_date,  -- REMOVIDO: parâmetro não existe e emission_date não deve mudar após criação
  subject = pnsubject,
  recipient_data = pnrecipient_data,
  custom_data = pncustom_data,
  filename = pnfilename,
  sign_client = pnsign_client,
  sign_time = pnsign_time,
  sign_data = pnsign_data
  where pk = pnpk;

  return pnpk;  -- Retornar pk após update
 end if;

 -- DELETE ZONE
 if (pop = 2) then
  delete from tb_letter where pk = pnpk;
  return pnpk;  -- Retornar pk após delete
 end if;

 return null;  -- Fallback
end; $function$;
