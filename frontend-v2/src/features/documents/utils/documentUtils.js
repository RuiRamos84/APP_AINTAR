import { format } from 'date-fns';
import { pt } from 'date-fns/locale';

/**
 * Get color for document status
 */
export const getStatusColor = (statusId, theme) => {
  // Assuming standard status IDs from legacy system
  // 0: Concluded (Green)
  // 1: In Progress (Warning/Orange)
  // 2: New (Blue)
  // 3: Blocked (Red)
  // 4: In Review (Info/Light Blue)
  
  const id = parseInt(statusId);
  
  switch (id) {
    case 0: return 'success';
    case 1: return 'warning';
    case 2: return 'primary';
    case 3: return 'error';
    case 4: return 'info';
    default: return 'default';
  }
};

/**
 * Get status label (mock implementation - should ideally come from metadata)
 */
export const getStatusLabel = (statusId, metadata = null) => {
  if (metadata && metadata.what) {
      const status = metadata.what.find(s => s.pk === parseInt(statusId));
      if (status) return status.step;
  }

  // Fallback
  const id = parseInt(statusId);
  switch (id) {
    case 0: return 'Concluído';
    case 1: return 'Em Tratamento';
    case 2: return 'Novo';
    case 3: return 'Bloqueado';
    case 4: return 'Em Revisão';
    default: return 'Desconhecido';
  }
};

/**
 * Format date to PT format
 */
export const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return format(date, "d 'de' MMM, yyyy HH:mm", { locale: pt });
};

/**
 * Filter documents helper
 * @param {Array} documents
 * @param {Object} filters - { status, associate, type, notification }
 * @param {string} searchTerm
 * @param {Object} dateRange - { startDate, endDate } (YYYY-MM-DD strings)
 */
export const filterDocuments = (documents, filters, searchTerm, dateRange) => {
    if (!documents || !Array.isArray(documents)) return [];

    return documents.filter(doc => {
        // Text Search
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            const matchesSearch =
                (doc.regnumber && doc.regnumber.toLowerCase().includes(searchLower)) ||
                (doc.address && doc.address.toLowerCase().includes(searchLower)) ||
                (doc.memo && doc.memo.toLowerCase().includes(searchLower)) ||
                (doc.ts_entity_name && doc.ts_entity_name.toLowerCase().includes(searchLower));

            if (!matchesSearch) return false;
        }

        // Status Filter
        if (filters.status !== '' && filters.status != null) {
            if (parseInt(doc.what) !== parseInt(filters.status)) return false;
        }

        // Associate Filter
        if (filters.associate !== '' && filters.associate != null) {
            if (String(doc.ts_associate) !== String(filters.associate)) return false;
        }

        // Document Type Filter
        if (filters.type !== '' && filters.type != null) {
            if (String(doc.tt_type_pk || doc.tt_type) !== String(filters.type)) return false;
        }

        // Notification Filter
        if (filters.notification !== '' && filters.notification != null) {
            const hasNotification = Number(doc.notification) > 0;
            if (filters.notification === '1' && !hasNotification) return false;
            if (filters.notification === '0' && hasNotification) return false;
        }

        // Date Range Filter
        if (dateRange) {
            const docDate = doc.submission ? new Date(doc.submission) : null;
            if (docDate) {
                if (dateRange.startDate) {
                    const start = new Date(dateRange.startDate);
                    start.setHours(0, 0, 0, 0);
                    if (docDate < start) return false;
                }
                if (dateRange.endDate) {
                    const end = new Date(dateRange.endDate);
                    end.setHours(23, 59, 59, 999);
                    if (docDate > end) return false;
                }
            }
        }

        return true;
    });
};

/**
 * Sort documents helper
 */
export const sortDocuments = (documents, sortConfig) => {
    if (!documents) return [];
    
    return [...documents].sort((a, b) => {
        const aValue = a[sortConfig.field];
        const bValue = b[sortConfig.field];
        
        if (sortConfig.direction === 'asc') {
            return aValue > bValue ? 1 : -1;
        } else {
            return aValue < bValue ? 1 : -1;
        }
    });
};
