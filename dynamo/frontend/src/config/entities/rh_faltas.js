export default {
  key: 'rh_faltas', label: 'Falta', labelPlural: 'Faltas', icon: 'CalendarX',
  db: { readView: 'vbl_rh_faltas', writeView: 'tb_rh_faltas', pkField: 'pk' },
  permissions: { view: 'operation.access', edit: 'operation.manage' },
  fields: [
    { key: 'pk',               label: 'ID',             type: 'id' },
    { key: 'colaborador_nome', label: 'Colaborador',     type: 'text',    readonly: true },
    { key: 'tipo_descr',       label: 'Tipo',            type: 'text',    readonly: true },
    { key: 'data',             label: 'Data',            type: 'date',    required: true },
    { key: 'estado_descr',     label: 'Estado',          type: 'text',    readonly: true },
    { key: 'notas',            label: 'Notas',           type: 'textarea' },
    { key: 'tb_user_fk', label: 'Colaborador', type: 'relation', relation: { type: 'belongsTo', entity: 'rh_colaborador', displayField: 'name' } },
    { key: 'tt_tipo_falta_fk', label: 'Tipo (ID)',       type: 'number' },
  ],
  listView: { columns: ['colaborador_nome', 'tipo_descr', 'data', 'estado_descr'], defaultSort: { field: 'data', dir: 'desc' }, searchable: true },
  formView: { sections: [
    { title: 'Falta', fields: ['tb_user_fk', 'tt_tipo_falta_fk', 'data'], cols: 3 },
    { title: 'Notas', fields: ['notas'], cols: 1 },
  ]},
  custom: null,
}
