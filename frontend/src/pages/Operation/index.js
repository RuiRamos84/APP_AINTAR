import React from 'react';
import { useMediaQuery, useTheme } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import OperationErrorBoundary from './components/common/OperationErrorBoundary';
import DesktopView from './containers/DesktopView';
import TabletView from './containers/TabletView';

const Operation = () => {
    const theme = useTheme();
    const isTablet = useMediaQuery(theme.breakpoints.down('xl'));

    return (
        <OperationErrorBoundary>
            <Toaster
                position="top-right"
                gutter={8}
                toastOptions={{
                    duration: 4000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    }
                }}
            />
            {isTablet ? <TabletView /> : <DesktopView />}
        </OperationErrorBoundary>
    );
};

export default Operation;