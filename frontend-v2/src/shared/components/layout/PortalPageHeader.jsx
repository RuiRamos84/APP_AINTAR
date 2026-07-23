import { Box, Container, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { easingTokensFramer, durationTokens } from '@/styles/tokens';

export const PortalPageHeader = ({ title, subtitle, actions }) => {
  return (
    <Box
      component={motion.div}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: durationTokens.base / 1000, ease: easingTokensFramer.out }}
      sx={{
        bgcolor: 'background.paper',
        borderBottom: '1px solid',
        borderColor: 'divider',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            py: 3,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Accent bar */}
            <Box
              sx={{
                width: 3,
                height: 28,
                bgcolor: 'secondary.main',
                borderRadius: 1,
                flexShrink: 0,
              }}
            />
            <Box>
              <Typography variant="h5" fontWeight={800}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
          </Box>
          {actions && <Box>{actions}</Box>}
        </Box>
      </Container>
    </Box>
  );
};

export default PortalPageHeader;
