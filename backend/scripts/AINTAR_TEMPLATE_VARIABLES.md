# Template de Ofício AINTAR - Documentação de Variáveis

## Estrutura do Documento

O ofício AINTAR é composto por 3 partes:

1. **HEADER** - Logo e informações do destinatário
2. **BODY** - Conteúdo principal do ofício
3. **FOOTER** - Dados da entidade AINTAR

---

## Variáveis do HEADER

### Destinatário
| Variável | Descrição | Obrigatório | Exemplo |
|----------|-----------|-------------|---------|
| `{{ DESTINATARIO_NOME }}` | Nome do destinatário | Sim | Rui Ramos |
| `{{ DESTINATARIO_MORADA }}` | Morada completa | Sim | Avenida Doutor António Tenreiro da Cruz, 40 |
| `{{ DESTINATARIO_CODIGO_POSTAL }}` | Código postal | Sim | 3460-522 |
| `{{ DESTINATARIO_LOCALIDADE }}` | Localidade | Sim | Tondela |

### Referências e Datas
| Variável | Descrição | Obrigatório | Exemplo |
|----------|-----------|-------------|---------|
| `{{ SUA_REFERENCIA }}` | Referência do destinatário | Não | REF-2024-001 |
| `{{ NOSSA_REFERENCIA }}` | Referência interna AINTAR | Não | N/A |
| `{{ DATA }}` | Data de emissão do ofício | Sim | 18/10/2024 |
| `{{ DATA_COMUNICACAO }}` | Data da comunicação recebida | Não | 15/10/2024 |
| `{{ NUMERO_OFICIO }}` | Número do ofício | Sim | OF-2024-0001 |

### Assunto
| Variável | Descrição | Obrigatório | Exemplo |
|----------|-----------|-------------|---------|
| `{{ ASSUNTO }}` | Assunto do ofício | Sim | Autorização de Ligação |

---

## Variáveis do BODY

### Template: Autorização de Ligação

| Variável | Descrição | Obrigatório | Exemplo |
|----------|-----------|-------------|---------|
| `{{ NOME_REQUERENTE }}` | Nome do requerente | Sim | Rui Ramos |
| `{{ NIF }}` | NIF do requerente | Sim | 232156980 |
| `{{ MORADA }}` | Morada da intervenção | Sim | Avenida Doutor António Tenreiro da Cruz, 40 |
| `{{ FREGUESIA }}` | Freguesia | Sim | União das freguesias de Tondela e Nandufe |
| `{{ CODIGO_POSTAL }}` | Código postal | Sim | 3460-522 |
| `{{ LOCALIDADE }}` | Localidade | Sim | Tondela |
| `{{ NOME_ASSINANTE }}` | Nome de quem assina | Sim | Paulo Jorge Catalino de Almeida Ferraz |

### Template: Genérico

| Variável | Descrição | Obrigatório | Exemplo |
|----------|-----------|-------------|---------|
| `{{ CORPO_TEXTO }}` | Texto principal livre | Sim | (texto completo do ofício) |
| `{{ ASSINATURA_CARGO }}` | Cargo de quem assina | Sim | O Presidente da Direção |
| `{{ NOME_ASSINANTE }}` | Nome de quem assina | Sim | Paulo Jorge Catalino de Almeida Ferraz |

---

## FOOTER (Fixo)

O footer é fixo e contém:

```
Associação de Municípios para o                                      Praça do Município
Sistema Intermunicipal de Águas Residuais                                 3430-167 Carregal do Sal
NIPC 516.132.822                                                          geral@aintar.pt

                                                                          1 de 1
                                                                          AINTAR_MIN_04a_v2
```

---

## Exemplo de Uso

### JSON para criar ofício de Autorização de Ligação:

```json
{
  "template_pk": 123,
  "variables": {
    "DESTINATARIO_NOME": "Rui Ramos",
    "DESTINATARIO_MORADA": "Avenida Doutor António Tenreiro da Cruz, 40",
    "DESTINATARIO_CODIGO_POSTAL": "3460-522",
    "DESTINATARIO_LOCALIDADE": "Tondela",
    "SUA_REFERENCIA": "",
    "NOSSA_REFERENCIA": "N/A",
    "DATA": "18/10/2024",
    "DATA_COMUNICACAO": "18/10/2024",
    "NUMERO_OFICIO": "OF-2024-0001",
    "ASSUNTO": "Autorização de Ligação",
    "NOME_REQUERENTE": "Rui Ramos",
    "NIF": "232156980",
    "MORADA": "Avenida Doutor António Tenreiro da Cruz, 40",
    "FREGUESIA": "União das freguesias de Tondela e Nandufe",
    "CODIGO_POSTAL": "3460-522",
    "LOCALIDADE": "Tondela",
    "NOME_ASSINANTE": "Paulo Jorge Catalino de Almeida Ferraz"
  }
}
```

---

## Observações

1. **Logo AINTAR**: No header, `[LOGO AINTAR]` será substituído pela imagem real no sistema de geração de PDFs
2. **Formatação**: O espaçamento entre campos é preservado para manter o layout profissional
3. **Assinatura**: A linha tracejada `_________________________________________` indica o local da assinatura
4. **Paginação**: "1 de 1" será dinâmico em ofícios com múltiplas páginas
5. **Template Code**: `AINTAR_MIN_04a_v2` é a versão do template usada

---

## Templates Criados

1. **Ofício AINTAR - Autorização de Ligação**
   - Específico para autorizações de ligação ao saneamento
   - Texto pré-definido com variáveis específicas

2. **Ofício AINTAR - Modelo Genérico**
   - Permite texto livre no corpo
   - Mantém header e footer padrão AINTAR
   - Flexível para qualquer tipo de comunicação
