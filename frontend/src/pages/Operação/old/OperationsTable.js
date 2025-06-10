// import React from 'react';
// import {
//     Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
//     TableSortLabel, Paper, Box, Collapse, IconButton, useMediaQuery, useTheme,
//     Checkbox
// } from '@mui/material';
// import { ExpandMore, ExpandLess } from '@mui/icons-material';
// import TableDetails from './TableDetails';

// const OperationsTable = ({
//     data,
//     columns,
//     orderBy,
//     order,
//     onRequestSort,
//     expandedRows,
//     toggleRowExpand,
//     isRamaisView,
//     getRemainingDaysColor,
//     getAddressString,
//     renderCell,
//     onRowClick,
//     selectable = false,
//     selectedItems = [],
//     onSelectionChange,
//     virtualScroll = true,
//     sx = {}
// }) => {
//     const theme = useTheme();
//     const isTablet = useMediaQuery(theme.breakpoints.down('md'));

//     const handleSelectAll = (event) => {
//         if (event.target.checked) {
//             const allIds = data.map(row => row.pk);
//             onSelectionChange?.(allIds);
//         } else {
//             onSelectionChange?.([]);
//         }
//     };

//     const handleSelect = (event, pk) => {
//         event.stopPropagation();
//         if (selectedItems.includes(pk)) {
//             onSelectionChange?.(selectedItems.filter(id => id !== pk));
//         } else {
//             onSelectionChange?.([...selectedItems, pk]);
//         }
//     };

//     // Determinar se todos os itens estão selecionados
//     const allSelected = selectable && data.length > 0 &&
//         data.every(row => selectedItems.includes(row.pk));

//     const tableContent = (
//         <Table stickyHeader sx={{
//             '& .MuiTableCell-root': {
//                 borderBottom: `1px solid ${theme.palette.divider}`,
//                 // Alturas otimizadas para toque em tablet
//                 minHeight: isTablet ? 60 : 48,
//                 lineHeight: isTablet ? 1.6 : 1.5,
//             }
//         }}>
//             <TableHead>
//                 <TableRow>
//                     {selectable && (
//                         <TableCell
//                             sx={{
//                                 width: '48px',
//                                 padding: isTablet ? '8px 4px' : '8px',
//                                 background: theme.palette.background.paper
//                             }}
//                         >
//                             <Checkbox
//                                 indeterminate={selectedItems.length > 0 && !allSelected}
//                                 checked={allSelected}
//                                 onChange={handleSelectAll}
//                                 size="small"
//                             />
//                         </TableCell>
//                     )}

//                     <TableCell
//                         sx={{
//                             width: '48px',
//                             padding: isTablet ? '8px 4px' : '16px 8px',
//                             background: theme.palette.background.paper
//                         }}
//                     />

//                     {columns.map((column) => (
//                         <TableCell
//                             key={column.id || column}
//                             sx={{
//                                 padding: isTablet ? '12px 8px' : '16px',
//                                 fontWeight: 'bold',
//                                 fontSize: isTablet ? '0.9rem' : '1rem',
//                                 background: theme.palette.background.paper,
//                                 position: 'sticky',
//                                 top: 0,
//                                 zIndex: 1
//                             }}
//                         >
//                             <TableSortLabel
//                                 active={orderBy === (column.id || column)}
//                                 direction={orderBy === (column.id || column) ? order : "asc"}
//                                 onClick={() => onRequestSort(column.id || column)}
//                                 sx={{
//                                     '& .MuiTableSortLabel-icon': {
//                                         opacity: 1,
//                                         transition: 'transform 0.2s'
//                                     }
//                                 }}
//                             >
//                                 {column.label}
//                             </TableSortLabel>
//                         </TableCell>
//                     ))}
//                 </TableRow>
//             </TableHead>
//             <TableBody>
//                 {data.map((row, rowIndex) => (
//                     <React.Fragment key={row.pk || rowIndex}>
//                         <TableRow
//                             hover
//                             onClick={() => onRowClick ? onRowClick(row) : null}
//                             sx={{
//                                 cursor: onRowClick ? 'pointer' : 'default',
//                                 '&:hover': {
//                                     backgroundColor: onRowClick ? 'rgba(0, 0, 0, 0.04)' : 'inherit'
//                                 },
//                                 // Linha otimizada para tablet
//                                 height: isTablet ? 70 : 60,
//                                 // Borda de status para ramais
//                                 borderLeft: isRamaisView && row.restdays !== undefined ?
//                                     `4px solid ${getRemainingDaysColor(row.restdays)}` :
//                                     'none',
//                                 // Estilo para itens selecionados
//                                 ...(selectable && selectedItems.includes(row.pk) && {
//                                     backgroundColor: 'action.selected',
//                                     '&:hover': {
//                                         backgroundColor: 'action.hover'
//                                     }
//                                 })
//                             }}
//                         >
//                             {selectable && (
//                                 <TableCell sx={{ padding: isTablet ? '8px 4px' : '8px' }}>
//                                     <Checkbox
//                                         checked={selectedItems.includes(row.pk)}
//                                         onChange={(e) => handleSelect(e, row.pk)}
//                                         size="small"
//                                     />
//                                 </TableCell>
//                             )}

