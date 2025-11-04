# Template AINTAR - Autorização de Ligação

Template completo baseado no documento oficial da AINTAR para Autorização de Ligação de Águas Residuais.

---

## 📋 HEADER (Cabeçalho)

```html
<table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
  <tr>
    <td style="width: 50%; vertical-align: top;">
      <!-- Logo inserido automaticamente aqui -->
    </td>
    <td style="width: 50%; vertical-align: top; padding-left: 20px;">
      <p style="margin: 0; line-height: 1.5;">
        Ex.<sup>mo(a)</sup> Senhor(a)
      </p>
      <p style="margin: 0; line-height: 1.5; margin-top: 10px;">
        {{ DESTINATARIO_NOME }}
      </p>
      <p style="margin: 0; line-height: 1.5;">
        {{ DESTINATARIO_MORADA }}
      </p>
      <p style="margin: 0; line-height: 1.5;">
        {{ DESTINATARIO_CODIGO_POSTAL }} {{ DESTINATARIO_LOCALIDADE }}
      </p>
      <p style="margin: 0; line-height: 1.5; margin-top: 15px;">
        Email: {{ DESTINATARIO_EMAIL }}
      </p>
    </td>
  </tr>
</table>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="padding: 5px 0; width: 25%;">
      <b>Sua referência:</b>
    </td>
    <td style="padding: 5px 0; width: 25%;">
      <b>Sua comunicação:</b>
    </td>
    <td style="padding: 5px 0; width: 25%;">
      <b>Nossa Referência:</b>
    </td>
    <td style="padding: 5px 0; width: 25%;">
      <b>Data:</b>
    </td>
  </tr>
  <tr>
    <td style="padding: 5px 0;">
      {{ SUA_REFERENCIA }}
    </td>
    <td style="padding: 5px 0;">
      {{ SUA_COMUNICACAO }}
    </td>
    <td style="padding: 5px 0;">
      Pedido AINTAR nº<br/>
      {{ NUMERO_PEDIDO }}<br/>
      Datado de {{ DATA_PEDIDO }}
    </td>
    <td style="padding: 5px 0;">
      {{ DATA_EMISSAO }}<br/>
      Ofício nº {{ NUMERO_OFICIO }}
    </td>
  </tr>
</table>

<p style="margin: 20px 0;">
  <b>Assunto: {{ ASSUNTO }}</b>
</p>
```

---

## 📄 BODY (Corpo)

```html
<p style="text-align: justify; margin: 15px 0; line-height: 1.5;">
  Ex.mo(a). Senhor(a),
</p>

<p style="text-align: justify; margin: 15px 0; line-height: 1.5;">
  No seguimento do pedido supra identificado, em nome de <b>{{ NOME_REQUERENTE }}</b>, com o contribuinte
  nº <b>{{ NIF }}</b>, para a morada {{ MORADA_INTERVENCAO }}, Freguesia de {{ FREGUESIA }},
  {{ CODIGO_POSTAL_INTERVENCAO }} {{ LOCALIDADE_INTERVENCAO }}, com vista à execução de saneamento,
  cumpre-nos informar que a intervenção se encontra concluída.
</p>

<p style="text-align: justify; margin: 15px 0; line-height: 1.5;">
  Por conseguinte, uma vez que se encontra autorizada por esta Entidade, deverá V. Exa. diligenciar a ligação
  à caixa de ramal domiciliário.
</p>

<p style="text-align: justify; margin: 15px 0; line-height: 1.5;">
  Mais se informa, que face ao exposto acima, esta Entidade solicitará à concessionária de abastecimento de
  água pública que a morada identificada passe a integrar a tarifa de saneamento, pelo que será cobrada a devida
  taxa na fatura da água.
</p>
```

---

## ✍️ FOOTER (Rodapé)

```html
<p style="margin-top: 40px;">
  Com os melhores cumprimentos,
</p>

<p style="margin-top: 40px; text-align: center;">
  O Presidente da Direção,
</p>

<p style="margin-top: 60px; text-align: center;">
  _________________________________________
</p>

<p style="text-align: center; margin: 5px 0;">
  {{ SIGNATURE_NAME }}
</p>

<table style="width: 100%; border-collapse: collapse; margin-top: 50px; font-size: 9pt;">
  <tr>
    <td style="width: 60%; vertical-align: bottom; color: #666;">
      Associação de Municípios para o<br/>
      Sistema Intermunicipal de Águas Residuais<br/>
      NIPC 516.132.822
    </td>
    <td style="width: 40%; vertical-align: bottom; text-align: right; color: #666;">
      Praça do Município<br/>
      3430-167 Carregal do Sal<br/>
      geral@aintar.pt
    </td>
  </tr>
</table>
```

