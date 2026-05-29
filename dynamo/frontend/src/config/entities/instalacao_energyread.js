export default {
  key: 'instalacao_energyread', label: 'Leitura de Energia', labelPlural: 'Leituras de Energia', icon: 'Zap',
  db: { readView: 'vbl_instalacao_energyread', writeView: 'tb_instalacao_energyread', pkField: 'pk' },
  permissions: { view: 'operation.access', edit: 'operation.manage' },
  fields: [
    { key: 'pk',            label: 'ID',              type: 'id' },
    { key: 'tb_instalacao', label: 'Instalação', type: 'relation', relation: { type: 'belongsTo', entity: 'instalacao', displayField: 'nome' }, required: true },
    { key: 'data',          label: 'Data',             type: 'date',   required: true },
    { key: 'valor_vazio',   label: 'Vazio (kWh)',      type: 'number' },
    { key: 'valor_ponta',   label: 'Ponta (kWh)',      type: 'number' },
    { key: 'valor_cheia',   label: 'Cheia (kWh)',      type: 'number' },
    { key: 'ts_client',     label: 'Registado por',    type: 'text',   readonly: true },
  ],
  listView: { columns: ['tb_instalacao', 'data', 'valor_vazio', 'valor_ponta', 'valor_cheia'], defaultSort: { field: 'data', dir: 'desc' }, searchable: true },
  formView: { sections: [{ title: 'Leitura Energia', fields: ['tb_instalacao', 'data', 'valor_vazio', 'valor_ponta', 'valor_cheia'], cols: 2 }]},
  custom: null,
}