//                             <TableCell
//                                 sx={{
//                                     padding: isTablet ? '8px 4px' : '16px 8px',
//                                 }}
//                             >
//                                 <IconButton
//                                     size={isTablet ? "small" : "medium"}
//                                     onClick={(e) => {
//                                         e.stopPropagation();
//                                         toggleRowExpand(rowIndex);
//                                     }}
//                                     sx={{
//                                         padding: isTablet ? '6px' : '8px',
//                                         '& .MuiSvgIcon-root': {
//                                             fontSize: isTablet ? '1.25rem' : '1.5rem'
//                                         }
//                                     }}
//                                 >
//                                     {expandedRows[rowIndex] ? (
//                                         <ExpandLess />
//                                     ) : (
//                                         <ExpandMore />
//                                     )}
//                                 </IconButton>
//                             </TableCell>

//                             {columns.map((column) => (
//                                 <TableCell
//                                     key={column.id || column}
//                                     sx={{
//                                         padding: isTablet ? '12px 8px' : '16px',
//                                         fontSize: isTablet ? '0.9rem' : '1rem',
//                                         // Altura otimizada para toque em tablet
//                                         minHeight: isTablet ? 60 : 48,
//                                         // Alinhamento vertical
//                                         verticalAlign: 'middle'
//                                     }}
//                                 >
//                                     {renderCell(column, row)}
//                                 </TableCell>
//                             ))}
//                         </TableRow>

//                         <TableRow>
//                             <TableCell
//                                 style={{ paddingBottom: 0, paddingTop: 0, border: 0 }}
//                                 colSpan={columns.length + (selectable ? 2 : 1)}
//                             >
//                                 <Collapse
//                                     in={expandedRows[rowIndex]}
//                                     timeout="auto"
//                                     unmountOnExit
//                                 >
//                                     <TableDetails
//                                         row={row}
//                                         isRamaisView={isRamaisView}
//                                         getAddressString={getAddressString}
//                                         isTablet={isTablet}
//                                     />
//                                 </Collapse>
//                             </TableCell>
//                         </TableRow>
//                     </React.Fragment>
//                 ))}
//             </TableBody>
//         </Table>
//     );

//     // Adicionar scroll virtual para listas muito longas
//     if (virtualScroll && data.length > 50) {
//         return (
//             <TableContainer
//                 component={Paper}
//                 sx={{
//                     maxHeight: isTablet ? "calc(100vh - 340px)" : "calc(100vh - 300px)",
//                     overflow: "auto",
//                     ...sx,
//                     // Scroll suave em tablets
//                     scrollBehavior: 'smooth',
//                     WebkitOverflowScrolling: 'touch',
//                     '&::-webkit-scrollbar': {
//                         width: isTablet ? '8px' : '12px',
//                         height: isTablet ? '8px' : '12px'
//                     },
//                     '&::-webkit-scrollbar-track': {
//                         background: theme.palette.background.default
//                     },
//                     '&::-webkit-scrollbar-thumb': {
//                         background: theme.palette.action.disabled,
//                         borderRadius: '4px'
//                     }
//                 }}
//             >
//                 {tableContent}
//             </TableContainer>
//         );
//     }

//     return (
//         <TableContainer
//             component={Paper}
//             sx={{
//                 maxHeight: isTablet ? "calc(100vh - 340px)" : "calc(100vh - 300px)",
//                 overflow: "auto",
//                 ...sx,
//                 // Scroll suave em tablets
//                 scrollBehavior: 'smooth',
//                 WebkitOverflowScrolling: 'touch',
//                 '&::-webkit-scrollbar': {
//                     width: isTablet ? '8px' : '12px',
//                     height: isTablet ? '8px' : '12px'
//                 },
//                 '&::-webkit-scrollbar-track': {
//                     background: theme.palette.background.default
//                 },
//                 '&::-webkit-scrollbar-thumb': {
//                     background: theme.palette.action.disabled,
//                     borderRadius: '4px'
//                 }
//             }}
//         >
//             {tableContent}
//         </TableContainer>
//     );
// };

// export default OperationsTable;