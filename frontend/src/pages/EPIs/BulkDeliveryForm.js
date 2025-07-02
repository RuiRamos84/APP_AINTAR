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
    TableRow
} from '@mui/material';
import {
    notifySuccess,
    notifyError,
    notifyWarning
} from "../../components/common/Toaster/ThemedToaster";
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { getCurrentDateTime } from '../../utils/dataUtils';

const BulkDeliveryForm = ({
    open,
    onClose,
    onSubmit,
    employees,
    equipmentTypes,
    isEpi,
    selectedEmployee: preSelectedEmployee = "",  // <--- novo
    afterSubmitSuccess                             // <--- novo
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

    // Sempre que a prop "preSelectedEmployee" mudar (por ex. quando trocamos de funcionário),
    // atualizamos o estado local, se o form estiver aberto.
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
                        pndata: getCurrentDateTime(),
                        pnquantity: parseInt(item.pnquantity) || 1,
                        pndim: item.pndim || '',
                        pnmemo: item.pnmemo || '',
                        typeName: item.typeName   // Só para exibir nas notificações
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

                // Chamamos a função de refresh para atualizar o histórico, se existir
                if (afterSubmitSuccess) {
                    afterSubmitSuccess();
                }

                onClose(); // Fecha o formulário
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

        // Mapeamento de tipos para campos de tamanho
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

    // Ao alterar o tipo de item, tentamos obter o tamanho preferencial
    const handleTypeChange = (value) => {
        const preferredSize = getPreferredSize(selectedEmployee, value);
        setCurrentItem(prev => ({
            ...prev,
            pntt_epiwhat: value,
            pndim: preferredSize || prev.pndim
        }));
    };

    // Quando alteramos o selectedEmployee manualmente na combo
    const handleEmployeeChange = (value) => {
        setSelectedEmployee(value);
        // Se já existia um tipo selecionado, voltamos a verificar tamanho
        if (currentItem.pntt_epiwhat) {
            const newPref = getPreferredSize(value, currentItem.pntt_epiwhat);
            setCurrentItem(prev => ({ ...prev, pndim: newPref || '' }));
        }
    };

    // Sempre que a modal fecha, limpamos o form
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
                {isEpi ? 'Entrega Múltipla de EPIs' : 'Entrega Múltipla de Fardamento'}
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
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
                                        <Grid size={{ xs: 12 }} md={4}>
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
                                        <Grid size={{ xs: 12 }} md={2}>
                                            <TextField
                                                label="Tamanho"
                                                value={currentItem.pndim}
                                                onChange={(e) =>
                                                    setCurrentItem((prev) => ({
                                                        ...prev,
                                                        pndim: e.target.value
                                                    }))
                                                }
                                                fullWidth
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12 }} md={2}>
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
                                                InputProps={{ inputProps: { min: 1 } }}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 12 }} md={3}>
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
                                        <Grid size={{ xs: 12 }} md={1}>
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
