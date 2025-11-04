# Exemplos de Templates para Emissões

## Variáveis Jinja2 Disponíveis

### Destinatário
- `{{ NOME }}` - Nome do Destinatário
- `{{ MORADA }}` - Morada
- `{{ PORTA }}` - Porta/Número
- `{{ CODIGO_POSTAL }}` - Código Postal
- `{{ LOCALIDADE }}` - Localidade
- `{{ NIF }}` - NIF (opcional)

### Pedido/Documento
- `{{ NUMERO_PEDIDO }}` - Número do Pedido
- `{{ DATA_PEDIDO }}` - Data do Pedido
- `{{ MORADA_PEDIDO }}` - Morada do Pedido
- `{{ PORTA_PEDIDO }}` - Porta do Pedido
- `{{ FREGUESIA_PEDIDO }}` - Freguesia do Pedido
- `{{ POSTAL_CODE_PEDIDO }}` - Código Postal do Pedido
- `{{ LOCALIDADE_PEDIDO }}` - Localidade do Pedido

### Sistema/Ofício
- `{{ DATA }}` - Data Atual
- `{{ NUMERO_OFICIO }}` - Número do Ofício
- `{{ ASSUNTO }}` - Assunto do Ofício
- `{{ VS_M }}` - Versão do Modelo

### Assinatura
- `{{ SIGNATURE_TITLE }}` - Título do Assinante
- `{{ SIGNATURE_NAME }}` - Nome do Assinante

---

## Exemplo 1: Autorização de Ligação de Águas Residuais

### HEADER (Cabeçalho)
```html
<div class="references">
  <table>
    <tr>
      <td class="ref-label">V/ Ref.:</td>
      <td>{{ NUMERO_PEDIDO }}</td>
      <td class="ref-label">N/ Ref.:</td>
      <td>{{ NUMERO_OFICIO }}</td>
    </tr>
    <tr>
      <td class="ref-label">Assunto:</td>
      <td colspan="3">Autorização de Ligação de Águas Residuais</td>
    </tr>
  </table>
</div>

<table style="width: 100%; margin-bottom: 20px;">
  <tr>
    <td style="width: 60%; vertical-align: top;">
      <p style="margin: 0;">{{ DATA }}</p>
    </td>
    <td style="width: 40%; vertical-align: top;">
      <p style="margin: 0; font-weight: bold;">{{ NOME }}</p>
      <p style="margin: 0;">{{ MORADA }}, {{ PORTA }}</p>
      <p style="margin: 0;">{{ CODIGO_POSTAL }} {{ LOCALIDADE }}</p>
    </td>
  </tr>
</table>
```

### BODY (Corpo)
```html
<p>Exmo(a) Senhor(a),</p>

<p>Em resposta ao vosso pedido de autorização para ligação de águas residuais, referente à morada <strong>{{ MORADA_PEDIDO }}, {{ PORTA_PEDIDO }}, {{ FREGUESIA_PEDIDO }}, {{ POSTAL_CODE_PEDIDO }} {{ LOCALIDADE_PEDIDO }}</strong>, registado nesta Entidade sob o n.º <strong>{{ NUMERO_PEDIDO }}</strong>, vem esta Entidade, ao abrigo do estipulado no artigo 7.º, n.º 1 do Decreto-Lei 194/2009, de 20 de Agosto, que aprova o Regime Jurídico dos Serviços Municipais de Abastecimento Público de Água, de Saneamento de Águas Residuais e de Gestão de Resíduos Urbanos, comunicar que <strong>AUTORIZA</strong> essa ligação.</p>

<p>Esta autorização é válida pelo período de <strong>6 meses</strong> a contar da data de emissão do presente ofício, sendo necessário proceder à ligação neste prazo.</p>

<p>Para qualquer esclarecimento adicional, não hesite em contactar os nossos serviços.</p>
```

### FOOTER (Rodapé)
```html
<div class="signature-block">
  <table style="width: 100%;">
    <tr>
      <td style="text-align: center;">
        <div class="signature-line"></div>
        <p class="signature-name">{{ SIGNATURE_NAME }}</p>
        <p class="signature-title">{{ SIGNATURE_TITLE }}</p>
      </td>
    </tr>
  </table>
</div>

<div class="footer-info">
  <p>Documento gerado eletronicamente</p>
  <p>{{ NUMERO_OFICIO }} - {{ DATA }}</p>
</div>
```

---

## Exemplo 2: Notificação Simples

### HEADER
```html
<div class="references">
  <table>
    <tr>
      <td class="ref-label">N/ Ref.:</td>
      <td>{{ NUMERO_OFICIO }}</td>
      <td class="ref-label">Data:</td>
      <td>{{ DATA }}</td>
    </tr>
  </table>
</div>

<table style="width: 100%; margin-top: 15px;">
  <tr>
    <td style="width: 100%;">
      <p style="margin: 0; font-weight: bold;">{{ NOME }}</p>
      <p style="margin: 0;">{{ MORADA }}, {{ PORTA }}</p>
      <p style="margin: 0;">{{ CODIGO_POSTAL }} {{ LOCALIDADE }}</p>
      {% if NIF %}<p style="margin: 0;">NIF: {{ NIF }}</p>{% endif %}
    </td>
  </tr>
</table>
```

