import { useState, useEffect } from 'react';
import {
    Button,
    Box,
    Typography
} from '@mui/material';
import { getEntityByNIF, updateEntity } from '../../../../../services/entityService';
import { getEntityCountTypes, getDocuments } from '../../../../../services/documentService';
import { notifySuccess, notifyError, notifyWarning, notifyInfo, notifyCustom, toast } from '../../../../../components/common/Toaster/ThemedToaster';

/**
 * Hook para gerenciar dados de entidades e endereços
 * @param {Object} formData - Dados do formulário
 * @param {Function} setFormData - Função para atualizar os dados do formulário
 * @returns {Object} Estados e funções para gerenciar entidades
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
    }, [entityData]);

    // Função para buscar documentos da entidade usando getDocuments()
    const fetchEntitiesDocuments = async (entityPk) => {
        try {
            // Buscar todos os documentos e filtrar pelo pk da entidade
            const allDocuments = await getDocuments();
            console.log("Todos os documentos:", allDocuments);

            // Filtrar os documentos que pertencem à entidade específica
            const entityDocuments = allDocuments.filter(doc => {
                return (
                    doc.ts_entity === entityPk ||
                    doc.ts_entity?.pk === entityPk ||
                    doc.entity?.pk === entityPk
                );
            });

            console.log("Documentos da entidade filtrados:", entityDocuments);

            // Ordenar por data de criação (mais recentes primeiro)
            entityDocuments.sort((a, b) => {
                const dateA = new Date(a.createdAt || a.created_at || 0);
                const dateB = new Date(b.createdAt || b.created_at || 0);
                return dateB - dateA;
            });

            setPreviousDocuments(entityDocuments);

            // Definir o documento mais recente
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

    // Efeito para pré-preencher dados com base no último documento
    useEffect(() => {
        if (lastDocument && entityData) {
            console.log("Pré-preenchendo dados com base no último documento:", lastDocument);

            // Pré-preencher dados com base no último documento
            setFormData(prev => {
                const newData = { ...prev };

                // Preencher apenas se os valores existirem no último documento
                if (lastDocument.ts_associate) newData.ts_associate = lastDocument.ts_associate;
                if (lastDocument.tt_presentation) newData.tt_presentation = lastDocument.tt_presentation;
                if (lastDocument.tt_type) newData.tt_type = lastDocument.tt_type;

                // Verificar se há representante
                if (lastDocument.tb_representative) {
                    setIsRepresentative(true);
                    newData.tb_representative = lastDocument.tb_representative;
                    // Buscar dados do representante
                    fetchRepresentativeData(lastDocument.tb_representative);
                }

                return newData;
            });

            // Verificar se tem morada de entrega diferente
            if (lastDocument.shipping_address &&
                lastDocument.shipping_address !== lastDocument.billing_address) {
                setIsDifferentAddress(true);
                // Seria necessário buscar os dados da morada de entrega para preencher
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

    // Verificar dados da entidade pelo NIPC/NIF
    const checkEntityData = async (nipc, isRep = false) => {
        console.log("Verificando entidade com NIPC/NIF:", nipc, "isRep:", isRep);
        try {
            const response = await getEntityByNIF(nipc);
            console.log("Resposta da verificação:", response.entity);
            if (!response || !response.entity) {
                setNewEntityNipc(nipc);
                notifyCustom((t) => (
                    <Box>
                        <Typography variant="body1" gutterBottom>
                            Entidade não encontrada. Deseja criar uma nova?
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
                            <Button
                                onClick={() => toast.dismiss(t)}
                                variant="outlined"
                                size="small"
                            >
                                Cancelar
                            </Button>
                        </Box>
                    </Box>
                ));
                return;
            }

            const entity = response.entity;
            console.log("Entidade encontrada:", entity);

            const isIncomplete =
                !entity.nut1 ||
                !entity.nut2 ||
                !entity.nut3 ||
                !entity.nut4 ||
                !entity.address ||
                !entity.postal;

            if (isIncomplete) {
                notifyWarning(
                    "A entidade possui campos incompletos. Por favor, atualize os dados."
                );
                setEntityToUpdate(entity);
                setIsUpdateNeeded(true);
                return;
            }

            // Criar objeto de endereço explicitamente com os campos esperados pelo ModernAddressForm
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

            console.log("Dados de endereço obtidos:", addressData);

            if (isRep) {
                setRepresentativeData(entity);
                setFormData(prev => ({
                    ...prev,
                    tb_representative: nipc
                }));
                notifyInfo(
                    `NIF do representante inserido corresponde a - ${entity.name}`
                );
            } else {
                // Primeiro atualizamos os dados da entidade
                setEntityData(entity);

                // Depois atualizamos explicitamente o billingAddress com uma nova referência de objeto
                console.log("Configurando billingAddress com:", addressData);
                setBillingAddress(addressData);

                setFormData(prev => ({
                    ...prev,
                    nipc: nipc,
                    ...(entity.ts_associate ? { ts_associate: entity.ts_associate } : {})
                }));

                // Se não tiver endereço diferente, atualizar também o shippingAddress
                if (!isDifferentAddress) {
                    setShippingAddress({ ...addressData });
                }

                notifyInfo(`NIF inserido corresponde a - ${entity.name}`);
            }
        } catch (error) {
            console.error("Erro ao verificar entidade:", error);
            notifyError("Erro ao verificar os dados da entidade.");
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
            // Limpar os dados da morada de envio se marcar como diferente
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
                // Buscar os dados completos da entidade recém-criada
                const response = await getEntityByNIF(newEntity.nipc);
                if (response && response.entity) {
                    const entity = response.entity;
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

                    if (isRepresentative) {
                        setRepresentativeData(entity);
                        setFormData(prev => ({
                            ...prev,
                            tb_representative: entity.nipc
                        }));
                    } else {
                        setEntityData(entity);
                        setBillingAddress({ ...newAddressData });
                        setFormData(prev => ({
                            ...prev,
                            nipc: entity.nipc,
                            // Se a entidade tiver um associado padrão, pré-preencher
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
    const handleEntityUpdate = async (updatedEntity) => {
        try {
            await updateEntity(updatedEntity);
            notifySuccess("Entidade atualizada com sucesso.");
            setEntityData(updatedEntity);
            const updatedBillingAddress = {
                postal: updatedEntity.postal || "",
                address: updatedEntity.address || "",
                door: updatedEntity.door || "",
                floor: updatedEntity.floor || "",
                nut1: updatedEntity.nut1 || "",
                nut2: updatedEntity.nut2 || "",
                nut3: updatedEntity.nut3 || "",
                nut4: updatedEntity.nut4 || "",
            };

            // Usar cópia explícita para garantir mudança de referência
            setBillingAddress({ ...updatedBillingAddress });

            setFormData(prevDocument => ({
                ...prevDocument,
                nipc: updatedEntity.nipc,
                // Se a entidade atualizada tiver um associado, atualizar no formulário
                ...(updatedEntity.ts_associate ? { ts_associate: updatedEntity.ts_associate } : {})
            }));

            if (!isDifferentAddress) {
                setShippingAddress({ ...updatedBillingAddress });
            }

            setEntityDetailOpen(false);
            setIsUpdateNeeded(false);
        } catch (error) {
            notifyError("Erro ao atualizar entidade.");
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
        isUpdateNeeded,
        setIsUpdateNeeded,
        entityToUpdate,
        entityDetailOpen,
        setEntityDetailOpen,
        checkEntityData,
        handleRepresentativeToggle,
        handleDifferentAddressToggle,
        handleEntityUpdate,
        handleCreateEntitySuccess
    };
};