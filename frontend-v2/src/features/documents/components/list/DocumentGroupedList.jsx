import React, { useMemo, useState } from 'react';
import {
  Box,
  Tab,
  Tabs,
  Chip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { NotificationsActive as NotifIcon } from '@mui/icons-material';
import DocumentList from './DocumentList';
import DocumentGrid from '../card/DocumentGrid';
import { getStatusColor, getStatusLabel } from '../../utils/documentUtils';

/**
 * Grouped list of documents by status (what), shown as tabs.
 * Used in "A Meu Cargo" tab.
 */
const DocumentGroupedList = ({ documents, loading, onViewDetails, metaData, viewMode = 'list' }) => {
  const theme = useTheme();
  const [selectedStatus, setSelectedStatus] = useState(null); // null = first group

  // Build ordered groups: notifications first, then by status code
  const groups = useMemo(() => {
    if (!documents?.length) return [];
    const map = {};
    documents.forEach((doc) => {
      const key = String(doc.what ?? -99);
      if (!map[key]) map[key] = { statusId: doc.what, docs: [] };
      map[key].docs.push(doc);
    });
    return Object.values(map).sort((a, b) => {
      const aNotif = a.docs.some((d) => d.notification === 1) ? 1 : 0;
      const bNotif = b.docs.some((d) => d.notification === 1) ? 1 : 0;
      if (aNotif !== bNotif) return bNotif - aNotif;
      return Number(a.statusId) - Number(b.statusId);
    });
  }, [documents]);

  // Active tab key — default to first group
  const activeKey = selectedStatus ?? (groups[0] ? String(groups[0].statusId) : null);
  const activeDocs = groups.find((g) => String(g.statusId) === activeKey)?.docs ?? [];

  if (!documents?.length && !loading) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography color="text.secondary">Sem pedidos para apresentar.</Typography>
      </Box>
    );
  }

  // MUI color names mapped from status color
  const MUI_COLORS = ['default', 'primary', 'secondary', 'error', 'warning', 'info', 'success'];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tab bar — one tab per status group */}
      <Box
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: 'background.paper',
          borderRadius: '8px 8px 0 0',
          px: 1,
        }}
      >
        <Tabs
          value={activeKey}
          onChange={(_, val) => setSelectedStatus(val)}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 44,
            '& .MuiTab-root': {
              minHeight: 44,
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.82rem',
              px: 1.5,
            },
            '& .MuiTabs-indicator': {
              height: 3,
              borderRadius: '3px 3px 0 0',
            },
          }}
        >
          {groups.map(({ statusId, docs }) => {
            const key = String(statusId);
            const label = getStatusLabel(statusId, metaData);
            const color = getStatusColor(statusId);
            const notifCount = docs.filter((d) => d.notification === 1).length;
            const muiColor = MUI_COLORS.includes(color) ? color : 'default';

            return (
              <Tab
                key={key}
                value={key}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <span>{label}</span>
                    <Chip
                      label={docs.length}
                      size="small"
                      color={activeKey === key ? muiColor : 'default'}
                      sx={{
                        height: 18,
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        '& .MuiChip-label': { px: 0.75 },
                      }}
                    />
                    {notifCount > 0 && (
                      <Chip
                        icon={<NotifIcon sx={{ fontSize: '11px !important' }} />}
                        label={notifCount}
                        color="error"
                        size="small"
                        sx={{
                          height: 18,
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          '& .MuiChip-label': { px: 0.5 },
                          '& .MuiChip-icon': { ml: '4px' },
                        }}
                      />
                    )}
                  </Box>
                }
              />
            );
          })}
        </Tabs>
      </Box>

      {/* Documents for the selected state — list or grid */}
      <Box
        sx={{
          flexGrow: 1,
          bgcolor: 'background.paper',
          borderRadius: '0 0 8px 8px',
          border: `1px solid ${theme.palette.divider}`,
          borderTop: 'none',
          overflow: 'hidden',
        }}
      >
        {viewMode === 'grid' ? (
          <DocumentGrid
            key={activeKey}
            documents={activeDocs}
            loading={loading}
            onViewDetails={onViewDetails}
            metaData={metaData}
            animated={false}
          />
        ) : (
          <DocumentList
            documents={activeDocs}
            loading={loading}
            onViewDetails={onViewDetails}
            metaData={metaData}
          />
        )}
      </Box>
    </Box>
  );
};

export default DocumentGroupedList;
