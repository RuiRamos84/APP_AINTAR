import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    IconButton,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Alert,
    AlertTitle
} from '@mui/material';
import {
    notifySuccess,
    notifyError,
    notifyWarning
} from "../../components/common/Toaster/ThemedToaster";
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { getCurrentDate } from './dataUtils';

const BulkDeliveryForm = ({
    open,
    onClose,
    onSubmit,
    employees,
    equipmentTypes,
    isEpi,
    selectedEmployee: preSelectedEmployee = "",
    afterSubmitSuccess
}) => {
    const [selectedEmployee, setSelectedEmployee] = useState(preSelectedEmployee);
    const [items, setItems] = useState([]);
    const [currentItem, setCurrentItem] = useState({
        pntt_epiwhat: '',
        pnquantity: "",
        pndim: '',
        pnmemo: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            setSelectedEmployee(preSelectedEmployee);
        }
    }, [preSelectedEmployee, open]);

    const handleAddItem = () => {
        if (currentItem.pntt_epiwhat) {
            const itemType = equipmentTypes.find(
                type => type.pk === currentItem.pntt_epiwhat
            );
            setItems((prev) => [
                ...prev,
                {
                    ...currentItem,
                    typeName: itemType?.value || ''
                }
            ]);
            setCurrentItem({
                pntt_epiwhat: '',
                pnquantity: "",
                pndim: '',
                pnmemo: ''
            });
        }
    };

    const handleRemoveItem = (index) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!selectedEmployee || items.length === 0) {
            notifyWarning("Selecione um funcionário e adicione pelo menos um item");
            return;
        }

        setLoading(true);
        let successCount = 0;

        try {
            for (const item of items) {
                try {
                    const delivery = {
                        pntb_epi: selectedEmployee,
                        pntt_epiwhat: item.pntt_epiwhat,
                        pndata: getCurrentDate(), // CORREÇÃO: Usar apenas a data
                        pnquantity: parseInt(item.pnquantity) || 1,
                        pndim: item.pndim || '',
                        pnmemo: item.pnmemo || '',
                        typeName: item.typeName
                    };

                    await onSubmit(delivery);
                    successCount++;
                } catch (error) {
                    console.error(`Erro ao processar entrega ${item.typeName}:`, error);
                    notifyError(`Erro ao processar entrega de ${item.typeName}: ${error.message}`);
                }
            }

            if (successCount === items.length) {
                notifySuccess("Todas as entregas foram registradas com sucesso");

                if (afterSubmitSuccess) {
                    afterSubmitSuccess();
                }

                onClose();
            } else if (successCount > 0) {
                notifyWarning(`${successCount} de ${items.length} itens foram registrados`);
            } else {
                notifyError("Nenhuma entrega foi registrada");
            }
        } catch (error) {
            console.error("Erro ao processar entregas:", error);
            notifyError(`Erro ao processar entregas: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const getPreferredSize = (employeeId, itemType) => {
        const employee = employees.find(emp => emp.pk === employeeId);
        if (!employee) return '';

        const sizeMap = {
            'Botas': 'shoenumber',
            'Bota': 'shoenumber',
            'Sapatos': 'shoenumber',
            'Galochas': 'shoenumber',
            'Calçado de Segurança': 'shoenumber',
            'T-Shirt': 'tshirt',
            'Sweat': 'sweatshirt',
            'Casaco Refletor': 'jacket',
            'Calças': 'pants'
        };

        const itemTypeName = equipmentTypes.find(t => t.pk === itemType)?.value;
        const sizeField = sizeMap[itemTypeName];
        return sizeField ? employee[sizeField] : '';
    };

    const handleTypeChange = (value) => {
        const preferredSize = getPreferredSize(selectedEmployee, value);
        setCurrentItem(prev => ({
            ...prev,
            pntt_epiwhat: value,
            pndim: preferredSize || prev.pndim
        }));
    };

    const handleEmployeeChange = (value) => {
        setSelectedEmployee(value);
        if (currentItem.pntt_epiwhat) {
            const newPref = getPreferredSize(value, currentItem.pntt_epiwhat);
            setCurrentItem(prev => ({ ...prev, pndim: newPref || '' }));
        }
    };

    const handleSizeChange = (value) => {
        setCurrentItem(prev => ({
            ...prev,
            pndim: value.toUpperCase()
        }));
    };

    useEffect(() => {
        if (!open) {
            setSelectedEmployee("");
            setItems([]);
            setCurrentItem({
                pntt_epiwhat: '',
                pnquantity: "",
                pndim: '',
                pnmemo: ''
            });
        }
    }, [open]);

    const handleClose = () => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="md"
            fullWidth
            aria-labelledby="delivery-form-title"
            keepMounted={false}
            disableEnforceFocus
            disableRestoreFocus
        >
            <DialogTitle id="delivery-form-title">
                {isEpi ? 'Entrega de EPIs' : 'Entrega de Fardamento'}
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid size={{ xs: 12 }}>
                        <Alert severity="info" sx={{ mb: 2 }}>
                            <AlertTitle>Como usar</AlertTitle>
                            Seleccione o funcionário e adicione itens um a um. Os tamanhos preferidos são sugeridos automaticamente.
                            Pode registar múltiplos itens de uma só vez.
                        </Alert>
                    </Grid>

                    <Grid size={{ xs: 12 }}>
                        <FormControl fullWidth>
                            <InputLabel>Funcionário</InputLabel>
                            <Select
                                value={selectedEmployee}
                                onChange={(e) => handleEmployeeChange(e.target.value)}
                                label="Funcionário"
                            >
                                {employees.map((employee) => (
                                    <MenuItem key={employee.pk} value={employee.pk}>
                                        {employee.pk} - {employee.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {selectedEmployee && (
                        <>
                            <Grid size={{ xs: 12 }}>
                                <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid size={{ xs: 12, md: 4 }}>
                                            <FormControl fullWidth>
                                                <InputLabel>
                                                    {isEpi ? 'Tipo de EPI' : 'Tipo de Fardamento'}
                                                </InputLabel>
                                                <Select
                                                    value={currentItem.pntt_epiwhat}
                                                    onChange={(e) => handleTypeChange(e.target.value)}
                                                    label={
                                                        isEpi
                                                            ? 'Tipo de EPI'
                                                            : 'Tipo de Fardamento'
                                                    }
                                                >
                                                    {equipmentTypes.map((type) => (
                                                        <MenuItem key={type.pk} value={type.pk}>
                                                            {type.value}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 2 }}>
                                            <TextField
                                                label="Tamanho"
                                                value={currentItem.pndim}
                                                onChange={(e) => handleSizeChange(e.target.value)}
                                                fullWidth
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 2 }}>
                                            <TextField
                                                type="number"
                                                label="Quantidade"
                                                value={currentItem.pnquantity}
                                                onChange={(e) =>
                                                    setCurrentItem((prev) => ({
                                                        ...prev,
                                                        pnquantity: parseInt(e.target.value) || 1
                                                    }))
                                                }
                                                fullWidth
                                                slotProps={{
                                                    htmlInput: { min: 1 }
                                                }}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 3 }}>
                                            <TextField
                                                label="Observações"
                                                value={currentItem.pnmemo}
                                                onChange={(e) =>
                                                    setCurrentItem((prev) => ({
                                                        ...prev,
                                                        pnmemo: e.target.value
                                                    }))
                                                }
                                                fullWidth
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12, md: 1 }}>
                                            <IconButton
                                                color="primary"
                                                onClick={handleAddItem}
                                                disabled={!currentItem.pntt_epiwhat}
                                            >
                                                <AddIcon />
                                            </IconButton>
                                        </Grid>
                                    </Grid>
                                </Paper>
                            </Grid>

                            {items.length > 0 && (
                                <Grid size={{ xs: 12 }}>
                                    <Table>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Tipo</TableCell>
                                                <TableCell>Tamanho</TableCell>
                                                <TableCell>Quantidade</TableCell>
                                                <TableCell>Observações</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {items.map((item, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{item.typeName}</TableCell>
                                                    <TableCell>{item.pndim}</TableCell>
                                                    <TableCell>{item.pnquantity}</TableCell>
                                                    <TableCell>{item.pnmemo}</TableCell>
                                                    <TableCell>
                                                        <IconButton
                                                            color="error"
                                                            onClick={() => handleRemoveItem(index)}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </Grid>
                            )}
                        </>
                    )}
                </Grid>
            </DialogContent>
            <DialogActions>
                <Button
                    onClick={handleClose}
                    aria-label="Cancelar e fechar formulário"
                >
                    Cancelar
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || !selectedEmployee || items.length === 0}
                    aria-label={loading ? "A Processar..." : "Registrar Entregas"}
                >
                    {loading ? 'A Processar...' : 'Registrar Entregas'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default BulkDeliveryForm;