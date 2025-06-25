import api from '../../../services/api';

export const fetchOperationsData = async (page = 1, pageSize = 50) => {
    const response = await api.get('/operations', {
        params: { page, page_size: pageSize }
    });
    console.log('Operations data fetched:', response.data);
    return response.data;
};

export const completeOperation = async (documentId, stepData) => {
    const response = await api.post(`/add_document_step/${documentId}`, stepData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
};

export const exportToExcel = async (filteredData, selectedView) => {
    const { exportToExcel: exportFunction } = await import('../../Operação/services/exportService');
    return exportFunction(filteredData, selectedView);
};