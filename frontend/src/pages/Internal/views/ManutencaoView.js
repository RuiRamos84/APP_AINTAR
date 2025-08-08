// /views/ManutencaoView.js
import React from "react";
import { Box } from "@mui/material";
import { useMetaData } from "../../../contexts/MetaDataContext";
import ExpenseRecordsTable from "../components/ExpenseRecordsTable";

const ManutencaoView = () => {
    const { metaData } = useMetaData();

    return (
        <Box>
            <ExpenseRecordsTable
                selectedArea={5}
                metaData={metaData}
            />
        </Box>
    );
};

export default ManutencaoView;