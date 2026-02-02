import React, { useMemo } from 'react';
import { Box, Typography, Paper, useTheme, alpha } from '@mui/material';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import DocumentCard from '../card/DocumentCard';
import { getStatusColor, getStatusLabel } from '../../utils/documentUtils';

const ItemTypes = {
  CARD: 'document_card',
};

/**
 * Draggable Card Wrapper
 */
const DraggableCard = ({ document, onViewDetails }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.CARD,
    item: { id: document.pk, status: document.what, document },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  return (
    <Box
      ref={drag}
      sx={{
        opacity: isDragging ? 0.5 : 1,
        cursor: 'move',
        mb: 2,
      }}
    >
      <DocumentCard document={document} onViewDetails={onViewDetails} />
    </Box>
  );
};

/**
 * Droppable Column
 */
const KanbanColumn = ({ status, title, documents, onDrop, onViewDetails }) => {
  const theme = useTheme();
  const statusColor = getStatusColor(status);

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.CARD,
    drop: (item) => onDrop(item.id, status),
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  return (
    <Paper
      ref={drop}
      elevation={0}
      sx={{
        flex: 1,
        minWidth: 300,
        bgcolor: isOver ? alpha(theme.palette[statusColor].main, 0.1) : alpha(theme.palette.background.default, 0.5),
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 3,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        maxHeight: 'calc(100vh - 200px)',
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}`, bgcolor: alpha(theme.palette.background.paper, 0.5) }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ color: `${statusColor}.main` }}>
          {title}
          <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
            ({documents.length})
          </Typography>
        </Typography>
      </Box>

      {/* Cards List */}
      <Box sx={{ p: 2, flexGrow: 1, overflowY: 'auto' }}>
        {documents.map((doc) => (
          <DraggableCard key={doc.pk} document={doc} onViewDetails={onViewDetails} />
        ))}
      </Box>
    </Paper>
  );
};

/**
 * Kanban Board
 */
const DocumentKanban = ({ documents, onViewDetails, onStatusChange }) => {
    // Columns Configuration
    // 2: Novo, 1: Em Tratamento, 4: Em Revisão, 0: Concluído
    const columns = [
        { id: 2, title: 'Novo' },
        { id: 1, title: 'Em Tratamento' },
        { id: 4, title: 'Em Revisão' },
        { id: 0, title: 'Concluído' }
    ];

    const handleDrop = (docId, newStatus) => {
        if (onStatusChange) {
            onStatusChange(docId, newStatus);
        }
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <Box sx={{ 
                display: 'flex', 
                gap: 3, 
                overflowX: 'auto', 
                height: '100%', 
                p: 2,
                alignItems: 'flex-start' 
            }}>
                {columns.map((col) => (
                    <KanbanColumn
                        key={col.id}
                        status={col.id}
                        title={col.title}
                        documents={documents.filter(d => parseInt(d.what) === col.id)}
                        onDrop={handleDrop}
                        onViewDetails={onViewDetails}
                    />
                ))}
            </Box>
        </DndProvider>
    );
};

export default DocumentKanban;
