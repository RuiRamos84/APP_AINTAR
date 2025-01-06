import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getEntity } from "../../services/entityService"; // Supondo que esta função exista

const calculateDuration = (start, stop, currentDateTime) => {
  if (!start) return "";
  const formatDate = (dateString) => {
    const [date, time] = dateString.split(" às ");
    return new Date(`${date}T${time}:00`);
  };
  const startTime = formatDate(start);
  const stopTime = stop ? formatDate(stop) : currentDateTime; // Use a data/hora atual se stop for nulo
  const duration = (stopTime - startTime) / 1000; // duração em segundos
  const days = Math.floor(duration / (3600 * 24));
  const hours = Math.floor((duration % (3600 * 24)) / 3600);
  const minutes = Math.floor((duration % 3600) / 60);

  let result = "";
  if (days > 0) {
    result += `${days}d `;
  }
  if (hours > 0) {
    result += `${hours}h `;
  }
  if (minutes > 0 || result === "") {
    result += `${minutes}m`;
  }
  if (!stop) {
    result += ` (até ${currentDateTime.toLocaleString()})`;
  }

  return result.trim();
};

export const generatePDF = async (document, steps, anexos, metaData) => {
  const doc = new jsPDF("landscape");
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  let columnWidth = (pageWidth - 4 * margin) / 3;
  let currentY = 30;
  const currentDateTime = new Date();

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Detalhes do Pedido - ${document.regnumber}`,
    pageWidth / 2,
    15,
    null,
    null,
    "center"
  );

  // Adicionar data de impressão ao cabeçalho
  // doc.setFontSize(10);
  // doc.setFont("helvetica", "normal");
  // doc.text(
  //   `Data de Impressão: ${currentDateTime.toLocaleString()}`,
  //   margin,
  //   25
  // );

  const addField = (title, value, x, y, maxWidth) => {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(title, x, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(String(value) || "", maxWidth);
    doc.text(lines, x + 33, y);
    return y + lines.length * 7;
  };

  const drawColumn = (title, fields, x, y, width) => {
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(title, x, y);
    y += 10;
    fields.forEach((field) => {
      y = addField(field.title, field.value, x, y, width - 33);
    });
    return y;
  };

  const formatAddress = (address, door, floor, postal, nut4, nut3) => {
    const addressParts = [
      address,
      door && `Porta: ${door}`,
      floor && `Andar: ${floor}`,
      postal,
      nut4,
      nut3,
    ];
    return addressParts.filter((part) => part).join(", ");
  };

  const memoText = doc.splitTextToSize(
    String(document.memo) || "",
    columnWidth
  );
  const observationsHeight = memoText.length * 7;
  const observationsNeedToMove =
    observationsHeight > pageHeight - currentY - 30;

  let representative = null;
  if (document.tb_representative) {
    try {
      const response = await getEntity(document.tb_representative);
      representative = response.data.entity;
    } catch (error) {
      console.error("Erro ao buscar dados do representante:", error);
    }
  }

  const generalInfoFields = [
    { title: "Requerente:", value: document.ts_entity },
    { title: "Número Fiscal:", value: document.nipc },
    { title: "Contacto:", value: document.phone },
    {
      title: "Morada:",
      value: formatAddress(
        document.address,
        document.door,
        document.floor,
        document.postal,
        document.nut4,
        document.nut3
      ),
    },
    representative && {
      title: "Representante:",
      value: `${representative.name} (NIF: ${representative.nipc})`,
    },
  ].filter(Boolean);

  if (observationsNeedToMove) {
    columnWidth = (pageWidth - 3 * margin) / 2;
    currentY = drawColumn(
      "Informações Gerais",
      generalInfoFields,
      margin,
      currentY,
      columnWidth
    );

    let detailsY = drawColumn(
      "Detalhes de Submissão",
      [
        { title: "Data:", value: document.submission },
        { title: "Tipo:", value: document.tt_type },
        {
          title: "Associado:",
          value: findMetaValue(
            metaData.associates,
            "name",
            document.ts_associate
          ),
        },
        {
          title: "Criado por:",
          value: findMetaValue(metaData.who, "username", document.creator),
        },
        {
          title: "Assignado:",
          value: findMetaValue(metaData.who, "name", document.who),
        },
        {
          title: "Estado:",
          value: findMetaValue(metaData.what, "step", document.what),
        },
      ],
      margin + columnWidth + margin,
      30,
      columnWidth
    );

    currentY = Math.max(currentY, detailsY);
    currentY += 10;
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Observações", margin, currentY);
    currentY += 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const fullWidthText = doc.splitTextToSize(
      String(document.memo) || "",
      pageWidth - 2 * margin
    );
    doc.text(fullWidthText, margin, currentY);
    currentY += fullWidthText.length * 7;
  } else {
    currentY = drawColumn(
      "Informações Gerais",
      generalInfoFields,
      margin,
      currentY,
      columnWidth
    );

    let detailsY = drawColumn(
      "Detalhes de Submissão",
      [
        { title: "Data:", value: document.submission },
        { title: "Tipo:", value: document.tt_type },
        {
          title: "Associado:",
          value: findMetaValue(
            metaData.associates,
            "name",
            document.ts_associate
          ),
        },
        {
          title: "Assignado:",
          value: findMetaValue(metaData.who, "name", document.who),
        },
        {
          title: "Criado por:",
          value: findMetaValue(metaData.who, "username", document.creator),
        },
        {
          title: "Estado:",
          value: findMetaValue(metaData.what, "step", document.what),
        },
      ],
      margin + columnWidth + margin,
      30,
      columnWidth
    );

    currentY = Math.max(currentY, detailsY);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Observações", margin + 2 * (columnWidth + margin), 30);
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text(memoText, margin + 2 * (columnWidth + margin), 40);
  }

  currentY += 20;
  if (currentY + 30 > pageHeight) {
    doc.addPage();
    currentY = margin;
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Passos", margin, currentY);
  currentY += 3;

  autoTable(doc, {
    startY: currentY,
    head: [["Início", "Fim", "Duração", "Quem", "Observações"]],
    body: steps.map((step) => [
      formatValue(step.when_start),
      formatValue(step.when_stop),
      calculateDuration(step.when_start, step.when_stop, currentDateTime),
      formatValue(findMetaValue(metaData.who, "username", step.who)),
      formatValue(step.memo),
    ]),
  });

  currentY = doc.lastAutoTable.finalY + 20;
  if (currentY + 30 > pageHeight) {
    doc.addPage();
    currentY = margin;
  }

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Anexos", margin, currentY);
  currentY += 3;

  autoTable(doc, {
    startY: currentY,
    head: [["Data", "Nome do Arquivo", "Descrição"]],
    body: anexos.map((anexo) => [
      formatValue(anexo.data),
      formatValue(anexo.filename),
      formatValue(anexo.descr),
    ]),
  });

  doc.save(`Pedido_${document.regnumber}.pdf`);
};

const findMetaValue = (metaArray, key, value) => {
  const meta = metaArray.find(
    (item) => item.pk === value || item[key] === value
  );
  return meta ? meta.name || meta.step : value;
};

const formatValue = (value) => {
  return value !== null && value !== undefined ? String(value) : "";
};
