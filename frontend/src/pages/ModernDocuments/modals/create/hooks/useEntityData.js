import { useState, useEffect } from 'react';
import React, {
    Button,
    Box,
    Typography
} from '@mui/material';
import { getEntityByNIF, updateEntity } from '../../../../../services/entityService';
import { getEntityCountTypes, getDocuments } from '../../../../../services/documentService';
import { notifySuccess, notifyError, notifyWarning, notifyInfo, notifyCustom, toast } from '../../../../../components/common/Toaster/ThemedToaster';

/**
 * Hook para gerenciar dados de entidades e endereços
 * Agora com validações completas do modelo antigo
 */
export const useEntityData = (formData, setFormData) => {
    const [entityData, setEntityData] = useState(null);
    const [representativeData, setRepresentativeData] = useState(null);
    const [isRepresentative, setIsRepresentative] = useState(false);
    const [isDifferentAddress, setIsDifferentAddress] = useState(false);
    const [billingAddress, setBillingAddress] = useState({
        postal: '',
        address: '',
        door: '',
        floor: '',
        nut1: '',
        nut2: '',
        nut3: '',
        nut4: ''
    });
    const [shippingAddress, setShippingAddress] = useState({
        postal: '',
        address: '',
        door: '',
        floor: '',
        nut1: '',
        nut2: '',
        nut3: '',
        nut4: ''
    });
    const [createEntityModalOpen, setCreateEntityModalOpen] = useState(false);
    const [newEntityNipc, setNewEntityNipc] = useState("");
    const [isUpdateNeeded, setIsUpdateNeeded] = useState(false);
    const [entityToUpdate, setEntityToUpdate] = useState(null);
    const [entityDetailOpen, setEntityDetailOpen] = useState(false);
    const [entityCountTypes, setEntityCountTypes] = useState([]);
    const [previousDocuments, setPreviousDocuments] = useState([]);
    const [lastDocument, setLastDocument] = useState(null);

    // Log para debug - monitorar billingAddress
    useEffect(() => {
        console.log("useEntityData - billingAddress atualizado:", billingAddress);
    }, [billingAddress]);

    // Efeito para atualizar EntityCountTypes quando a entidade mudar
    useEffect(() => {
        const fetchEntityData = async () => {
            if (entityData?.pk) {
                console.log("Buscando dados para a entidade:", entityData.pk);
                try {
                    // Buscar contagem de tipos
                    const countTypes = await getEntityCountTypes(entityData.pk);
                    console.log('✅ EntityCountTypes recebidos:', countTypes);

                    // ✅ CORRECÇÃO: Actualizar entityData com os dados de contagem
                    setEntityData(prevEntity => ({
                        ...prevEntity,
                        entityCountTypes: countTypes || []
                    }));

                    setEntityCountTypes(countTypes || []);

                    // Buscar documentos anteriores
                    fetchEntitiesDocuments(entityData.pk);
                } catch (error) {
                    console.error("Erro ao buscar dados da entidade:", error);
                    setEntityCountTypes([]);
                    setPreviousDocuments([]);
                }
            }
        };

        fetchEntityData();
    }, [entityData?.pk]);

    // Função para buscar documentos da entidade usando getDocuments()
    const fetchEntitiesDocuments = async (entityPk) => {
        try {
            const allDocuments = await getDocuments();
            console.log("Todos os documentos:", allDocuments);

            const entityDocuments = allDocuments.filter(doc => {
                return (
                    doc.ts_entity === entityPk ||
                    doc.ts_entity?.pk === entityPk ||
                    doc.entity?.pk === entityPk
                );
            });

            console.log("Documentos da entidade filtrados:", entityDocuments);

            entityDocuments.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.created_at || 0);
                const dateB = new Date(b.createdAt || b.created_at || 0);
                return dateB - dateA;
            });

            setPreviousDocuments(entityDocuments);

            if (entityDocuments.length > 0) {
                setLastDocument(entityDocuments[0]);
                console.log("Último documento definido:", entityDocuments[0]);
            }
        } catch (error) {
            console.error("Erro ao buscar documentos da entidade:", error);
            setPreviousDocuments([]);
            setLastDocument(null);
        }
    };

    // ✅ Validação algorítmica do NIF português
    const isValidNIF = (nif) => {
        if (!nif || nif.length !== 9) return false;

        // Primeiro dígito deve ser válido
        const validFirstDigits = [1, 2, 3, 5, 6, 8, 9];
        if (!validFirstDigits.includes(parseInt(nif[0]))) return false;

        // Algoritmo de verificação
        let total = 0;
        for (let i = 0; i < 8; i++) {
            total += parseInt(nif[i]) * (9 - i);
        }

        const checkDigit = total % 11;
        const expectedDigit = checkDigit < 2 ? 0 : 11 - checkDigit;

        return parseInt(nif[8]) === expectedDigit;
    };

    // ✅ VALIDAÇÃO CRÍTICA: Verificar campos obrigatórios da entidade
    const validateEntityCompleteness = (entity) => {
        // Campos obrigatórios específicos conforme requisito
        const requiredFields = ['phone', 'nut1', 'nut2', 'nut3', 'nut4'];
        const missingFields = [];

        requiredFields.forEach(field => {
            if (!entity[field] || entity[field].toString().trim() === '') {
                missingFields.push(field);
            }
        });

        return {
            isComplete: missingFields.length === 0,
            missingFields,
            isIncomplete: missingFields.length > 0
        };
    };

    // ✅ Verificar dados da entidade pelo NIPC/NIF - ACTUALIZADO
    // Função específica para entidade principal
    const checkEntityData = async (nipc) => {
        console.log("Verificando entidade principal:", nipc);

        if (!isValidNIF(nipc)) {
            notifyError("NIF inválido.");
            setEntityData(null);
            setBillingAddress({
                postal: '', address: '', door: '', floor: '',
                nut1: '', nut2: '', nut3: '', nut4: ''
            });
            return null;
        }

        try {
            const response = await getEntityByNIF(nipc);

            if (!response?.entity) {
                setNewEntityNipc(nipc);
                notifyCustom((t) => (
                    <Box>
                        <Typography variant="body1" gutterBottom>
                            Entidade não encontrada. Criar nova?
                        </Typography>
                        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                            <Button
                                onClick={() => {
                                    setCreateEntityModalOpen(true);
                                    toast.dismiss(t);
                                }}
                                variant="contained"
                                color="primary"
                                size="small"
                                sx={{ mr: 1 }}
                            >
                                Criar Entidade
                            </Button>
                            <Button onClick={() => toast.dismiss(t)} variant="outlined" size="small">
                                Cancelar
                            </Button>
                        </Box>
                    </Box>
                ));
                return null;
            }

            const entity = response.entity;
            const validation = validateEntityCompleteness(entity);

            if (validation.isIncomplete) {
                const fieldLabels = {
                    phone: 'Telefone', nut1: 'Distrito', nut2: 'Concelho',
                    nut3: 'Freguesia', nut4: 'Localidade'
                };
                const missingLabels = validation.missingFields.map(field => fieldLabels[field] || field);

                notifyCustom((t) => (
                    <Box>
                        <Typography variant="body1" gutterBottom><strong>Dados incompletos</strong></Typography>
                        <Typography variant="body2" color="error" gutterBottom sx={{ fontWeight: 'bold' }}>
                            • {missingLabels.join(', ')}
                        </Typography>
                        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                            <Button
                                onClick={() => {
                                    setEntityToUpdate({ ...entity, _isRepresentative: false });
                                    setEntityDetailOpen(true);
                                    toast.dismiss(t);
                                }}
                                variant="contained"
                                color="primary"
                                size="small"
                            >
                                Actualizar Dados
                            </Button>
                        </Box>
                    </Box>
                ), { duration: 0, position: 'top-center' });
                return entity;
            }

            // Entidade completa
            const addressData = {
                postal: entity.postal || "", address: entity.address || "",
                door: entity.door || "", floor: entity.floor || "",
                nut1: entity.nut1 || "", nut2: entity.nut2 || "",
                nut3: entity.nut3 || "", nut4: entity.nut4 || ""
            };

            setEntityData(entity);
            setBillingAddress(addressData);
            setFormData(prev => ({
                ...prev,
                nipc: nipc,
                ...(entity.ts_associate ? { ts_associate: entity.ts_associate } : {})
            }));

            if (!isDifferentAddress) {
                setShippingAddress({ ...addressData });
            }

            notifyInfo(`Entidade: ${entity.name}`);
            return entity;

        } catch (error) {
            console.error("Erro ao verificar entidade:", error);
            notifyError("Erro ao verificar entidade.");
            return null;
        }
    };

    // Função específica para representante
    const checkRepresentativeData = async (nipc) => {
        console.log("Verificando representante:", nipc);

        if (!isValidNIF(nipc)) {
            notifyError("NIF do representante inválido.");
            setRepresentativeData(null);
            setFormData(prev => ({ ...prev, tb_representative: '' }));
            return null;
        }

        try {
            const response = await getEntityByNIF(nipc);

            if (!response?.entity) {
                setNewEntityNipc(nipc);
                notifyCustom((t) => (
                    <Box>
                        <Typography variant="body1" gutterBottom>
                            Representante não encontrado. Criar nova entidade?
                        </Typography>
                        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                            <Button
                                onClick={() => {
                                    setCreateEntityModalOpen(true);
                                    toast.dismiss(t);
                                }}
                                variant="contained"
                                color="primary"
                                size="small"
                                sx={{ mr: 1 }}
                            >
                                Criar Entidade
                            </Button>
                            <Button onClick={() => toast.dismiss(t)} variant="outlined" size="small">
                                Cancelar
                            </Button>
                        </Box>
                    </Box>
                ));
                return null;
            }

            const entity = response.entity;
            const validation = validateEntityCompleteness(entity);

            if (validation.isIncomplete) {
                const fieldLabels = {
                    phone: 'Telefone', nut1: 'Distrito', nut2: 'Concelho',
                    nut3: 'Freguesia', nut4: 'Localidade'
                };
                const missingLabels = validation.missingFields.map(field => fieldLabels[field] || field);

                notifyCustom((t) => (
                    <Box>
                        <Typography variant="body1" gutterBottom><strong>Representante com dados incompletos</strong></Typography>
                        <Typography variant="body2" color="error" gutterBottom sx={{ fontWeight: 'bold' }}>
                            • {missingLabels.join(', ')}
                        </Typography>
                        <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                            <Button
                                onClick={() => {
                                    setEntityToUpdate({ ...entity, _isRepresentative: true });
                                    setEntityDetailOpen(true);
                                    toast.dismiss(t);
                                }}
                                variant="contained"
                                color="primary"
                                size="small"
                            >
                                Actualizar Representante
                            </Button>
                        </Box>
                    </Box>
                ), { duration: 0, position: 'top-center' });
                return entity;
            }

            // Representante completo
            setRepresentativeData(entity);
            setFormData(prev => ({ ...prev, tb_representative: nipc }));
            notifyInfo(`Representante: ${entity.name}`);
            return entity;

        } catch (error) {
            console.error("Erro ao verificar representante:", error);
            notifyError("Erro ao verificar representante.");
            return null;
        }
    };

    // Efeito para pré-preencher dados com base no último documento
    useEffect(() => {
        if (lastDocument && entityData) {
            console.log("Pré-preenchendo dados com base no último documento:", lastDocument);

            setFormData(prev => {
                const newData = { ...prev };

                if (lastDocument.ts_associate) newData.ts_associate = lastDocument.ts_associate;
                if (lastDocument.tt_presentation) newData.tt_presentation = lastDocument.tt_presentation;
                if (lastDocument.tt_type) newData.tt_type = lastDocument.tt_type;

                if (lastDocument.tb_representative) {
                    setIsRepresentative(true);
                    newData.tb_representative = lastDocument.tb_representative;
                    fetchRepresentativeData(lastDocument.tb_representative);
                }

                return newData;
            });

            if (lastDocument.shipping_address &&
                lastDocument.shipping_address !== lastDocument.billing_address) {
                setIsDifferentAddress(true);
            }

            notifyInfo("Dados pré-preenchidos com base no último pedido desta entidade.");
        }
    }, [lastDocument, entityData]);

    // Função auxiliar para buscar dados do representante
    const fetchRepresentativeData = async (representativeId) => {
        try {
            const response = await getEntityByNIF(representativeId);
            if (response && response.entity) {
                setRepresentativeData(response.entity);
            }
        } catch (error) {
            console.error("Erro ao buscar representante:", error);
        }
    };

    // Toggle para representante
    const handleRepresentativeToggle = (e) => {
        setIsRepresentative(e.target.checked);
        if (!e.target.checked) {
            setFormData(prev => ({ ...prev, tb_representative: '' }));
            setRepresentativeData(null);
        }
    };

    // Toggle para endereço diferente
    const handleDifferentAddressToggle = (e) => {
        setIsDifferentAddress(e.target.checked);
        if (!e.target.checked) {
            setShippingAddress({ ...billingAddress });
        } else {
            setShippingAddress({
                postal: '',
                address: '',
                door: '',
                floor: '',
                nut1: '',
                nut2: '',
                nut3: '',
                nut4: ''
            });
        }
    };

    // Handler para criação de entidade bem-sucedida
    const handleCreateEntitySuccess = async (newEntity) => {
        setCreateEntityModalOpen(false);
        if (newEntity) {
            try {
                const response = await getEntityByNIF(newEntity.nipc);
                if (response && response.entity) {
                    const entity = response.entity;
                    const validation = validateEntityCompleteness(entity);

                    if (validation.isIncomplete) {
                        notifyWarning(
                            `A entidade recém-criada possui campos incompletos: ${validation.missingFields.join(', ')}. Complete os dados.`
                        );
                        setEntityToUpdate(entity);
                        setIsUpdateNeeded(true);
                    }

                    const newAddressData = {
                        postal: entity.postal || "",
                        address: entity.address || "",
                        door: entity.door || "",
                        floor: entity.floor || "",
                        nut1: entity.nut1 || "",
                        nut2: entity.nut2 || "",
                        nut3: entity.nut3 || "",
                        nut4: entity.nut4 || "",
                    };

                    // ✅ DETERMINAR CONTEXTO DA CRIAÇÃO
                    const isForRepresentative = newEntityNipc === formData.tb_representative;

                    if (isForRepresentative) {
                        // ✅ NOVA ENTIDADE É REPRESENTANTE
                        setRepresentativeData(entity);
                        setFormData(prev => ({
                            ...prev,
                            tb_representative: entity.nipc
                        }));
                    } else {
                        // ✅ NOVA ENTIDADE É PRINCIPAL
                        setEntityData(entity);
                        setBillingAddress({ ...newAddressData });
                        setFormData(prev => ({
                            ...prev,
                            nipc: entity.nipc,
                            ...(entity.ts_associate ? { ts_associate: entity.ts_associate } : {})
                        }));
                        if (!isDifferentAddress) {
                            setShippingAddress({ ...newAddressData });
                        }
                    }

                    notifySuccess("Entidade criada com sucesso!");
                } else {
                    throw new Error("Falha ao obter os dados da entidade recém-criada");
                }
            } catch (error) {
                console.error("Erro ao processar a entidade recém-criada:", error);
                notifyError("Erro ao processar a entidade recém-criada");
            }
        }
    };

    // Atualizar entidade
    // useEntityData.js - handleEntityUpdate
    const handleEntityUpdate = async (updatedEntity) => {
        try {
            await updateEntity(updatedEntity);

            const validation = validateEntityCompleteness(updatedEntity);
            if (validation.isIncomplete) {
                notifyWarning(`Campos incompletos: ${validation.missingFields.join(', ')}.`);
                return;
            }

            notifySuccess("Entidade actualizada com sucesso.");

            // ✅ CORRECÇÃO: Verificar flag _isRepresentative primeiro
            if (updatedEntity._isRepresentative === true) {
                console.log("Actualizando dados do representante");
                setRepresentativeData(updatedEntity);
            } else {
                console.log("Actualizando dados da entidade principal");
                setEntityData(updatedEntity);

                // Só actualizar endereços para entidade principal
                const addressData = {
                    postal: updatedEntity.postal || "",
                    address: updatedEntity.address || "",
                    door: updatedEntity.door || "",
                    floor: updatedEntity.floor || "",
                    nut1: updatedEntity.nut1 || "",
                    nut2: updatedEntity.nut2 || "",
                    nut3: updatedEntity.nut3 || "",
                    nut4: updatedEntity.nut4 || "",
                };

                setBillingAddress(addressData);

                if (!isDifferentAddress) {
                    setShippingAddress(addressData);
                }
            }

            setEntityDetailOpen(false);
            setIsUpdateNeeded(false);
        } catch (error) {
            notifyError("Erro ao actualizar entidade.");
        }
    };

    return {
        entityData,
        setEntityData,
        representativeData,
        setRepresentativeData,
        isRepresentative,
        isDifferentAddress,
        billingAddress,
        setBillingAddress,
        shippingAddress,
        setShippingAddress,
        entityCountTypes,
        setEntityCountTypes,
        previousDocuments,
        lastDocument,
        createEntityModalOpen,
        setCreateEntityModalOpen,
        newEntityNipc,
        setNewEntityNipc,
        isUpdateNeeded,
        setIsUpdateNeeded,
        entityToUpdate,
        entityDetailOpen,
        setEntityDetailOpen,
        checkEntityData,
        checkRepresentativeData,
        handleRepresentativeToggle,
        handleDifferentAddressToggle,
        handleEntityUpdate,
        handleCreateEntitySuccess,
        validateEntityCompleteness,
        setEntityToUpdate
    };
};