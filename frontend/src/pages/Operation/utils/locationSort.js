// utils/locationSort.js
const getLocationHierarchy = (item) => {
    return `${item.nut1 || ''}-${item.nut2 || ''}-${item.nut3 || ''}-${item.nut4 || ''}`;
};