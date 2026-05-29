export default {
  key: 'rh_ferias', label: 'Férias', labelPlural: 'Férias', icon: 'Umbrella',
  db: { readView: 'vbl_rh_ferias', writeView: 'tb_rh_ferias', pkField: 'pk' },
  permissions: { view: 'operation.access', edit: 'operation.manage' },
  fields: [
    { key: 'pk',              label: 'ID',              type: 'id' },
    { key: 'colaborador_nome',label: 'Colaborador',      type: 'text',   readonly: true },
    { key: 'tipo_descr',      label: 'Tipo',             type: 'text',   readonly: true },
    { key: 'data_inicio',     label: 'Data Início',      type: 'date',   required: true },
    { key: 'data_fim',        label: 'Data Fim',         type: 'date',   required: true },
    { key: 'dias_uteis',      label: 'Dias Úteis',       type: 'number', readonly: true },
    { key: 'estado_descr',    label: 'Estado',           type: 'text',   readonly: true },
    { key: 'notas',           label: 'Notas',            type: 'textarea' },
    { key: 'tb_user_fk', label: 'Colaborador', type: 'relation', relation: { type: 'belongsTo', entity: 'rh_colaborador', displayField: 'name' } },
    { key: 'tt_tipo_fk',      label: 'Tipo (ID)',        type: 'number' },
  ],
  listView: { columns: ['colaborador_nome', 'tipo_descr', 'data_inicio', 'data_fim', 'dias_uteis', 'estado_descr'], defaultSort: { field: 'data_inicio', dir: 'desc' }, searchable: true },
  formView: { sections: [
    { title: 'Férias', fields: ['tb_user_fk', 'tt_tipo_fk', 'data_inicio', 'data_fim'], cols: 2 },
    { title: 'Notas',  fields: ['notas'], cols: 1 },
  ]},
  custom: null,
}
