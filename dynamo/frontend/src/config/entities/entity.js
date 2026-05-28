export default {
  key:         'entity',
  label:       'Entidade',
  labelPlural: 'Entidades',
  icon:        'Users',

  db: { readView: 'vbl_entity', writeView: 'vbf_entity', pkField: 'pk' },

  permissions: { view: 'operation.access', edit: 'operation.manage' },

  fields: [
    { key: 'pk',      label: 'ID',          type: 'id' },
    { key: 'name',    label: 'Nome',         type: 'text',   required: true },
    { key: 'nipc',    label: 'NIF/NIPC',     type: 'number' },
    { key: 'phone',   label: 'Telefone',     type: 'text' },
    { key: 'email',   label: 'Email',        type: 'text' },
    { key: 'address', label: 'Morada',       type: 'text' },
    { key: 'postal',  label: 'Cód. Postal',  type: 'text' },
    { key: 'descr',   label: 'Observações',  type: 'textarea' },
  ],

  listView: {
    columns:     ['name', 'nipc', 'phone', 'email'],
    defaultSort: { field: 'name', dir: 'asc' },
    searchable:  true,
  },

  formView: {
    sections: [
      { title: 'Identificação', fields: ['name', 'nipc', 'phone', 'email'], cols: 2 },
      { title: 'Morada',        fields: ['address', 'postal'],               cols: 2 },
      { title: 'Notas',         fields: ['descr'],                            cols: 1 },
    ],
  },

  custom: null,
}
