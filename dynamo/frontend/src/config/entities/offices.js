export default {
  key:         'offices',
  label:       'Ofício',
  labelPlural: 'Ofícios',
  icon:        'Mail',

  db: { readView: 'vbl_letter', writeView: 'vbf_letter', pkField: 'pk' },

  permissions: { view: 'operation.access', edit: 'operation.manage' },

  fields: [
    { key: 'pk',              label: 'ID',           type: 'id' },
    { key: 'regnumber',       label: 'Nº Registo',   type: 'text', readonly: true },
    { key: 'subject',         label: 'Assunto',      type: 'text', required: true },
    { key: 'ts_letterstatus', label: 'Estado',       type: 'select', meta: 'letterstatus' },
    { key: 'ts_lettertype',   label: 'Tipo',         type: 'select', meta: 'lettertype' },
    { key: 'emission_date',   label: 'Data Emissão', type: 'date' },
    { key: 'emission_number', label: 'Nº Emissão',   type: 'text', readonly: true },
    { key: 'filename',        label: 'Ficheiro',     type: 'text', readonly: true },
  ],

  listView: {
    columns:     ['regnumber', 'subject', 'ts_letterstatus', 'ts_lettertype', 'emission_date'],
    defaultSort: { field: 'emission_date', dir: 'desc' },
    searchable:  true,
  },

  formView: {
    sections: [
      { title: 'Dados Gerais', fields: ['subject', 'ts_lettertype', 'ts_letterstatus', 'emission_date'], cols: 2 },
    ],
  },

  custom: null,
}
