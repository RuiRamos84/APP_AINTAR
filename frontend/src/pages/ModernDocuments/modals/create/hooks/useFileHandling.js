import { useState, useCallback } from 'react';
import * as pdfjsLib from "pdfjs-dist";
import { notifyError } from '../../../../../components/common/Toaster/ThemedToaster';

/**
 * Hook para gerenciar manipulação de arquivos e pagamentos
 * @param {Object} formData - Dados do formulário
 * @param {Function} setFormData - Função para atualizar dados do formulário
 * @returns {Object} Estados e funções para gerenciar arquivos e pagamentos
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
                return "/icons/excel-icon.png"; // Substituir pelo caminho real do ícone
            } else if (file.type.includes('word') || file.type.includes('document')) {
                return "/icons/word-icon.png"; // Substituir pelo caminho real do ícone
            } else {
                return "/icons/file-icon.png"; // Substituir pelo caminho real do ícone
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

    // Manipuladores para arquivos
    const onAddFiles = useCallback(async (newFiles) => {
        if (newFiles.length + formData.files.length > 5) {
            notifyError("Máximo de 5 arquivos permitidos.");
            return;
        }

        const filesWithPreview = await Promise.all(
            newFiles.map(async (file) => ({
                file,
                preview: await generateFilePreview(file),
                description: ""
            }))
        );

        setFormData(prev => ({
            ...prev,
            files: [
                ...prev.files,
                ...filesWithPreview
            ]
        }));
    }, [formData.files, setFormData]);

    const onRemoveFile = (index) => {
        setFormData(prev => {
            const updatedFiles = [...prev.files];
            updatedFiles.splice(index, 1);
            return { ...prev, files: updatedFiles };
        });
    };

    const onUpdateDescription = (index, description) => {
        setFormData(prev => {
            const updatedFiles = [...prev.files];
            updatedFiles[index] = {
                ...updatedFiles[index],
                description
            };
            return { ...prev, files: updatedFiles };
        });
    };

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