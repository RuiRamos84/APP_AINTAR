import React from "react";
import { Box } from "@mui/material";
import { useMetaData } from "../../../contexts/MetaDataContext";
import InventaryTable from "../components/InventaryTable";

const InventaryView = () => {
    const { metaData } = useMetaData();

    return (
        <Box>
            <InventaryTable metaData={metaData} />
        </Box>
    );
};

export default InventaryView;