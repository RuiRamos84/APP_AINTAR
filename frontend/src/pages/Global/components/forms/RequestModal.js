// frontend/src/pages/Global/components/forms/RequestModal.js

import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SimpleRequestForm from './SimpleRequestForm';
import MassRequestManager from './MassRequestManager';

const MASS_REQUEST_TYPES = [
    'etar_desmatacao', 'etar_retirada_lamas',
    'ee_desmatacao', 'ee_retirada_lamas'
];

const RequestModal = ({ open, onClose, requestType, areaId }) => {
    const isMassRequest = MASS_REQUEST_TYPES.includes(requestType);

    const handleSuccess = () => {
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
            {/* <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Criar Pedido
                <IconButton onClick={onClose}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle> */}

            <DialogContent>
                {isMassRequest ? (
                    <MassRequestManager areaId={areaId} requestType={requestType} onSuccess={handleSuccess} />
                ) : (
                    <SimpleRequestForm areaId={areaId} requestType={requestType} onSuccess={handleSuccess} />
                )}
            </DialogContent>
        </Dialog>
    );
};

export default RequestModal;