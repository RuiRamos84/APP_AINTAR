import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Serviço para gerar PDFs no frontend a partir de HTML renderizado
 */
class PDFService {
  /**
   * Gera PDF a partir de um elemento HTML
   * @param {HTMLElement} element - Elemento HTML para converter
   * @param {string} filename - Nome do arquivo PDF (sem extensão)
   * @param {Object} options - Opções de configuração
   * @returns {Promise<Blob>} - Promise com o Blob do PDF gerado
   */
  async generatePDF(element, filename = 'documento', options = {}) {
    const defaultOptions = {
      margin: [20, 20, 20, 20], // [top, left, bottom, right] em mm
      filename: `${filename}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2, // Maior qualidade
        useCORS: true, // Permitir carregar imagens de outras origens
        logging: false,
        letterRendering: true
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
      // Gerar PDF como Blob
      const pdf = await html2pdf()
        .set(mergedOptions)
        .from(element)
        .outputPdf('blob');

      return pdf;
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      throw new Error('Falha ao gerar PDF: ' + error.message);
    }
  }

  /**
   * Gera PDF a partir de HTML string
   * @param {string} htmlString - String HTML para converter
   * @param {string} filename - Nome do arquivo PDF
   * @param {Object} options - Opções de configuração
   * @returns {Promise<Blob>} - Promise com o Blob do PDF gerado
   */
  async generatePDFFromHTML(htmlString, filename = 'documento', options = {}) {
    // Criar elemento temporário
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlString;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    document.body.appendChild(tempDiv);

    try {
      const blob = await this.generatePDF(tempDiv, filename, options);
      return blob;
    } finally {
      // Remover elemento temporário
      document.body.removeChild(tempDiv);
    }
  }

  /**
   * Gera PDF de emissão com configurações específicas
   * Suporta multi-página automaticamente se conteúdo for maior que uma página A4
   * @param {HTMLElement} element - Elemento com o conteúdo da emissão
   * @param {string} emissionNumber - Número da emissão
   * @returns {Promise<Blob>} - Promise com o Blob do PDF gerado
   */
  async generateEmissionPDF(element, emissionNumber) {
    console.log('[PDFService] Usando método DIRETO html2canvas + jsPDF (multi-página)');

    const safeNumber = emissionNumber.replace(/\//g, '_').replace(/-/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const filename = `${safeNumber}_${timestamp}.pdf`;

    try {
      // Usar html2canvas DIRETAMENTE para capturar TODO o conteúdo
      console.log('[PDFService] Capturando elemento com html2canvas...');
      const canvas = await html2canvas(element, {
        scale: 2, // Alta qualidade
        useCORS: true,
        allowTaint: true,
        logging: false,
        letterRendering: true,
        backgroundColor: '#ffffff',
        // Capturar dimensões reais do elemento, não apenas viewport
        width: element.offsetWidth,
        height: element.offsetHeight
      });

      console.log('[PDFService] Canvas gerado:', canvas.width, 'x', canvas.height, 'pixels');

      // A4 dimensions em mm
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10; // Margens de 10mm

      // Calcular dimensões da área útil
      const contentWidth = pdfWidth - (2 * margin);
      const contentHeight = pdfHeight - (2 * margin);

      // Criar PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Calcular quantas páginas são necessárias
      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      console.log('[PDFService] Tamanho da imagem no PDF:', imgWidth, 'x', imgHeight, 'mm');

      // Se cabe numa página, adicionar diretamente
      if (imgHeight <= contentHeight) {
        console.log('[PDFService] Conteúdo cabe em 1 página');
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);

        // Adicionar numeração: "1 de 1"
        pdf.setFontSize(8);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`1 de 1`, pdfWidth - margin - 20, pdfHeight - 5, { align: 'right' });

      } else {
        // Multi-página: dividir o canvas em pedaços
        const totalPages = Math.ceil(imgHeight / contentHeight);
        console.log(`[PDFService] Conteúdo requer ${totalPages} páginas`);

        // Converter canvas para imagem uma vez só
        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage();
          }

          // Calcular offset vertical para esta página
          const yOffset = -(page * contentHeight);

          // Adicionar imagem com offset
          pdf.addImage(imgData, 'JPEG', margin, margin + yOffset, imgWidth, imgHeight);

          // Adicionar numeração automática: "X de Y"
          pdf.setFontSize(8);
          pdf.setTextColor(0, 0, 0);
          pdf.text(`${page + 1} de ${totalPages}`, pdfWidth - margin - 20, pdfHeight - 5, { align: 'right' });

          console.log(`[PDFService] Página ${page + 1}/${totalPages} adicionada (com numeração)`);
        }
      }

      console.log('[PDFService] PDF criado com sucesso');

      // Retornar como blob
      return pdf.output('blob');

    } catch (error) {
      console.error('[PDFService] Erro:', error);
      throw error;
    }
  }

  /**
   * Converte Blob em File
   * @param {Blob} blob - Blob do PDF
   * @param {string} filename - Nome do arquivo
   * @returns {File} - File object
   */
  blobToFile(blob, filename) {
    return new File([blob], filename, { type: 'application/pdf' });
  }

  /**
   * Download do PDF (para testes)
   * @param {Blob} blob - Blob do PDF
   * @param {string} filename - Nome do arquivo
   */
  downloadPDF(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

export default new PDFService();
