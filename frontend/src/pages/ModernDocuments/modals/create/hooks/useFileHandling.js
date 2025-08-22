import { useState, useCallback } from 'react';
import * as pdfjsLib from "pdfjs-dist";
import { notifyError } from '../../../../../components/common/Toaster/ThemedToaster';

/**
 * Hook para gerenciar manipulação de arquivos e pagamentos
 */
export const useFileHandling = (formData, setFormData) => {
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentInfo, setPaymentInfo] = useState({
        reference: '',
        amount: '',
        date: '',
        proof: null
    });

    // Geração de thumbnail para PDFs
    const generatePDFThumbnail = async (file) => {
        try {
            const loadingTask = pdfjsLib.getDocument(URL.createObjectURL(file));
            const pdf = await loadingTask.promise;
            const page = await pdf.getPage(1);
            const viewport = page.getViewport({ scale: 0.5 });
            const canvas = window.document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const context = canvas.getContext("2d");
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            return canvas.toDataURL();
        } catch (error) {
            console.error("Erro ao gerar thumbnail do PDF:", error);
            return null;
        }
    };

    // Função para gerar preview de arquivo
    const generateFilePreview = async (file) => {
        if (file.type === "application/pdf") {
            return await generatePDFThumbnail(file);
        } else if (file.type.startsWith("image/")) {
            return URL.createObjectURL(file);
        } else {
            // Retornar ícone apropriado com base no tipo de arquivo
            if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
                return "/icons/excel-icon.png";
            } else if (file.type.includes('word') || file.type.includes('document')) {
                return "/icons/word-icon.png";
            } else {
                return "/icons/file-icon.png";
            }
        }
    };

    // Handler para upload de comprovativo de pagamento
    const handlePaymentProofUpload = (file) => {
        setPaymentInfo(prev => ({
            ...prev,
            proof: file
        }));
    };

    // Handler para mudanças no pagamento
    const handlePaymentMethodChange = (e) => {
        setPaymentMethod(e.target.value);
    };

    const handlePaymentChange = (e) => {
        const { name, value } = e.target;
        setPaymentInfo(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // ✅ CORRECÇÃO: Adicionar ficheiros com preview
    const onAddFiles = useCallback(async (newFiles) => {
        console.log('📁 Adicionando ficheiros:', newFiles.length);

        if (newFiles.length + formData.files.length > 5) {
            notifyError("Máximo de 5 arquivos permitidos.");
            return;
        }

        const filesWithPreview = await Promise.all(
            newFiles.map(async (file, index) => {
                console.log(`📄 Processando ficheiro ${index + 1}:`, file.name);
                return {
                    file,
                    preview: await generateFilePreview(file),
                    description: "" // ✅ Inicializar vazio
                };
            })
        );

        console.log('📁 Ficheiros processados:', filesWithPreview);

        setFormData(prev => ({
            ...prev,
            files: [
                ...prev.files,
                ...filesWithPreview
            ]
        }));
    }, [formData.files, setFormData]);

    // ✅ CORRECÇÃO: Remover ficheiro
    const onRemoveFile = useCallback((index) => {
        console.log('🗑️ Removendo ficheiro no índice:', index);

        setFormData(prev => {
            const updatedFiles = [...prev.files];

            // Liberar URL do objeto para economizar memória
            if (updatedFiles[index]?.preview) {
                URL.revokeObjectURL(updatedFiles[index].preview);
            }

            updatedFiles.splice(index, 1);

            console.log('📁 Ficheiros após remoção:', updatedFiles.length);

            return { ...prev, files: updatedFiles };
        });
    }, [setFormData]);

    // ✅ CORRECÇÃO CRÍTICA: Actualizar descrição
    const onUpdateDescription = useCallback((index, description) => {
        console.log(`📝 Actualizando descrição índice ${index}:`, description);

        setFormData(prev => {
            const updatedFiles = [...prev.files];

            if (updatedFiles[index]) {
                updatedFiles[index] = {
                    ...updatedFiles[index],
                    description: description
                };

                console.log(`✅ Descrição actualizada para ficheiro ${index}:`, updatedFiles[index]);
            } else {
                console.warn(`⚠️ Ficheiro no índice ${index} não encontrado`);
            }

            return { ...prev, files: updatedFiles };
        });
    }, [setFormData]);

    return {
        paymentMethod,
        setPaymentMethod,
        paymentInfo,
        setPaymentInfo,
        onAddFiles,
        onRemoveFile,
        onUpdateDescription,
        handlePaymentMethodChange,
        handlePaymentChange,
        handlePaymentProofUpload
    };
};