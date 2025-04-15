import { useState, useEffect, useMemo } from "react";
import { fetchOperationsData } from "../services/operationsService";
import { sortViews } from "../pages/Operação/operationsHelpers";

export const useOperationsData = () => {
    const [operationsData, setOperationsData] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [metaData, setMetaData] = useState(null);
    const [associates, setAssociates] = useState(["all"]);

    useEffect(() => {
        const loadOperationsData = async () => {
            try {
                const data = await fetchOperationsData();
                setOperationsData(data);

                const storedMetaData = localStorage.getItem("metaData");
                if (storedMetaData) {
                    setMetaData(JSON.parse(storedMetaData).data);
                }

                // Filtro para associados válidos
                const uniqueAssociates = [
                    "all",
                    ...new Set(
                        Object.values(data)
                            .flatMap((item) => item.data.map((d) => d.ts_associate))
                            .filter(associate =>
                                associate &&
                                typeof associate === 'string' &&
                                isNaN(Number(associate))
                            )
                    )
                ];
                setAssociates(uniqueAssociates);
            } catch (error) {
                console.error("Erro ao carregar dados de operações:", error);
                setError(
                    "Falha ao carregar dados de operações. Por favor, tente novamente mais tarde."
                );
            } finally {
                setLoading(false);
            }
        };

        loadOperationsData();
    }, []);

    return { operationsData, loading, error, metaData, associates };
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

    const handleViewChange = (viewName) => {
        setSelectedView(viewName === selectedView ? null : viewName);
    };

    const handleAssociateChange = (value) => {
        setSelectedAssociate(value);
        setSelectedView(null);
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