### BODY
```html
<p>Exmo(a) Senhor(a),</p>

<p>Vimos por este meio notificá-lo(a) relativamente ao processo n.º <strong>{{ NUMERO_PEDIDO }}</strong>, de <strong>{{ DATA_PEDIDO }}</strong>.</p>

<p>Solicitamos a V. Ex.ª que proceda à regularização da situação no prazo de 30 dias úteis, a contar da data de receção do presente ofício.</p>

<p>Caso necessite de esclarecimentos adicionais, os nossos serviços encontram-se ao dispor.</p>
```

### FOOTER
```html
<div class="signature-block">
  <table style="width: 100%;">
    <tr>
      <td style="text-align: center;">
        <div class="signature-line"></div>
        <p class="signature-name">{{ SIGNATURE_NAME }}</p>
        <p class="signature-title">{{ SIGNATURE_TITLE }}</p>
      </td>
    </tr>
  </table>
</div>
```

---

## Exemplo 3: Usando Condicionais Jinja2

### BODY com lógica condicional
```html
<p>Exmo(a) Senhor(a),</p>

<p>Em referência ao vosso pedido n.º <strong>{{ NUMERO_PEDIDO }}</strong>:</p>

{% if NIF %}
<p>Para o contribuinte com NIF <strong>{{ NIF }}</strong>, informamos que:</p>
{% endif %}

<p>A morada indicada <strong>{{ MORADA_PEDIDO }}, {{ PORTA_PEDIDO }}</strong>, em <strong>{{ FREGUESIA_PEDIDO }}</strong>, foi devidamente registada nos nossos sistemas.</p>

{% if ASSUNTO %}
<p>Relativamente ao assunto "<em>{{ ASSUNTO }}</em>", informamos que o processo se encontra em análise.</p>
{% endif %}

<p>Qualquer alteração será comunicada oportunamente.</p>
```

---

## Dicas de Formatação

### Tabelas HTML
```html
<!-- Tabela simples -->
<table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
  <tr>
    <td style="border: 1px solid #000; padding: 5px 8px;">Célula 1</td>
    <td style="border: 1px solid #000; padding: 5px 8px;">Célula 2</td>
  </tr>
</table>

<!-- Tabela com cabeçalho -->
<table style="width: 100%; border-collapse: collapse;">
  <tr>
    <th style="border: 1px solid #000; padding: 5px 8px; background-color: #f0f0f0; font-weight: bold;">Cabeçalho</th>
    <th style="border: 1px solid #000; padding: 5px 8px; background-color: #f0f0f0; font-weight: bold;">Valor</th>
  </tr>
  <tr>
    <td style="border: 1px solid #000; padding: 5px 8px;">{{ NOME }}</td>
    <td style="border: 1px solid #000; padding: 5px 8px;">{{ MORADA }}</td>
  </tr>
</table>
```

### Texto Formatado
```html
<!-- Negrito -->
<p>Texto <strong>importante</strong> em negrito</p>

<!-- Itálico -->
<p>Texto <em>enfatizado</em> em itálico</p>

<!-- Sublinhado -->
<p>Texto <u>sublinhado</u></p>

<!-- Combinado -->
<p>Texto <strong><em>negrito e itálico</em></strong></p>
```

### Listas
```html
<!-- Lista não ordenada -->
<ul>
  <li>Item 1</li>
  <li>Item 2</li>
  <li>Item 3</li>
</ul>

<!-- Lista ordenada -->
<ol>
  <li>Primeiro ponto</li>
  <li>Segundo ponto</li>
  <li>Terceiro ponto</li>
</ol>
```

### Espaçamento
```html
<!-- Parágrafo com espaçamento extra -->
<p style="margin-bottom: 20px;">Parágrafo com mais espaço abaixo</p>

<!-- Quebra de linha -->
<p>Linha 1<br/>Linha 2</p>

<!-- Espaçamento horizontal -->
<hr style="border: 0; border-top: 1px solid #ccc; margin: 20px 0;" />
```

---

## Notas Importantes

1. **Sempre use variáveis Jinja2** entre `{{ }}` para dados dinâmicos
2. **HTML inline** - Use estilos inline quando precisar de formatação específica
3. **Classes CSS** - As classes definidas no CSS global estão disponíveis:
   - `.references` - Para tabelas de referência
   - `.signature-block` - Para blocos de assinatura
   - `.signature-line` - Para linha de assinatura
   - `.footer-info` - Para informações no rodapé
4. **Condicionais** - Use `{% if %}...{% endif %}` para lógica condicional
5. **Texto justificado** - Os parágrafos `<p>` são automaticamente justificados
