export default {
  key: 'site_alerta', label: 'Alerta do Site', labelPlural: 'Alertas do Site', icon: 'AlertTriangle',
  db: { readView: 'vbl_site_alerta', writeView: 'vbf_site_alerta', pkField: 'pk' },
  permissions: { view: 'operation.access', edit: 'operation.manage' },
  fields: [
    { key: 'pk',          label: 'ID',          type: 'id' },
    { key: 'mensagem',    label: 'Mensagem',     type: 'textarea', required: true },
    { key: 'tipo',        label: 'Tipo',         type: 'text',    readonly: true },
    { key: 'ts_tipo',     label: 'Tipo (ID)',    type: 'number' },
    { key: 'ativo',       label: 'Ativo',        type: 'boolean' },
    { key: 'ativo_agora', label: 'Ativo Agora',  type: 'boolean', readonly: true },
    { key: 'data_inicio', label: 'Data Início',  type: 'date' },
    { key: 'data_fim',    label: 'Data Fim',     type: 'date' },
  ],
  listView: { columns: ['mensagem', 'tipo', 'ativo', 'ativo_agora', 'data_inicio', 'data_fim'], defaultSort: { field: 'data_inicio', dir: 'desc' }, searchable: true },
  formView: { sections: [{ title: 'Alerta', fields: ['mensagem', 'ts_tipo', 'ativo', 'data_inicio', 'data_fim'], cols: 2 }]},
  custom: null,
}
