export default {
  key: 'rh_piquete', label: 'Piquete', labelPlural: 'Piquetes', icon: 'ShieldAlert',
  db: { readView: 'vbl_rh_piquete', writeView: 'tb_rh_piquete_escala', pkField: 'pk' },
  permissions: { view: 'operation.access', edit: 'operation.manage' },
  fields: [
    { key: 'pk',              label: 'ID',              type: 'id' },
    { key: 'colaborador_nome',label: 'Colaborador',      type: 'text',    readonly: true },
    { key: 'data_inicio',     label: 'Início',           type: 'date',    required: true },
    { key: 'data_fim',        label: 'Fim',              type: 'date',    required: true },
    { key: 'ano',             label: 'Ano',              type: 'number',  readonly: true },
    { key: 'mes',             label: 'Mês',              type: 'number',  readonly: true },
    { key: 'confirmado',      label: 'Confirmado',       type: 'boolean' },
    { key: 'estado_descr',    label: 'Estado',           type: 'text',    readonly: true },
    { key: 'tb_user_fk', label: 'Colaborador', type: 'relation', relation: { type: 'belongsTo', entity: 'rh_colaborador', displayField: 'name' } },
  ],
  listView: { columns: ['colaborador_nome', 'data_inicio', 'data_fim', 'confirmado', 'estado_descr'], defaultSort: { field: 'data_inicio', dir: 'desc' }, searchable: true },
  formView: { sections: [
    { title: 'Piquete', fields: ['tb_user_fk', 'data_inicio', 'data_fim', 'confirmado'], cols: 2 },
  ]},
  custom: null,
}
