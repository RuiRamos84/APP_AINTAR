import React, { useState } from "react";
import {
  TableCell,
  TableRow,
  IconButton,
  Collapse,
  Box,
  Typography,
  Table,
  TableHead,
  TableBody,
  useTheme,
} from "@mui/material";
import { KeyboardArrowDown, KeyboardArrowUp } from "@mui/icons-material";
import "./LetterRow.css";

const LetterRow = ({ row, onUpdateRow }) => {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const { metaData } = useMetaData();

  const getDocTypeName = (typeId) => {
    const docType = metaData?.tt_doctype?.find((type) => type.pk === typeId);
    return docType ? docType.name : typeId;
  };

  const formatRowValue = (key, value) => {
    if (key === "tt_doctype") {
      return getDocTypeName(value);
    }
    return value;
  };

  return (
    <>
      <TableRow
        className="table-row-rows"
        style={{
          backgroundColor: open
            ? theme.palette.action.hover
            : theme.palette.background.default,
        }}
      >
        <TableCell className="no-spacing-rows">
          <IconButton size="small" onClick={() => setOpen(!open)}>
            {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </TableCell>
        <TableCell>{row.regnumber}</TableCell>
        <TableCell>{row.document_regnumber}</TableCell>
        <TableCell>{row.data}</TableCell>
        <TableCell>{row.descr}</TableCell>
        <TableCell>{row.filename}</TableCell>
        <TableCell>{row.tb_document}</TableCell>
        <TableCell></TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box margin={1}>
              <Typography variant="h6" gutterBottom component="div">
                Detalhes
              </Typography>
              <Table size="small" aria-label="detalhes">
                <TableHead>
                  <TableRow>
                    <TableCell>Campo</TableCell>
                    <TableCell>Valor</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Object.entries(row).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell component="th" scope="row">
                        {key}
                      </TableCell>
                      <TableCell>{formatRowValue(key, value)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export default LetterRow;
