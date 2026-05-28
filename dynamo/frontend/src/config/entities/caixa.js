export default {
  key:         'caixa',
  label:       'Movimento de Caixa',
  labelPlural: 'Movimentos de Caixa',
  icon:        'Wallet',

  db: { readView: 'vbl_caixa', writeView: 'vbf_caixa', pkField: 'pk' },

  permissions: { view: 'operation.access', edit: 'operation.manage' },

  fields: [
    { key: 'pk',                label: 'ID',              type: 'id' },
    { key: 'data',              label: 'Data',             type: 'date',   required: true },
    { key: 'tt_caixamovimento', label: 'Tipo',             type: 'text',   readonly: true },
    { key: 'valor',             label: 'Valor (€)',        type: 'number', required: true },
    { key: 'saldo',             label: 'Saldo',            type: 'number', readonly: true },
    { key: 'tb_document',       label: 'Documento',        type: 'text',   readonly: true },
    { key: 'ordempagamento',    label: 'Ordem Pagamento',  type: 'text' },
    { key: 'ts_client1',        label: 'Cliente',          type: 'text',   readonly: true },
  ],

  listView: {
    columns:     ['data', 'tt_caixamovimento', 'valor', 'saldo', 'ts_client1'],
    defaultSort: { field: 'data', dir: 'desc' },
    searchable:  true,
  },

  formView: {
    sections: [
      { title: 'Movimento', fields: ['data', 'tt_caixamovimento', 'valor', 'ordempagamento'], cols: 2 },
    ],
  },

  custom: null,
}
