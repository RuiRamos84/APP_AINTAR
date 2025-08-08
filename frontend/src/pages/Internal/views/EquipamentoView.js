// /views/EquipamentoView.js
import React from "react";
import { Box } from "@mui/material";

import { useMetaData } from "../../../contexts/MetaDataContext";
import EquipExpenseTable from "../components/EquipExpenseTable";

const EquipamentoView = () => {
    const { metaData } = useMetaData();

    return (
        <Box>
            <EquipExpenseTable metaData={metaData} />
        </Box>
    );
};

export default EquipamentoView;