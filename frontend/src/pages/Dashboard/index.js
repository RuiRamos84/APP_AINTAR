import React from 'react';
import { Box, useTheme } from '@mui/material';
import { useSearchParams } from 'react-router-dom';
import DashboardResumo from './DashboardResumo';
import DashboardModern from './DashboardModern';

const DashboardWrapper = () => {
    const theme = useTheme();
    const [searchParams] = useSearchParams();
    const isGeral = searchParams.get('tab') === 'geral';

    return (
        <Box sx={{
            backgroundColor: theme.palette.background.default,
            ...(isGeral
                ? { minHeight: '100vh' }
                : { height: 'calc(100vh - 40px)', overflow: 'hidden' }
            )
        }}>
            {isGeral ? <DashboardModern /> : <DashboardResumo />}
        </Box>
    );
};

export default DashboardWrapper;

// Manter a versão antiga disponível para fallback se necessário
export { default as DashboardLegacy } from './Dashboard';
