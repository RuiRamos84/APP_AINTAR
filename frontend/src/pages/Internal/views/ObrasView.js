// /views/ObrasView.js
import React, { useState } from "react";
import { Box, Tabs, Tab } from "@mui/material";
import { useMetaData } from "../../../contexts/MetaDataContext";
import ObrasTable from "../components/ObrasTable";
import ObraDespesaTable from "../components/ObraDespesaTable";

const ObrasView = () => {
    const { metaData } = useMetaData();
    const [tab, setTab] = useState(0);

    return (
        <Box>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
                <Tab label="Registo de Obras" />
                <Tab label="Despesas de Obra" />
            </Tabs>
            {tab === 0 && <ObrasTable metaData={metaData} />}
            {tab === 1 && <ObraDespesaTable metaData={metaData} />}
        </Box>
    );
};

export default ObrasView;
