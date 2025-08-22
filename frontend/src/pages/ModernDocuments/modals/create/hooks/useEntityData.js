// useEntityData.js - CORRIGIDO

import { Box, Button, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { notifyCustom, notifyError, notifyInfo, notifySuccess, notifyWarning, toast } from '../../../../../components/common/Toaster/ThemedToaster';
import { getDocuments, getEntityCountTypes } from '../../../../../services/documentService';
import { getEntityByNIF, updateEntity } from '../../../../../services/entityService';

export const useEntityData = (formData, setFormData) => {
    // Estados separados para entidade principal e representante
    const [entityData, setEntityData] = useState(null);
    const [representativeData, setRepresentativeData] = useState(null);

    // Estados de configuração
    const [isRepresentative, setIsRepresentative] = useState(false);
    const [isDifferentAddress, setIsDifferentAddress] = useState(false);

    // Endereços (sempre baseados na entidade PRINCIPAL)
    const [billingAddress, setBillingAddress] = useState({
        postal: '', address: '', door: '', floor: '',
        nut1: '', nut2: '', nut3: '', nut4: ''
    });
    const [shippingAddress, setShippingAddress] = useState({
        postal: '', address: '', door: '', floor: '',
        nut1: '', nut2: '', nut3: '', nut4: ''
    });

    // Estados de UI
    const [createEntityModalOpen, setCreateEntityModalOpen] = useState(false);
    const [newEntityNipc, setNewEntityNipc] = useState("");
    const [isUpdateNeeded, setIsUpdateNeeded] = useState(false);
    const [entityToUpdate, setEntityToUpdate] = useState(null);
    const [entityDetailOpen, setEntityDetailOpen] = useState(false);

    // Estados de dados derivados
    const [entityCountTypes, setEntityCountTypes] = useState([]);
    const [previousDocuments, setPreviousDocuments] = useState([]);
    const [lastDocument, setLastDocument] = useState(null);

    // ✅ CRÍTICO: Validação NIF português
    const isValidNIF = (nif) => {
        if (!nif || nif.length !== 9) return false;
        const validFirstDigits = [1, 2, 3, 5, 6, 8, 9];
        if (!validFirstDigits.includes(parseInt(nif[0]))) return false;

        let total = 0;
        for (let i = 0; i < 8; i++) {
            total += parseInt(nif[i]) * (9 - i);
        }
        const checkDigit = total % 11;
        const expectedDigit = checkDigit < 2 ? 0 : 11 - checkDigit;
        return parseInt(nif[8]) === expectedDigit;
    };

    // ✅ CRÍTICO: Validação campos obrigatórios
    const validateEntityCompleteness = (entity) => {
        const requiredFields = ['phone', 'nut1', 'nut2', 'nut3', 'nut4'];
        const missingFields = requiredFields.filter(field => {
            const value = entity[field];
            if (!value || value.toString().trim() === '') return true;

            if (field === 'phone') {
                const phone = value.toString().replace(/\s/g, '');
                return !/^[29]\d{8}$/.test(phone) && !/^\d{9,}$/.test(phone);
            }

            return false;
        });

        return {
            validateEntityCompleteness,
            isComplete: missingFields.length === 0,
            missingFields,
            isIncomplete: missingFields.length > 0
        };
    };

    // ✅ CRÍTICO: Função específica para entidade PRINCIPAL
    const checkEntityData = async (nipc) => {
        console.log("🏢 Verificando entidade PRINCIPAL:", nipc);

        if (!isValidNIF(nipc)) {
            notifyError("NIF inválido.");
            setEntityData(null);
            // ✅ Limpar endereços quando entidade é inválida
            resetAddresses();
            return null;
        }

        try {
            const response = await getEntityByNIF(nipc);

            if (!response?.entity) {
                // ✅ Entidade não encontrada - oferecer criação
                handleEntityNotFound(nipc, false); // false = não é representante
                return null;
            }

            const entity = response.entity;
            const validation = validateEntityCompleteness(entity);

            if (validation.isIncomplete) {
                // ✅ Entidade incompleta - oferecer actualização
                handleIncompleteEntity(entity, validation, false); // false = não é representante
                return entity;
            }

            // ✅ Entidade completa - aplicar dados
            applyEntityData(entity);
            notifyInfo(`Entidade: ${entity.name}`);
            return entity;

        } catch (error) {
            console.error("❌ Erro ao verificar entidade:", error);
            notifyError("Erro ao verificar entidade.");
            return null;
        }
    };

    // ✅ CRÍTICO: Função específica para REPRESENTANTE
    const checkRepresentativeData = async (nipc) => {
        console.log("👤 Verificando REPRESENTANTE:", nipc);

        if (!isValidNIF(nipc)) {
            notifyError("NIF do representante inválido.");
            setRepresentativeData(null);
            setFormData(prev => ({ ...prev, tb_representative: '' }));
            return null;
        }

        try {
            const response = await getEntityByNIF(nipc);

            if (!response?.entity) {
                // ✅ Representante não encontrado - oferecer criação
                handleEntityNotFound(nipc, true); // true = é representante
                return null;
            }

            const entity = response.entity;
            const validation = validateEntityCompleteness(entity);

            if (validation.isIncomplete) {
                // ✅ Representante incompleto - oferecer actualização
                handleIncompleteEntity(entity, validation, true); // true = é representante
                return entity;
            }

            // ✅ Representante completo - aplicar apenas aos dados do representante
            setRepresentativeData(entity);
            setFormData(prev => ({ ...prev, tb_representative: nipc }));
            notifyInfo(`Representante: ${entity.name}`);
            return entity;

        } catch (error) {
            console.error("❌ Erro ao verificar representante:", error);
            notifyError("Erro ao verificar representante.");
            return null;
        }
    };

    // ✅ FUNÇÃO: Aplicar dados da entidade PRINCIPAL (endereços, etc.)
    const applyEntityData = (entity) => {
        console.log("📍 Aplicando dados da entidade principal");

        // ✅ Definir entidade
        setEntityData(entity);

        // ✅ Extrair dados de endereço
        const addressData = {
            postal: entity.postal || "",
            address: entity.address || "",
            door: entity.door || "",
            floor: entity.floor || "",
            nut1: entity.nut1 || "",
            nut2: entity.nut2 || "",
            nut3: entity.nut3 || "",
            nut4: entity.nut4 || "",
        };

        // ✅ Aplicar endereços
        setBillingAddress(addressData);
        if (!isDifferentAddress) {
            setShippingAddress({ ...addressData });
        }

        // ✅ Actualizar form data
        setFormData(prev => ({
            ...prev,
            nipc: entity.nipc,
            ...(entity.ts_associate ? { ts_associate: entity.ts_associate } : {})
        }));
    };

    // ✅ FUNÇÃO: Reset endereços
    const resetAddresses = () => {
        const emptyAddress = {
            postal: '', address: '', door: '', floor: '',
            nut1: '', nut2: '', nut3: '', nut4: ''
        };
        setBillingAddress(emptyAddress);
        setShippingAddress(emptyAddress);
    };

    // ✅ FUNÇÃO: Gerir entidade não encontrada
    const handleEntityNotFound = (nipc, isRepresentative) => {
        const entityType = isRepresentative ? "Representante" : "Entidade";

        setNewEntityNipc(nipc);
        notifyCustom((t) => (
            <Box>
                <Typography variant="body1" gutterBottom>
                    {entityType} não encontrada. Criar nova?
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
                        Criar {entityType}
                    </Button>
                    <Button onClick={() => toast.dismiss(t)} variant="outlined" size="small">
                        Cancelar
                    </Button>
                </Box>
            </Box>
        ));
    };

    // ✅ FUNÇÃO: Gerir entidade incompleta
    const handleIncompleteEntity = (entity, validation, isRepresentative) => {
        const entityType = isRepresentative ? "Representante" : "Entidade";
        const fieldLabels = {
            phone: 'Telefone', nut1: 'Distrito', nut2: 'Concelho',
            nut3: 'Freguesia', nut4: 'Localidade'
        };
        const missingLabels = validation.missingFields.map(field => fieldLabels[field] || field);

        notifyCustom((t) => (
            <Box>
                <Typography variant="body1" gutterBottom>
                    <strong>{entityType} com dados incompletos</strong>
                </Typography>
                <Typography variant="body2" color="error" gutterBottom sx={{ fontWeight: 'bold' }}>
                    • {missingLabels.join(', ')}
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                    <Button
                        onClick={() => {
                            // ✅ CRÍTICO: Marcar o tipo de entidade sendo actualizada
                            setEntityToUpdate({ ...entity, _isRepresentative: isRepresentative });
                            setEntityDetailOpen(true);
                            toast.dismiss(t);
                        }}
                        variant="contained"
                        color="primary"
                        size="small"
                    >
                        Actualizar {entityType}
                    </Button>
                </Box>
            </Box>
        ), { duration: 0, position: 'top-center' });
    };

    // ✅ FUNÇÃO: Handler para actualização de entidades
    const handleEntityUpdate = async (updatedEntity) => {
        try {
            await updateEntity(updatedEntity);

            const validation = validateEntityCompleteness(updatedEntity);
            if (validation.isIncomplete) {
                notifyWarning(`Campos incompletos: ${validation.missingFields.join(', ')}.`);
                return;
            }

            notifySuccess("Entidade actualizada com sucesso.");

            // ✅ CRÍTICO: Aplicar actualização baseada no tipo
            if (updatedEntity._isRepresentative === true) {
                console.log("📝 Actualizando dados do representante");
                setRepresentativeData(updatedEntity);
            } else {
                console.log("📝 Actualizando dados da entidade principal");
                // ✅ Para entidade principal, aplicar todos os dados (incluindo endereços)
                applyEntityData(updatedEntity);
            }

            setEntityDetailOpen(false);
            setIsUpdateNeeded(false);
        } catch (error) {
            notifyError("Erro ao actualizar entidade.");
        }
    };

    // ✅ FUNÇÃO: Handler para criação de entidade
    const handleCreateEntitySuccess = async (newEntity) => {
        setCreateEntityModalOpen(false);
        if (!newEntity) return;

        try {
            const response = await getEntityByNIF(newEntity.nipc);
            if (!response?.entity) {
                throw new Error("Falha ao obter os dados da entidade recém-criada");
            }

            const entity = response.entity;
            const validation = validateEntityCompleteness(entity);

            if (validation.isIncomplete) {
                notifyWarning(
                    `A entidade recém-criada possui campos incompletos: ${validation.missingFields.join(', ')}. Complete os dados.`
                );
                setEntityToUpdate(entity);
                setIsUpdateNeeded(true);
            }

            // ✅ CRÍTICO: Determinar se é para representante ou entidade principal
            const isForRepresentative = newEntityNipc === formData.tb_representative;

            if (isForRepresentative) {
                // ✅ Nova entidade é representante
                setRepresentativeData(entity);
                setFormData(prev => ({ ...prev, tb_representative: entity.nipc }));
            } else {
                // ✅ Nova entidade é principal - aplicar todos os dados
                applyEntityData(entity);
            }

            notifySuccess("Entidade criada com sucesso!");
        } catch (error) {
            console.error("Erro ao processar a entidade recém-criada:", error);
            notifyError("Erro ao processar a entidade recém-criada");
        }
    };

    // ✅ Efeito para buscar dados derivados (apenas da entidade principal)
    useEffect(() => {
        const fetchEntityData = async () => {
            if (entityData?.pk) {
                console.log("📊 Buscando dados derivados para entidade:", entityData.pk);
                try {
                    const countTypes = await getEntityCountTypes(entityData.pk);
                    setEntityData(prevEntity => ({
                        ...prevEntity,
                        entityCountTypes: countTypes || []
                    }));
                    setEntityCountTypes(countTypes || []);
                    fetchEntitiesDocuments(entityData.pk);
                } catch (error) {
                    console.error("❌ Erro ao buscar dados da entidade:", error);
                    setEntityCountTypes([]);
                    setPreviousDocuments([]);
                }
            }
        };

        fetchEntityData();
    }, [entityData?.pk]);

    // ✅ Função para buscar documentos da entidade
    const fetchEntitiesDocuments = async (entityPk) => {
        try {
            const allDocuments = await getDocuments();
            const entityDocuments = allDocuments.filter(doc => {
                return (
                    doc.ts_entity === entityPk ||
                    doc.ts_entity?.pk === entityPk ||
                    doc.entity?.pk === entityPk
                );
            });

            entityDocuments.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.created_at || 0);
                const dateB = new Date(b.createdAt || b.created_at || 0);
                return dateB - dateA;
            });

            setPreviousDocuments(entityDocuments);
            if (entityDocuments.length > 0) {
                setLastDocument(entityDocuments[0]);
            }
        } catch (error) {
            console.error("❌ Erro ao buscar documentos da entidade:", error);
            setPreviousDocuments([]);
            setLastDocument(null);
        }
    };

    // ✅ Handlers de toggle
    const handleRepresentativeToggle = (e) => {
        setIsRepresentative(e.target.checked);
        if (!e.target.checked) {
            setFormData(prev => ({ ...prev, tb_representative: '' }));
            setRepresentativeData(null);
        }
    };

    const handleDifferentAddressToggle = (e) => {
        setIsDifferentAddress(e.target.checked);
        if (!e.target.checked) {
            setShippingAddress({ ...billingAddress });
        } else {
            setShippingAddress({
                postal: '', address: '', door: '', floor: '',
                nut1: '', nut2: '', nut3: '', nut4: ''
            });
        }
    };

    return {
        // Estados principais
        entityData,
        setEntityData,
        representativeData,
        setRepresentativeData,

        // Estados de configuração
        isRepresentative,
        isDifferentAddress,

        // Endereços (sempre da entidade principal)
        billingAddress,
        setBillingAddress,
        shippingAddress,
        setShippingAddress,

        // Dados derivados
        entityCountTypes,
        setEntityCountTypes,
        previousDocuments,
        lastDocument,

        // Estados de UI
        createEntityModalOpen,
        setCreateEntityModalOpen,
        newEntityNipc,
        setNewEntityNipc,
        isUpdateNeeded,
        setIsUpdateNeeded,
        entityToUpdate,
        entityDetailOpen,
        setEntityDetailOpen,

        // Funções principais
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