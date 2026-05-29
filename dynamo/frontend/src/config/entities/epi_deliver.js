export default {
  key: 'epi_deliver', label: 'Entrega de EPI', labelPlural: 'Entregas de EPI', icon: 'PackageCheck',
  db: { readView: 'vbl_epi_deliver', writeView: 'tb_epi_deliver', pkField: 'pk' },
  permissions: { view: 'operation.access', edit: 'operation.manage' },
  fields: [
    { key: 'pk',         label: 'ID',           type: 'id' },
    { key: 'tb_epi',     label: 'EPI',          type: 'text',     readonly: true },
    { key: 'tt_epiwhat', label: 'Artigo',        type: 'text',     readonly: true },
    { key: 'ts_client',  label: 'Colaborador',   type: 'text',     readonly: true },
    { key: 'data',       label: 'Data Entrega',  type: 'date',     required: true },
    { key: 'quantity',   label: 'Quantidade',    type: 'number' },
    { key: 'dim',        label: 'Tamanho',       type: 'text' },
    { key: 'returned',   label: 'Devolvido em',  type: 'date' },
    { key: 'memo',       label: 'Observações',   type: 'textarea' },
  ],
  listView: { columns: ['ts_client', 'tb_epi', 'tt_epiwhat', 'data', 'quantity', 'returned'], defaultSort: { field: 'data', dir: 'desc' }, searchable: true },
  formView: { sections: [
    { title: 'Entrega', fields: ['tb_epi', 'tt_epiwhat', 'ts_client', 'data', 'quantity', 'dim', 'returned'], cols: 2 },
    { title: 'Notas',   fields: ['memo'],                                                                      cols: 1 },
  ]},
  custom: null,
}
