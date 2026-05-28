export default {
  key: 'stockout', label: 'Saída de Stock', labelPlural: 'Saídas de Stock', icon: 'PackageMinus',
  db: { readView: 'vbl_stockout', writeView: 'vbf_stockout', pkField: 'pk' },
  permissions: { view: 'operation.access', edit: 'operation.manage' },
  fields: [
    { key: 'pk',           label: 'ID',        type: 'id' },
    { key: 'tt_stockitem', label: 'Artigo',     type: 'text',   readonly: true },
    { key: 'tt_stocktype', label: 'Categoria',  type: 'text',   readonly: true },
    { key: 'tt_unit',      label: 'Unidade',    type: 'text',   readonly: true },
    { key: 'date',         label: 'Data',       type: 'date',   required: true },
    { key: 'quantity',     label: 'Quantidade', type: 'number', required: true },
    { key: 'dest_place',   label: 'Destino',    type: 'text',   readonly: true },
    { key: 'dest_descr',   label: 'Descrição',  type: 'text' },
  ],
  listView: { columns: ['tt_stockitem', 'tt_stocktype', 'date', 'quantity', 'dest_place'], defaultSort: { field: 'date', dir: 'desc' }, searchable: true },
  formView: { sections: [{ title: 'Saída', fields: ['tt_stockitem', 'date', 'quantity', 'dest_descr'], cols: 2 }]},
  custom: null,
}