---

## 🔧 METADADOS (JSON)

```json
{
  "DESTINATARIO_NOME": {
    "type": "text",
    "label": "Nome Destinatário",
    "required": true
  },
  "DESTINATARIO_MORADA": {
    "type": "text",
    "label": "Morada Destinatário",
    "required": true
  },
  "DESTINATARIO_CODIGO_POSTAL": {
    "type": "text",
    "label": "Código Postal Destinatário",
    "required": true
  },
  "DESTINATARIO_LOCALIDADE": {
    "type": "text",
    "label": "Localidade Destinatário",
    "required": true
  },
  "DESTINATARIO_EMAIL": {
    "type": "email",
    "label": "Email Destinatário",
    "required": false
  },
  "SUA_REFERENCIA": {
    "type": "text",
    "label": "Sua Referência",
    "required": false
  },
  "SUA_COMUNICACAO": {
    "type": "text",
    "label": "Sua Comunicação (Data)",
    "required": false
  },
  "NUMERO_PEDIDO": {
    "type": "text",
    "label": "Número Pedido AINTAR",
    "required": true
  },
  "DATA_PEDIDO": {
    "type": "date",
    "label": "Data do Pedido",
    "required": true
  },
  "DATA_EMISSAO": {
    "type": "date",
    "label": "Data Emissão",
    "required": true,
    "default": "{{ TODAY }}"
  },
  "NUMERO_OFICIO": {
    "type": "text",
    "label": "Número Ofício",
    "required": true,
    "default": "{{ AUTO }}"
  },
  "ASSUNTO": {
    "type": "text",
    "label": "Assunto",
    "required": true,
    "default": "Autorização de Ligação"
  },
  "NOME_REQUERENTE": {
    "type": "text",
    "label": "Nome Requerente",
    "required": true
  },
  "NIF": {
    "type": "text",
    "label": "NIF Requerente",
    "required": true
  },
  "MORADA_INTERVENCAO": {
    "type": "text",
    "label": "Morada Intervenção",
    "required": true
  },
  "FREGUESIA": {
    "type": "text",
    "label": "Freguesia",
    "required": true
  },
  "CODIGO_POSTAL_INTERVENCAO": {
    "type": "text",
    "label": "Código Postal Intervenção",
    "required": true
  },
  "LOCALIDADE_INTERVENCAO": {
    "type": "text",
    "label": "Localidade Intervenção",
    "required": true
  },
  "SIGNATURE_NAME": {
    "type": "text",
    "label": "Nome Assinante",
    "required": true,
    "default": "Paulo Jorge Catalino de Almeida Ferraz"
  },
  "SIGNATURE_TITLE": {
    "type": "text",
    "label": "Cargo Assinante",
    "required": false
  }
}
```

---

## 📝 NOTAS IMPORTANTES

### Estrutura do Documento

1. **HEADER (50/50)**:
   - Metade esquerda: Logo AINTAR (inserido automaticamente)
   - Metade direita: Destinatário com email

2. **Tabela de Referências**:
   - 4 colunas: Sua ref. | Sua comunicação | Nossa ref. | Data
   - Nossa ref. tem 3 linhas: Pedido AINTAR nº / Número / Datado de

3. **Assunto**:
   - Linha em negrito antes do corpo

4. **Corpo**:
   - Parágrafos justificados
   - Line-height: 1.5
   - Margin: 15px 0

5. **Footer**:
   - Cumprimentos
   - Cargo centralizado
   - Linha de assinatura
   - Nome centralizado
   - Rodapé em 2 colunas (60% esquerda / 40% direita)

### Variáveis Automáticas

- `{{ DATA_EMISSAO }}` - Preenchida automaticamente com a data atual
- `{{ NUMERO_OFICIO }}` - Gerado automaticamente pelo sistema (ex: 2024.S.OFI.000012)

### Logo

O logo é inserido automaticamente na metade esquerda do cabeçalho. Não é necessário código HTML para o logo no template.
