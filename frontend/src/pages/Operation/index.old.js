import React from 'react';
import { Toaster } from 'react-hot-toast';
import OperationErrorBoundary from './components/common/OperationErrorBoundary';
import TabletView from './containers/TabletView';

const Operation = () => {
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
            <TabletView />
        </OperationErrorBoundary>
    );
};

export default Operation;