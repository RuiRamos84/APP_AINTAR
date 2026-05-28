export { default as DynamicRouter } from './DynamicRouter'
export { default as DynamicPage }   from './DynamicPage'
export { default as DynamicForm }   from './DynamicForm'
export { default as DynamicDetail } from './DynamicDetail'
export { default as DynamicTable }  from './DynamicTable'
export { default as FieldRenderer } from './FieldRenderer'
export { default as RelationTab }   from './RelationTab'
export { buildZodSchema }           from './zodSchemaBuilder'

export const engine = {
  recordToFormValues(fields, record) {
    if (!record) return {}
    const values = {}
    for (const field of fields) {
      if (field.type === 'id') continue
      const v = record[field.key]
      if (field.type === 'date' && v) {
        values[field.key] = v.split('T')[0]
      } else {
        values[field.key] = v ?? (field.type === 'boolean' ? false : '')
      }
    }
    return values
  },
}
