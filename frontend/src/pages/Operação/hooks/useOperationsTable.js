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
                if (order === 'asc') {
                    return a[orderBy] < b[orderBy] ? -1 : 1;
                } else {
                    return a[orderBy] > b[orderBy] ? -1 : 1;
                }
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