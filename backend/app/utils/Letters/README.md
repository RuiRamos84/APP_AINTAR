# 📄 Templates de Ofícios

## Sistema Atual (Ativo)

**Emissão via `emission_routes.py` + `app/services/emissions/`**
- `generator_service.py`, `core_service.py`, `html_generator_service.py`, `numbering_service.py`
- Sistema de mapeamento documento → emissão (substituiu o antigo `letter_service.py`)

---

## Templates Depreciados

Os seguintes ficheiros são histórico, sem uso ativo:

- `_DEPRECATED_Oficio.html`, `_DEPRECATED_OficioLivre.html` — templates HTML (não utilizados)
- `_DEPRECATED_Oficio.docx`, `_DEPRECATED_OficioLivre.docx` — templates DOCX (legado, pré-ReportLab)

**Nota:** `file_service.py` e `letter_service.py` (mencionados em versões anteriores deste README) foram removidos do projeto — confirmados como código morto, sem imports ativos (ver `REVISAO_PROJETO_2026-06.md`).

---

## Estrutura de Geração Atual

```
documents/core.py (criação do pedido)
    ↓
emission_routes.py
    ↓
services/emissions/core_service.py + generator_service.py
    ↓
PDF Final (app/generated_pdfs/)
```
