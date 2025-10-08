# 📄 Templates de Ofícios

## Sistema Atual (Ativo)

**Geração via ReportLab (Python PDF)**
- ✅ Totalmente funcional
- ✅ Controle total sobre layout e formatação
- ✅ Performance otimizada
- ✅ Suporta assinatura digital

**Localização:** Código em `backend/app/services/file_service.py`

---

## Templates Depreciados

Os seguintes templates foram descontinuados:

### Arquivos Movidos (Prefixo `_DEPRECATED_`):
- `_DEPRECATED_Oficio.html` - Template HTML (não utilizado)
- `_DEPRECATED_OficioLivre.html` - Template HTML (não utilizado)
- `_DEPRECATED_Oficio.docx` - Template DOCX (legado)
- `_DEPRECATED_OficioLivre.docx` - Template DOCX (legado)

**Motivo:** Sistema migrado para ReportLab para melhor controle e funcionalidades avançadas.

**Data da Mudança:** 2025-01-06

---

## Estrutura de Geração

```python
BaseLetterTemplate (ReportLab)
    ↓
LetterDocument (Conteúdo)
    ↓
FileService.generate_letter()
    ↓
PDF Final
```

---

**NOTA:** Não apagar os ficheiros depreciados por enquanto.
Manter como referência por 3 meses, depois remover definitivamente.
