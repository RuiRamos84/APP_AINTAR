-- Tabela de memória para mapeamento "Local de Colheita" (texto do PDF do boletim
-- laboratorial) -> instalação (tb_instalacao). Usada pela funcionalidade de
-- importação de boletins em PDF: quando o utilizador confirma/corrige a
-- instalação sugerida, o mapeamento é guardado aqui para que o mesmo texto de
-- "Local de Colheita" seja automaticamente associado nos boletins seguintes.

CREATE TABLE IF NOT EXISTS tb_pdf_local_colheita (
    pk              SERIAL PRIMARY KEY,
    local_colheita  TEXT NOT NULL UNIQUE,
    tb_instalacao   INTEGER NOT NULL REFERENCES tb_instalacao (pk),
    ts_updated      TIMESTAMP NOT NULL DEFAULT now()
);

-- View de leitura (padrão vbl_ do projeto — pdf_extraction_service.py nunca lê
-- diretamente de tb_pdf_local_colheita).
CREATE OR REPLACE VIEW vbl_pdf_local_colheita AS
SELECT pk, local_colheita, tb_instalacao, ts_updated
FROM tb_pdf_local_colheita;

-- Função de escrita (padrão fbf_ do projeto — pop=0 é o único suportado: upsert
-- por local_colheita, que é UNIQUE).
CREATE OR REPLACE FUNCTION fbf_pdf_local_colheita(
    pop             integer,
    pnlocal_colheita text,
    pntb_instalacao  integer
) RETURNS integer AS $$
DECLARE
    result_pk integer;
BEGIN
    IF pop = 0 THEN
        INSERT INTO tb_pdf_local_colheita (local_colheita, tb_instalacao, ts_updated)
        VALUES (pnlocal_colheita, pntb_instalacao, now())
        ON CONFLICT (local_colheita)
        DO UPDATE SET tb_instalacao = EXCLUDED.tb_instalacao, ts_updated = now()
        RETURNING pk INTO result_pk;
    END IF;
    RETURN result_pk;
END;
$$ LANGUAGE plpgsql;
