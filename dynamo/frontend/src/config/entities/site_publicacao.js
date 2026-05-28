export default {
  key: 'site_publicacao', label: 'Publicação', labelPlural: 'Publicações', icon: 'BookOpen',
  db: { readView: 'vbl_site_publicacao', writeView: 'vbf_site_publicacao', pkField: 'pk' },
  permissions: { view: 'operation.access', edit: 'operation.manage' },
  fields: [
    { key: 'pk',              label: 'ID',             type: 'id' },
    { key: 'titulo',          label: 'Título',          type: 'text',   required: true },
    { key: 'tipo',            label: 'Tipo',            type: 'text',   readonly: true },
    { key: 'ts_tipo',         label: 'Tipo (ID)',       type: 'number' },
    { key: 'numero',          label: 'Número',          type: 'text' },
    { key: 'ano',             label: 'Ano',             type: 'number', required: true },
    { key: 'data_publicacao', label: 'Data Publicação', type: 'date' },
    { key: 'referencia_dr',   label: 'Referência DR',   type: 'text' },
    { key: 'ficheiro_url',    label: 'Ficheiro URL',    type: 'text' },
    { key: 'e_retificacao',   label: 'É Retificação',   type: 'boolean' },
    { key: 'ativo',           label: 'Ativo',           type: 'boolean' },
  ],
  listView: { columns: ['titulo', 'tipo', 'numero', 'ano', 'data_publicacao', 'ativo'], defaultSort: { field: 'data_publicacao', dir: 'desc' }, searchable: true },
  formView: { sections: [
    { title: 'Publicação',  fields: ['titulo', 'ts_tipo', 'numero', 'ano', 'data_publicacao', 'ativo'], cols: 2 },
    { title: 'Referências', fields: ['referencia_dr', 'ficheiro_url', 'e_retificacao'],                  cols: 2 },
  ]},
  custom: null,
}
