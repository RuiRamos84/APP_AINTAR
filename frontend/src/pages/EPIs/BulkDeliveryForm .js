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
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { getCurrentDateTime } from '../../utils/dataUtils';

const BulkDeliveryForm = ({
    open,
    onClose,
    onSubmit,
    employees,
    equipmentTypes,
    isEpi
}) => {
    const [selectedEmployee, setSelectedEmployee] = useState("");
    const [items, setItems] = useState([]);
    const [currentItem, setCurrentItem] = useState({
        pntt_epiwhat: '',
        pnquantity: "",
        pndim: '',
        pnmemo: ''
    });
    const [loading, setLoading] = useState(false);

    const handleAddItem = () => {
        if (currentItem.pntt_epiwhat) {
            const itemType = equipmentTypes.find(type => type.pk === currentItem.pntt_epiwhat);
            setItems([...items, {
                ...currentItem,
                typeName: itemType?.value || ''
            }]);
            setCurrentItem({
                pntt_epiwhat: '',
                pnquantity: "",
                pndim: '',
                pnmemo: ''
            });
        }
    };

    const handleRemoveItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!selectedEmployee || items.length === 0) return;

        try {
            setLoading(true);
            const deliveries = items.map(item => ({
                ...item,
                pntb_epi: selectedEmployee,
                pndata: getCurrentDateTime()
            }));
            await onSubmit(deliveries);
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const getEmployeePreference = (employeeId, field) => {
        const employee = employees.find(emp => emp.pk === employeeId);
        return employee ? employee[field] : '';
    };

    const getPreferredSize = (employeeId, itemType) => {
        const employee = employees.find(emp => emp.pk === employeeId);
        if (!employee) return '';

        // Mapeamento de tipos para campos de tamanho
        const sizeMap = {
            'Botas': 'shoenumber',
            'Bota': 'shoenumber',
            'Sapato': 'shoenumber',
            'Galochas': 'shoenumber',
            'Calçado de Segurança': 'shoenumber',
            'T-Shirt': 'tshirt',
            'Sweatshirt': 'sweatshirt',
            'Casaco': 'jacket',
            'Calças': 'pants'
        };

        const itemTypeName = equipmentTypes.find(t => t.pk === itemType)?.value;
        const sizeField = sizeMap[itemTypeName];
        return sizeField ? employee[sizeField] : '';
    };

    // No evento de alteração do tipo de item:
    const handleTypeChange = (value) => {
        const preferredSize = getPreferredSize(selectedEmployee, value);
        setCurrentItem(prev => ({
            ...prev,
            pntt_epiwhat: value,
            pndim: preferredSize || prev.pndim
        }));
    };

    useEffect(() => {
        if (selectedEmployee && currentItem.pntt_epiwhat) {
            const preferredSize = getPreferredSize(selectedEmployee, currentItem.pntt_epiwhat);
            setCurrentItem(prev => ({
                ...prev,
                pndim: preferredSize || ''
            }));
        }
    }, [selectedEmployee, currentItem.pntt_epiwhat]);

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

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {isEpi ? 'Entrega Múltipla de EPIs' : 'Entrega Múltipla de Fardamento'}
            </DialogTitle>
            <DialogContent>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={12}>
                        <FormControl fullWidth>
                            <InputLabel>Funcionário</InputLabel>
                            <Select
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                label="Funcionário"
                            >
                                {employees.map((employee) => (
                                    <MenuItem key={employee.pk} value={employee.pk}>
                                        {employee.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>

                    {selectedEmployee && (
                        <>
                            <Grid item xs={12}>
                                <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
                                    <Grid container spacing={2} alignItems="center">
                                        <Grid item xs={12} md={4}>
                                            <FormControl fullWidth>
                                                <InputLabel>{isEpi ? 'Tipo de EPI' : 'Tipo de Fardamento'}</InputLabel>
                                                <Select
                                                    value={currentItem.pntt_epiwhat}
                                                    onChange={(e) => handleTypeChange(e.target.value)}
                                                    label={isEpi ? 'Tipo de EPI' : 'Tipo de Fardamento'}
                                                >
                                                    {equipmentTypes.map((type) => (
                                                        <MenuItem key={type.pk} value={type.pk}>
                                                            {type.value}
                                                        </MenuItem>
                                                    ))}
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid item xs={12} md={2}>
                                            <TextField
                                                label="Tamanho"
                                                value={currentItem.pndim}
                                                onChange={(e) => setCurrentItem(prev => ({
                                                    ...prev,
                                                    pndim: e.target.value
                                                }))}
                                                fullWidth
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={2}>
                                            <TextField
                                                type="number"
                                                label="Quantidade"
                                                value={currentItem.pnquantity}
                                                onChange={(e) => setCurrentItem(prev => ({
                                                    ...prev,
                                                    pnquantity: parseInt(e.target.value) || 1
                                                }))}
                                                fullWidth
                                                InputProps={{ inputProps: { min: 1 } }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={3}>
                                            <TextField
                                                label="Observações"
                                                value={currentItem.pnmemo}
                                                onChange={(e) => setCurrentItem(prev => ({
                                                    ...prev,
                                                    pnmemo: e.target.value
                                                }))}
                                                fullWidth
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={1}>
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
                                <Grid item xs={12}>
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
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    disabled={loading || !selectedEmployee || items.length === 0}
                >
                    {loading ? 'A Processar...' : 'Registrar Entregas'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default BulkDeliveryForm;