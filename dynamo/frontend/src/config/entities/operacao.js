export default {
  key:         'operacao',
  label:       'Operação',
  labelPlural: 'Operações',
  icon:        'ClipboardList',

  db: { readView: 'vbl_operacao', writeView: 'vbf_operacao', pkField: 'pk' },

  permissions: { view: 'operation.access', edit: 'operation.manage' },

  fields: [
    { key: 'pk',             label: 'ID',         type: 'id' },
    { key: 'data',           label: 'Data',       type: 'date', required: true },
    { key: 'pk_instalacao',  label: 'Instalação', type: 'relation', relation: { type: 'belongsTo', entity: 'instalacao', displayField: 'nome' } },
    { key: 'tb_instalacao',  label: 'Instalação', type: 'text', readonly: true },
    { key: 'ts_operador1',     label: 'Operador 1',       type: 'text',    readonly: true },
    { key: 'ts_operador2',     label: 'Operador 2',       type: 'text',    readonly: true },
    { key: 'tt_operacaoaccao', label: 'Ação',             type: 'text',    readonly: true },
    { key: 'descr',            label: 'Descrição',        type: 'text' },
    { key: 'valuetext',        label: 'Valor (texto)',    type: 'text' },
    { key: 'valuenumb',        label: 'Valor (nº)',       type: 'number' },
    { key: 'valuememo',        label: 'Notas',            type: 'textarea' },
  ],

  listView: {
    columns:     ['data', 'tb_instalacao', 'ts_operador1', 'tt_operacaoaccao', 'descr'],
    defaultSort: { field: 'data', dir: 'desc' },
    searchable:  true,
  },

  formView: {
    sections: [
      { title: 'Operação', fields: ['data', 'pk_instalacao', 'ts_operador1', 'ts_operador2', 'tt_operacaoaccao'], cols: 2 },
      { title: 'Dados',    fields: ['descr', 'valuetext', 'valuenumb'],                                           cols: 3 },
      { title: 'Notas',    fields: ['valuememo'],                                                                  cols: 1 },
    ],
  },

  custom: null,
}
