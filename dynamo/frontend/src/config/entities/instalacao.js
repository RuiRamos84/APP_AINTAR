export default {
  key:         'instalacao',
  label:       'Instalação',
  labelPlural: 'Instalações',
  icon:        'MapPin',

  db: { readView: 'vbl_instalacao', writeView: 'vbf_etar', pkField: 'pk' },

  permissions: { view: 'operation.access', edit: 'operation.manage' },

  fields: [
    { key: 'pk',                         label: 'ID',            type: 'id' },
    { key: 'nome',                       label: 'Nome',           type: 'text',   readonly: true },
    { key: 'tipo',                       label: 'Tipo',           type: 'text',   readonly: true },
    { key: 'ts_entity',                  label: 'Entidade',       type: 'text',   readonly: true },
    { key: 'tt_freguesia',               label: 'Freguesia',      type: 'text',   readonly: true },
    { key: 'subsistema',                 label: 'Subsistema',     type: 'text',   readonly: true },
    { key: 'tt_instalacaolicenciamento', label: 'Licenciamento',  type: 'text',   readonly: true },
    { key: 'coord_m',                    label: 'Coord. M',       type: 'number', readonly: true },
    { key: 'coord_p',                    label: 'Coord. P',       type: 'number', readonly: true },
  ],

  relations: {
    equipamentos:    { type: 'hasMany', entity: 'equipamento_aloc',        foreignKey: 'pk_instalacao', label: 'Equipamentos',   icon: 'Wrench' },
    operacoes:       { type: 'hasMany', entity: 'operacao',                 foreignKey: 'pk_instalacao', label: 'Operações',      icon: 'ClipboardList' },
    metas:           { type: 'hasMany', entity: 'operacaometa',             foreignKey: 'pk_instalacao', label: 'Metas',          icon: 'CalendarClock' },
    analises:        { type: 'hasMany', entity: 'instalacao_analise',       foreignKey: 'pk_instalacao', label: 'Análises',       icon: 'FlaskConical' },
    incumprimentos:  { type: 'hasMany', entity: 'instalacao_incumprimento', foreignKey: 'tb_instalacao', label: 'Incumprimentos', icon: 'AlertOctagon' },
    leituras_energia:{ type: 'hasMany', entity: 'instalacao_energyread',    foreignKey: 'tb_instalacao', label: 'Energia',        icon: 'Zap' },
    leituras_volume: { type: 'hasMany', entity: 'instalacao_volumeread',    foreignKey: 'tb_instalacao', label: 'Volume',         icon: 'Droplets' },
    leituras_agua:   { type: 'hasMany', entity: 'instalacao_waterread',     foreignKey: 'tb_instalacao', label: 'Caudal',         icon: 'Waves' },
    despesas:        { type: 'hasMany', entity: 'expense',                  foreignKey: 'tb_instalacao', label: 'Despesas',       icon: 'Receipt' },
  },

  listView: {
    columns:     ['nome', 'tipo', 'ts_entity', 'subsistema', 'tt_freguesia'],
    defaultSort: { field: 'nome', dir: 'asc' },
    searchable:  true,
  },

  formView: {
    sections: [
      { title: 'Identificação', fields: ['nome', 'tipo', 'ts_entity', 'tt_freguesia', 'subsistema', 'tt_instalacaolicenciamento'], cols: 2 },
    ],
  },

  detailView: { tabs: [
    { label: 'Equipamentos',   relation: 'equipamentos',     icon: 'Wrench' },
    { label: 'Operações',      relation: 'operacoes',        icon: 'ClipboardList' },
    { label: 'Metas',          relation: 'metas',            icon: 'CalendarClock' },
    { label: 'Análises',       relation: 'analises',         icon: 'FlaskConical' },
    { label: 'Incumprimentos', relation: 'incumprimentos',   icon: 'AlertOctagon' },
    { label: 'Energia',        relation: 'leituras_energia', icon: 'Zap' },
    { label: 'Volume',         relation: 'leituras_volume',  icon: 'Droplets' },
    { label: 'Caudal',         relation: 'leituras_agua',    icon: 'Waves' },
    { label: 'Despesas',       relation: 'despesas',         icon: 'Receipt' },
  ]},

  custom: null,
}
