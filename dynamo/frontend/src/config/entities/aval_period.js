export default {
  key: 'aval_period', label: 'Período de Avaliação', labelPlural: 'Períodos de Avaliação', icon: 'CalendarCheck',
  db: { readView: 'vbl_aval_period', writeView: 'tb_aval_period', pkField: 'pk' },
  permissions: { view: 'operation.access', edit: 'operation.manage' },
  fields: [
    { key: 'pk',     label: 'ID',       type: 'id' },
    { key: 'year',   label: 'Ano',       type: 'number', required: true },
    { key: 'descr',  label: 'Descrição', type: 'text' },
    { key: 'active', label: 'Ativo',     type: 'boolean' },
    { key: 'data',   label: 'Data',      type: 'date' },
  ],
  listView: { columns: ['year', 'descr', 'active'], defaultSort: { field: 'year', dir: 'desc' }, searchable: true },
  formView: { sections: [{ title: 'Período', fields: ['year', 'descr', 'active', 'data'], cols: 2 }]},
  custom: null,
}
