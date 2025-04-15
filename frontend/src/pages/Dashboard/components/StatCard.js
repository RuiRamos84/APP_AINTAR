import React from 'react';
import { Card, CardContent, Box, Typography, alpha, Grow } from '@mui/material';

/**
 * Componente de cartão estatístico
 * 
 * @param {Object} props - Propriedades do componente
 * @param {React.ReactNode} props.icon - Ícone a ser exibido
 * @param {string} props.title - Título do cartão
 * @param {string} props.value - Valor principal
 * @param {string} props.color - Cor do cartão
 * @param {number} props.delay - Atraso da animação
 * @param {boolean} props.animationComplete - Se a animação está completa
 * @returns {React.ReactElement}
 */
const StatCard = ({ 
  icon, 
  title, 
  value, 
  color, 
  delay = 0, 
  animationComplete = true
}) => (
  <Grow in={animationComplete} timeout={300 + delay * 150}>
    <Card
      sx={{
        height: "100%",
        transition: "all 0.3s",
        "&:hover": {
          transform: "translateY(-5px)",
          boxShadow: 6,
        },
        borderLeft: `5px solid ${color}`,
      }}
    >
      <CardContent>
        <Box display="flex" alignItems="center">
          <Box
            sx={{
              p: 1.5,
              borderRadius: "12px",
              bgcolor: alpha(color, 0.1),
              mr: 2,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {React.cloneElement(icon, { sx: { color } })}
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {value}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  </Grow>
);

export default StatCard;
