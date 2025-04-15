import React from 'react';
import { Card, CardContent, Box, Typography, Divider, Zoom } from '@mui/material';
import ViewToggle from './ViewToggle';

/**
 * Componente de cartão para gráficos
 * 
 * @param {Object} props - Propriedades do componente
 * @param {string} props.title - Título do cartão
 * @param {React.ReactNode} props.children - Conteúdo do cartão
 * @param {number} props.height - Altura do conteúdo
 * @param {string} props.subtitle - Subtítulo opcional
 * @param {boolean} props.viewToggle - Se deve mostrar os botões de alternar visualização
 * @param {string} props.viewName - Nome da view
 * @param {string} props.currentViewType - Tipo atual de visualização
 * @param {Function} props.onViewTypeChange - Função para mudar o tipo de visualização
 * @param {boolean} props.animationComplete - Se a animação está completa
 * @returns {React.ReactElement}
 */
const ChartCard = ({ 
  title, 
  children, 
  height = 360, 
  subtitle, 
  viewToggle = false, 
  viewName = '', 
  currentViewType = '', 
  onViewTypeChange,
  animationComplete = true
}) => (
  <Zoom in={animationComplete} timeout={500}>
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s",
        "&:hover": {
          boxShadow: 4,
        },
      }}
    >
      <CardContent sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">
            {title}
          </Typography>
          {viewToggle && onViewTypeChange && (
            <ViewToggle 
              viewName={viewName} 
              currentViewType={currentViewType} 
              onViewTypeChange={onViewTypeChange} 
            />
          )}
        </Box>
        
        {subtitle && (
          <Typography variant="caption" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        <Divider sx={{ my: 2 }} />
        <Box 
          sx={{ 
            flex: 1, 
            height: height, 
            minHeight: height,
            width: "100%", 
            position: "relative"
          }}
        >
          {children}
        </Box>
      </CardContent>
    </Card>
  </Zoom>
);

export default ChartCard;
