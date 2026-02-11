import React from "react";
import { Box } from "@mui/material";
import { useMetaData } from "../../../contexts/MetaDataContext";
import InventoryTable from "../components/InventoryTable";

const InventoryView = () => {
    const { metaData } = useMetaData();

    return (
        <Box>
            <InventoryTable metaData={metaData} />
        </Box>
    );
};

export default InventoryView;
