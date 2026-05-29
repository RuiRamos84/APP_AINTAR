export default {
  key:         'sensor',
  label:       'Sensor',
  labelPlural: 'Sensores',
  icon:        'Radio',

  db: { readView: 'vbl_sensor', writeView: 'tb_sensor', pkField: 'pk' },

  permissions: { view: 'operation.access', edit: 'operation.manage' },

  fields: [
    { key: 'pk',            label: 'ID',        type: 'id' },
    { key: 'name',          label: 'Nome',       type: 'text',   required: true },
    { key: 'tt_sensortype', label: 'Tipo',       type: 'text',   readonly: true },
    { key: 'latitude',      label: 'Latitude',   type: 'number' },
    { key: 'longitude',     label: 'Longitude',  type: 'number' },
  ],

  listView: {
    columns:     ['name', 'tt_sensortype', 'latitude', 'longitude'],
    defaultSort: { field: 'name', dir: 'asc' },
    searchable:  true,
  },

  formView: {
    sections: [
      { title: 'Sensor',        fields: ['name', 'tt_sensortype'], cols: 2 },
      { title: 'Localização',   fields: ['latitude', 'longitude'], cols: 2 },
    ],
  },

  custom: null,
}
