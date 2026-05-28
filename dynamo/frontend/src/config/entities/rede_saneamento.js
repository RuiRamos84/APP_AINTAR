export default {
  key: 'rede_saneamento', label: 'Ligação de Rede', labelPlural: 'Rede de Saneamento', icon: 'GitBranch',
  db: { readView: 'vbl_rede_saneamento', writeView: 'vbf_rede_saneamento', pkField: 'pk' },
  permissions: { view: 'operation.access', edit: 'operation.manage' },
  fields: [
    { key: 'pk',                 label: 'ID',           type: 'id' },
    { key: 'origem_nome',        label: 'Origem',        type: 'text',   readonly: true },
    { key: 'destino_nome',       label: 'Destino',       type: 'text',   readonly: true },
    { key: 'instalacao_origem',  label: 'Origem (ID)',   type: 'number', required: true },
    { key: 'instalacao_destino', label: 'Destino (ID)',  type: 'number', required: true },
  ],
  listView: { columns: ['origem_nome', 'destino_nome'], defaultSort: { field: 'pk', dir: 'asc' }, searchable: true },
  formView: { sections: [{ title: 'Ligação', fields: ['instalacao_origem', 'instalacao_destino'], cols: 2 }]},
  custom: null,
}
