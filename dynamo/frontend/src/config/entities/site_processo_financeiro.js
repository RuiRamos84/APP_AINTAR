export default {
  key: 'site_processo_financeiro', label: 'Processo Financeiro', labelPlural: 'Processos Financeiros', icon: 'FolderOpen',
  db: { readView: 'vbl_site_processo_financeiro', writeView: 'vbf_site_processo_financeiro', pkField: 'pk' },
  permissions: { view: 'operation.access', edit: 'operation.manage' },
  fields: [
    { key: 'pk',             label: 'ID',           type: 'id' },
    { key: 'titulo',         label: 'Título',        type: 'text',   required: true },
    { key: 'tipo',           label: 'Tipo',          type: 'text',   readonly: true },
    { key: 'ts_tipo',        label: 'Tipo (ID)',     type: 'number' },
    { key: 'ano_exercicio',  label: 'Ano',           type: 'number', required: true },
    { key: 'descricao',      label: 'Descrição',     type: 'textarea' },
    { key: 'estado',         label: 'Estado',        type: 'text',   readonly: true },
    { key: 'visivel',        label: 'Visível',       type: 'boolean' },
    { key: 'num_documentos', label: 'Nº Documentos', type: 'number', readonly: true },
    { key: 'num_publicados', label: 'Nº Publicados', type: 'number', readonly: true },
  ],
  listView: { columns: ['titulo', 'tipo', 'ano_exercicio', 'estado', 'visivel', 'num_documentos'], defaultSort: { field: 'ano_exercicio', dir: 'desc' }, searchable: true },
  formView: { sections: [
    { title: 'Processo',  fields: ['titulo', 'ts_tipo', 'ano_exercicio', 'visivel'], cols: 2 },
    { title: 'Descrição', fields: ['descricao'],                                     cols: 1 },
  ]},
  custom: null,
}
