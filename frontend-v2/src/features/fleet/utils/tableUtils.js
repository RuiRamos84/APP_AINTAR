/**
 * Generates dynamic columns for a DataTable based on the data and a base configuration.
 * Fields present in the data but not in baseColumns will be appended with default settings.
 *
 * @param {Array} data - The array of objects to be displayed in the table.
 * @param {Array} baseColumns - The base column configuration array [{ id, label, ... }].
 * @returns {Array} The fully merged column configuration.
 */
export const generateDynamicColumns = (data, baseColumns = []) => {
  if (!data || data.length === 0) return baseColumns;

  const sampleRow = data[0];
  const keys = Object.keys(sampleRow);
  const baseColumnIds = new Set(baseColumns.map(c => c.id));
  
  const dynamicColumns = [];
  
  // Only add columns that are not already in baseColumns, and exclude 'id' and 'pk' which are usually internal 
  keys.forEach(key => {
    if (!baseColumnIds.has(key) && key !== 'id' && key !== 'pk') {
      dynamicColumns.push({
        id: key,
        label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
        flex: 1,
        minWidth: 150
      });
    }
  });

  return [...baseColumns, ...dynamicColumns];
};
