# Geração Automática de Metadados

## Funcionalidade Implementada

O sistema agora pode **gerar automaticamente** o JSON de metadados a partir das variáveis Jinja2 encontradas nos templates!

## Como Funciona

### 1. Extração de Variáveis
O sistema analisa os 3 campos do template:
- **Header** (Cabeçalho)
- **Body** (Corpo)
- **Footer** (Rodapé)

E extrai todas as variáveis no formato `{{ VARIAVEL }}`.

### 2. Inferência Inteligente de Tipos

O sistema determina automaticamente o tipo de campo baseado no nome da variável:

| Nome da Variável | Tipo Inferido | Exemplo |
|-----------------|---------------|---------|
| Contém "DATA" ou "DATE" | `date` | DATA, DATA_PEDIDO, DATE |
| Contém "NUMERO", "NIF", "PORTA" | `text` | NUMERO_PEDIDO, NIF, PORTA |
| Contém "OBSERVACOES", "DESCRICAO", "NOTAS" | `textarea` | OBSERVACOES, DESCRICAO |
| Contém "ATIVO", "ACTIVE", "ENABLED" | `checkbox` | ATIVO, ENABLED |
| Outros | `text` | NOME, MORADA, etc. |

### 3. Geração de Labels User-Friendly

O sistema converte automaticamente nomes de variáveis em labels legíveis:

| Variável | Label Gerado |
|----------|--------------|
| `NOME` | Nome |
| `MORADA_PEDIDO` | Morada Pedido |
| `CODIGO_POSTAL` | Codigo Postal |
| `NUMERO_OFICIO` | Numero Oficio |
| `DATA_PEDIDO` | Data Pedido |

### 4. Estrutura JSON Gerada

Para cada variável encontrada, o sistema gera:

```json
{
  "NOME_VARIAVEL": {
    "type": "text",           // Tipo inferido automaticamente
    "label": "Nome Variavel", // Label user-friendly
    "required": false,        // Por padrão não obrigatório
    "default": ""             // Valor padrão vazio
  }
}
```

## Como Usar

### 1. Criar ou Editar Template

Preencha os campos do template com HTML e variáveis Jinja2:

**Exemplo de Body:**
```html
<p>Exmo(a) Senhor(a) {{ NOME }},</p>

<p>Em resposta ao vosso pedido n.º <strong>{{ NUMERO_PEDIDO }}</strong>,
de <strong>{{ DATA_PEDIDO }}</strong>, referente à morada
<strong>{{ MORADA_PEDIDO }}, {{ PORTA_PEDIDO }}</strong>...</p>
```

### 2. Clicar em "Gerar Automaticamente"

No campo **Metadados (JSON)**, existe agora um botão:

```
┌─────────────────────────────────────────────────┐
│ Metadados (JSON)    [Gerar Automaticamente]   │
├─────────────────────────────────────────────────┤
│                                                 │
│  { ... JSON aqui ... }                          │
│                                                 │
└─────────────────────────────────────────────────┘
```

### 3. Resultado

O sistema analisa todos os campos e gera automaticamente:

```json
{
  "NOME": {
    "type": "text",
    "label": "Nome",
    "required": false,
    "default": ""
  },
  "NUMERO_PEDIDO": {
    "type": "text",
    "label": "Numero Pedido",
    "required": false,
    "default": ""
  },
  "DATA_PEDIDO": {
    "type": "date",
    "label": "Data Pedido",
    "required": false,
    "default": ""
  },
  "MORADA_PEDIDO": {
    "type": "text",
    "label": "Morada Pedido",
    "required": false,
    "default": ""
  },
  "PORTA_PEDIDO": {
    "type": "text",
    "label": "Porta Pedido",
    "required": false,
    "default": ""
  }
}
```

### 4. Notificação de Sucesso

O sistema mostra um toast:
```
✓ 5 variável(is) encontrada(s) e metadados gerados!
```

## Edição Manual

Depois de gerar automaticamente, pode editar o JSON manualmente para:

1. **Alterar tipos de campo** - Ex: mudar de `text` para `email`
2. **Marcar campos obrigatórios** - Alterar `required: false` para `true`
3. **Adicionar valores padrão** - Definir `default` com um valor
4. **Modificar labels** - Ajustar o texto do label
5. **Adicionar validações** - Adicionar propriedades extras

**Exemplo de edição manual:**
```json
{
  "NOME": {
    "type": "text",
    "label": "Nome Completo do Destinatário",
    "required": true,           // ← Tornado obrigatório
    "default": "",
    "minLength": 3,             // ← Validação adicionada
    "maxLength": 100
  },
  "DATA_PEDIDO": {
    "type": "date",
    "label": "Data do Pedido",
    "required": true,           // ← Tornado obrigatório
    "default": ""
  }
}
```

## Vantagens

✅ **Economia de Tempo** - Não precisa escrever JSON manualmente
✅ **Menos Erros** - Sistema deteta todas as variáveis automaticamente
✅ **Consistência** - Padrão uniforme para todos os metadados
✅ **Flexibilidade** - Pode editar manualmente após geração
✅ **Inteligente** - Infere tipos de campo baseado no nome

## Casos de Uso

### Template de Autorização de Ligação

**Template com variáveis:**
- Header: `{{ NUMERO_OFICIO }}`, `{{ NUMERO_PEDIDO }}`, `{{ DATA }}`, `{{ NOME }}`, `{{ MORADA }}`
- Body: `{{ MORADA_PEDIDO }}`, `{{ PORTA_PEDIDO }}`, `{{ FREGUESIA_PEDIDO }}`
- Footer: `{{ SIGNATURE_NAME }}`, `{{ SIGNATURE_TITLE }}`

**Resultado:** 10 variáveis extraídas e metadados gerados automaticamente!

### Template de Notificação Simples

**Template com variáveis:**
- Header: `{{ NUMERO_OFICIO }}`, `{{ DATA }}`, `{{ NOME }}`
- Body: `{{ NUMERO_PEDIDO }}`, `{{ DATA_PEDIDO }}`
- Footer: `{{ SIGNATURE_NAME }}`

**Resultado:** 6 variáveis extraídas e metadados gerados automaticamente!

## Notas Importantes

1. **Variáveis duplicadas** - Se a mesma variável aparece em múltiplos locais (header, body, footer), só é incluída uma vez no JSON
2. **Formato Jinja2** - Apenas variáveis no formato `{{ VARIAVEL }}` são reconhecidas
3. **Espaços** - O sistema aceita espaços: `{{ VARIAVEL }}` ou `{{VARIAVEL}}` (ambos funcionam)
4. **Case sensitive** - Variáveis são case-sensitive: `{{ NOME }}` ≠ `{{ nome }}`

## Troubleshooting

### "Nenhuma variável Jinja2 encontrada nos templates"

**Causa:** Não existem variáveis no formato `{{ VARIAVEL }}` em nenhum dos 3 campos.

**Solução:** Adicione variáveis Jinja2 aos templates antes de gerar metadados.

### JSON inválido após edição manual

**Causa:** Erro de sintaxe ao editar o JSON manualmente.

**Solução:**
- Verifique vírgulas, chaves, aspas
- Use um validador JSON online
- Clique novamente em "Gerar Automaticamente" para recomeçar

## Exemplo Completo

Veja [TEMPLATE_EXAMPLES.md](./TEMPLATE_EXAMPLES.md) para exemplos completos de templates com variáveis Jinja2.
