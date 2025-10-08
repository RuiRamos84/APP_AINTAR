import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchOperationsData } from "../services/operationsService";
import { sortViews } from "../pages/Operação/utils/operationsHelpers";
import { useMetaData } from "../contexts/MetaDataContext";

export const useOperationsData = () => {
    const { metaData } = useMetaData();

    const { data: operationsData, isLoading: loading, error } = useQuery({
        queryKey: ['operationsData'],
        queryFn: () => fetchOperationsData(),
        staleTime: 1000 * 60 * 5, // Cache de 5 minutos
        refetchOnWindowFocus: false,
    });

    const associates = useMemo(() => {
        if (!operationsData) return ["all"];

        const uniqueAssociates = new Set(["all"]);
        Object.values(operationsData).forEach(item => {
            item.data.forEach(d => {
                if (d.ts_associate && typeof d.ts_associate === 'string' && isNaN(Number(d.ts_associate))) {
                    uniqueAssociates.add(d.ts_associate);
                }
            });
        });
        return Array.from(uniqueAssociates);
    }, [operationsData]);

    return { 
        operationsData: operationsData || {}, 
        loading, 
        error, 
        metaData, // Vem do hook useMetaData
        associates 
    };
};

export const useOperationsFiltering = (operationsData) => {
    const [selectedAssociate, setSelectedAssociate] = useState("all");
    const [selectedView, setSelectedView] = useState(null);

    const isFossaView = useMemo(() => {
        return selectedView ? selectedView.startsWith("vbr_document_fossa") : false;
    }, [selectedView]);

    const isRamaisView = useMemo(() => {
        return selectedView ? selectedView.startsWith("vbr_document_ramais") : false;
    }, [selectedView]);

    const filterDataByAssociate = useMemo(() => {
        return (data) => {
            const result = {};
            const specificViews = [
                "vbr_document_ramais01",
                "vbr_document_caixas01",
                "vbr_document_desobstrucao01",
                "vbr_document_pavimentacao01",
                "vbr_document_rede01",
            ];

            const municipalityFossaMap = {
                "Município de Carregal do Sal": "vbr_document_fossa02",
                "Município de Santa Comba Dão": "vbr_document_fossa03",
                "Município de Tábua": "vbr_document_fossa04",
                "Município de Tondela": "vbr_document_fossa05",
            };

            if (selectedAssociate === "all") {
                result["vbr_document_fossa01"] = data["vbr_document_fossa01"];
                specificViews.forEach((view) => {
                    if (data[view]) {
                        result[view] = data[view];
                    }
                });
            } else {
                const fossaKey = municipalityFossaMap[selectedAssociate];
                if (fossaKey && data[fossaKey]) {
                    result[fossaKey] = data[fossaKey];
                }

                specificViews.forEach((view) => {
                    if (data[view]) {
                        const filteredData = data[view].data.filter(
                            (item) => item.ts_associate === selectedAssociate
                        );
                        if (filteredData.length > 0) {
                            result[view] = {
                                ...data[view],
                                data: filteredData,
                                total: filteredData.length,
                            };
                        }
                    }
                });
            }

            return result;
        };
    }, [selectedAssociate]);


    const filteredData = useMemo(
        () => filterDataByAssociate(operationsData),
        [filterDataByAssociate, operationsData]
    );

    const sortedViews = useMemo(
        () => sortViews(filteredData),
        [filteredData]
    );

    // Auto-selecionar primeira view disponível
    useEffect(() => {
        // Se não há view selecionada OU a view atual não existe nos dados filtrados
        if (!selectedView || !filteredData[selectedView]) {
            if (sortedViews.length > 0) {
                setSelectedView(sortedViews[0][0]);
            } else {
                setSelectedView(null);
            }
        }
    }, [filteredData, selectedView, sortedViews]);

    const handleViewChange = (viewName) => {
        setSelectedView(viewName === selectedView ? null : viewName);
    };

    const handleAssociateChange = (value) => {
        setSelectedAssociate(value);
        // Não define null aqui, mantém a vista selecionada
        // setSelectedView(null);
    };

    return {
        selectedAssociate,
        selectedView,
        isFossaView,
        isRamaisView,
        filteredData,
        sortedViews,
        handleViewChange,
        handleAssociateChange
    };
};

export const useOperationsTable = (filteredData, selectedView) => {
    const [orderBy, setOrderBy] = useState("");
    const [order, setOrder] = useState("asc");
    const [expandedRows, setExpandedRows] = useState({});

    const sortedData = useMemo(() => {
        if (!selectedView || !filteredData[selectedView]) return [];

        return [...filteredData[selectedView].data].sort((a, b) => {
            if (!a[orderBy] || !b[orderBy]) return 0;

            if (orderBy === 'restdays') {
                return order === 'asc'
                    ? Number(a[orderBy]) - Number(b[orderBy])
                    : Number(b[orderBy]) - Number(a[orderBy]);
            }

            if (order === "asc") {
                return a[orderBy].localeCompare(b[orderBy]);
            } else {
                return b[orderBy].localeCompare(a[orderBy]);
            }
        });
    }, [selectedView, filteredData, orderBy, order]);

    const handleRequestSort = (property) => {
        const isAsc = orderBy === property && order === "asc";
        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);
    };

    const toggleRowExpand = (rowIndex) => {
        setExpandedRows((prev) => ({
            ...prev,
            [rowIndex]: !prev[rowIndex],
        }));
    };

    const getAddressString = (row) => {
        return `${row.address || ""}, ${row.door || ""}, ${row.postal || ""} ${row.nut4 || ""
            }`.trim();
    };

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