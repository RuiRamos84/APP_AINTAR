/**
 * DataTableView — simple scrollable table for dashboard data
 */
import { Box, Table, TableBody, TableCell, TableHead, TableRow, Typography, useTheme, alpha } from '@mui/material';
import { formatValue } from './charts/chartUtils';

const DataTableView = ({ data = [], maxRows = 50 }) => {
  const theme = useTheme();
  if (!data.length) return null;
  const cols = Object.keys(data[0]);
  const rows = data.slice(0, maxRows);

  return (
    <Box sx={{ overflowX: 'auto', maxHeight: 320 }}>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            {cols.map((col) => (
              <TableCell
                key={col}
                sx={{
                  fontWeight: 700,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  textTransform: 'capitalize',
                }}
              >
                {col.replace(/_/g, ' ')}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow
              key={i}
              sx={{ '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.04) } }}
            >
              {cols.map((col) => (
                <TableCell key={col} sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                  {typeof row[col] === 'number' ? (
                    <Typography variant="inherit" fontWeight={600}>
                      {formatValue(row[col])}
                    </Typography>
                  ) : (
                    String(row[col] ?? '-')
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {data.length > maxRows && (
        <Typography variant="caption" color="text.secondary" sx={{ p: 1, display: 'block', textAlign: 'center' }}>
          A mostrar {maxRows} de {data.length} registos
        </Typography>
      )}
    </Box>
  );
};

export default DataTableView;
