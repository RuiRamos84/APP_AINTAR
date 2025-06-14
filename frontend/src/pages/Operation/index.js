import React from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import DesktopView from './containers/DesktopView';
import TabletView from './containers/TabletView';

const Operation = () => {
    const theme = useTheme();
    const isTablet = useMediaQuery(theme.breakpoints.down('xl'));

    return isTablet ? <TabletView /> : <DesktopView />;
};

export default Operation;