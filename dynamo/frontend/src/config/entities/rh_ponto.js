export default {
  key: 'rh_ponto', label: 'Registo de Ponto', labelPlural: 'Registos de Ponto', icon: 'Clock',
  db: { readView: 'vbl_rh_ponto', writeView: 'tb_rh_ponto', pkField: 'pk' },
  permissions: { view: 'operation.access', edit: 'operation.manage' },
  fields: [
    { key: 'pk',               label: 'ID',            type: 'id' },
    { key: 'colaborador_nome', label: 'Colaborador',    type: 'text',    readonly: true },
    { key: 'data',             label: 'Data',           type: 'date',    required: true },
    { key: 'evento_descr',     label: 'Evento',         type: 'text',    readonly: true },
    { key: 'ts_registo',       label: 'Hora Registo',   type: 'date',    readonly: true },
    { key: 'local_nome',       label: 'Local',          type: 'text',    readonly: true },
    { key: 'fora_local',       label: 'Fora de Local',  type: 'boolean', readonly: true },
    { key: 'notas',            label: 'Notas',          type: 'textarea' },
  ],
  listView: { columns: ['colaborador_nome', 'data', 'evento_descr', 'ts_registo', 'local_nome', 'fora_local'], defaultSort: { field: 'data', dir: 'desc' }, searchable: true },
  formView: { sections: [
    { title: 'Ponto', fields: ['colaborador_nome', 'data', 'evento_descr', 'local_nome'], cols: 2 },
    { title: 'Notas', fields: ['notas'], cols: 1 },
  ]},
  custom: null,
}
