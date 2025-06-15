import { useState, useEffect, useCallback } from 'react';

export const useOperationsTable = (filteredData, selectedView) => {
    const [orderBy, setOrderBy] = useState('restdays');
    const [order, setOrder] = useState('asc');
    const [expandedRows, setExpandedRows] = useState({});
    const [sortedData, setSortedData] = useState([]);

    useEffect(() => {
        if (selectedView && filteredData[selectedView]?.data) {
            const data = [...filteredData[selectedView].data];

            const sorted = data.sort((a, b) => {
                let aVal = a[orderBy];
                let bVal = b[orderBy];

                // Tratar null/undefined
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return 1;
                if (bVal == null) return -1;

                // Números
                if (!isNaN(aVal) && !isNaN(bVal)) {
                    aVal = Number(aVal);
                    bVal = Number(bVal);
                    return order === 'asc' ? aVal - bVal : bVal - aVal;
                }

                // Strings
                aVal = String(aVal).toLowerCase();
                bVal = String(bVal).toLowerCase();

                if (order === 'asc') {
                    return aVal.localeCompare(bVal);
                }
                return bVal.localeCompare(aVal);
            });

            setSortedData(sorted);
        } else {
            setSortedData([]);
        }
    }, [filteredData, selectedView, orderBy, order]);

    const handleRequestSort = useCallback((property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    }, [orderBy, order]);

    const toggleRowExpand = useCallback((rowIndex) => {
        setExpandedRows(prev => ({
            ...prev,
            [rowIndex]: !prev[rowIndex]
        }));
    }, []);

    const getAddressString = useCallback((row) => {
        const parts = [
            row.address,
            row.door && `Porta: ${row.door}`,
            row.nut4,
            row.nut3,
            row.nut2,
            row.nut1
        ].filter(Boolean);

        return parts.join(', ');
    }, []);

    return {
        orderBy,
        order,
        expandedRows,
        sortedData,
        handleRequestSort,
        toggleRowExpand,
        getAddressString
    };
};

export default useOperationsTable;