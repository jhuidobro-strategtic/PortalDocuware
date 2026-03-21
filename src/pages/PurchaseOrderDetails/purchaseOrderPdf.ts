import moment from "moment";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import logoTransa from "../../assets/images/logotransa.png";
import { Document } from "../Documents/types";

interface PurchaseOrderPdfDetail {
  purchaseDetailID: number;
  descriptionItem: string;
  quantity: number;
  unitPrice: string;
  total: string;
}

interface PurchaseOrderPdfOrder {
  purchaseOrderID: number;
  orderNo: string;
  supplierID: number;
  documentAssociatedType: number;
  documentAssociatedNo: string;
  paymentCondition: number;
  currency: number;
  guideNo: string;
  store: number;
  purchaseState: number;
  createdBy: number;
  createAt: string;
  details: PurchaseOrderPdfDetail[];
}

interface GeneratePurchaseOrderPdfParams {
  purchaseOrder: PurchaseOrderPdfOrder;
  relatedDocument?: Document | null;
  numberLocale: string;
}

let logoDataUrlPromise: Promise<string> | null = null;

const loadLogoDataUrl = async () => {
  if (!logoDataUrlPromise) {
    logoDataUrlPromise = fetch(logoTransa)
      .then((response) => response.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();

            reader.onloadend = () => resolve(String(reader.result || ""));
            reader.onerror = () =>
              reject(new Error("No fue posible cargar el logo de Transa."));
            reader.readAsDataURL(blob);
          })
      );
  }

  return logoDataUrlPromise;
};

const safeValue = (value: unknown, fallback = "-") => {
  const normalizedValue = String(value ?? "").trim();
  return normalizedValue || fallback;
};

const formatAmount = (value: number | string, numberLocale: string) =>
  Number(value || 0).toLocaleString(numberLocale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const getDocumentTypeLabel = (
  documentAssociatedType: number,
  relatedDocument?: Document | null
) => {
  if (relatedDocument?.documenttype && typeof relatedDocument.documenttype === "object") {
    return safeValue(relatedDocument.documenttype.tipo);
  }

  if (typeof relatedDocument?.documenttype === "number") {
    return safeValue(relatedDocument.documenttype);
  }

  return safeValue(documentAssociatedType);
};

const getPaymentConditionLabel = (paymentCondition: number) => {
  switch (paymentCondition) {
    case 1:
      return "DEPOSITO";
    case 2:
      return "CREDITO";
    case 3:
      return "CONTADO";
    default:
      return safeValue(paymentCondition);
  }
};

const getCurrencyLabel = (currency: number) => {
  switch (currency) {
    case 1:
      return "SOLES";
    case 2:
      return "DOLARES";
    default:
      return safeValue(currency);
  }
};


const drawPageBorder = (doc: jsPDF) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  doc.setDrawColor(0);
  doc.setLineWidth(0.25);
  doc.rect(5, 5, pageWidth - 10, pageHeight - 10);
};
// 
const drawFieldGroup = (
  doc: jsPDF,
  x: number,
  y: number,
  lineHeight: number,
  rows: Array<[string, string]>,
  valueMaxWidth = 86,
  colonOffset = 32
) => {
  rows.forEach(([label, value], index) => {
    const currentY = y + index * lineHeight;
    const wrappedValue = doc.splitTextToSize(value, valueMaxWidth);

    doc.setFont("helvetica", "bold");
    doc.text(label, x, currentY);
    doc.text(":", x + colonOffset, currentY);

    doc.setFont("helvetica", "normal");
    doc.text(wrappedValue, x + colonOffset + 3, currentY);
  });
};

export const generatePurchaseOrderPdf = async ({
  purchaseOrder,
  relatedDocument,
  numberLocale,
}: GeneratePurchaseOrderPdfParams) => {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  drawPageBorder(doc);

  const pageWidth = doc.internal.pageSize.getWidth();
  const logoDataUrl = await loadLogoDataUrl();
  const documentDate = moment(purchaseOrder.createAt);
  const formattedDate = documentDate.isValid()
    ? documentDate.format("DD/MM/YYYY")
    : "-";

  const documentSubtotal = purchaseOrder.details.reduce(
    (sum, detail) => sum + Number(detail.total || 0),
    0
  );
  const documentTax = documentSubtotal * 0.18;
  const documentTotal = documentSubtotal + documentTax;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  doc.rect(5, 5, 84, 18);
  doc.rect(89, 5, 34, 18);
  doc.rect(123, 5, pageWidth - 181, 18);
  doc.rect(pageWidth - 58, 5, 53, 18);

  doc.addImage(logoDataUrl, "PNG", 8, 7, 46, 14);

  doc.setFont("helvetica", "bold");
  doc.text("TRANSPORTES", 106, 11, { align: "center" });
  doc.text("NACIONALES S.A.", 106, 15, { align: "center" });
  doc.text("RUC: 20129605490", 106, 19, { align: "center" });

  doc.setFontSize(16);
  doc.text("ORDEN DE COMPRA", (123 + (pageWidth - 58)) / 2, 16, {
    align: "center",
  });

  doc.setFontSize(8);
  doc.line(pageWidth - 58, 14, pageWidth - 5, 14);
  doc.line(pageWidth - 31.5, 5, pageWidth - 31.5, 23);
  doc.setFont("helvetica", "bold");
  doc.text("NUMERO", pageWidth - 49, 11, { align: "center" });
  doc.text("FECHA", pageWidth - 49, 19, { align: "center" });
  doc.setFont("helvetica", "normal");
  doc.text(
    safeValue(purchaseOrder.orderNo, String(purchaseOrder.purchaseOrderID)),
    pageWidth - 18,
    11,
    {
      align: "center",
    }
  );
  doc.text(formattedDate, pageWidth - 18, 19, {
    align: "center",
  });

  const infoTop = 27;
  const infoHeight = 38;

  doc.rect(5, infoTop, pageWidth - 10, infoHeight);

  drawFieldGroup(doc, 8, 32, 4.4, [
    ["RUC", safeValue(relatedDocument?.suppliernumber)],
    ["RAZON SOCIAL", safeValue(relatedDocument?.suppliername)],
    ["DIRECCION", "-"],
    ["TELEFONO", "-"],
    ["EMAIL", "-"],
    ["CTA. BANCO 1", "-"],
    ["CTA. BANCO 2", "-"],
    ["REQUERIDO POR", safeValue(relatedDocument?.driver, safeValue(purchaseOrder.createdBy))],
  ]);

  drawFieldGroup(doc, 193, 32, 4.4, [
    ["NRO DOC", safeValue(purchaseOrder.documentAssociatedNo)],
    [
      "DOC. ASOCIADO",
      getDocumentTypeLabel(
        purchaseOrder.documentAssociatedType,
        relatedDocument
      ),
    ],
    ["CONDICION DE PAGO", getPaymentConditionLabel(purchaseOrder.paymentCondition)],
    ["UNIDAD MONETARIA", getCurrencyLabel(purchaseOrder.currency)],
    ["GUIA REMISION", safeValue(purchaseOrder.guideNo)],
    ["COTIZACION / PROF.", "-"],
    ["ALMACEN", safeValue(purchaseOrder.store)],
    ["EJECUTADO POR", safeValue(purchaseOrder.createdBy)],
  ], 57, 40);

  autoTable(doc, {
    startY: 68,
    theme: "grid",
    margin: { left: 5, right: 5 },
    styles: {
      font: "helvetica",
      fontSize: 7,
      textColor: 20,
      lineColor: 90,
      lineWidth: 0.15,
      cellPadding: 1.4,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: [235, 235, 235],
      textColor: 0,
      fontStyle: "bold",
    },
    bodyStyles: {
      minCellHeight: 6,
    },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 84 },
      2: { cellWidth: 18, halign: "center" },
      3: { cellWidth: 22, halign: "center" },
      4: { cellWidth: 22, halign: "center" },
      5: { cellWidth: 24, halign: "center" },
      6: { cellWidth: 16, halign: "center" },
      7: { cellWidth: 16, halign: "right" },
      8: { cellWidth: 18, halign: "right" },
      9: { cellWidth: 22, halign: "right" },
    },
    head: [
      [
        "ITEM",
        "DESCRIPCION",
        "CODIGO",
        "COSTO 1",
        "COSTO 2",
        "MARCA",
        "U.M.",
        "CANT.",
        "CU",
        "COSTO TOTAL",
      ],
    ],
    body: purchaseOrder.details.map((detail, index) => [
      String(index + 1),
      safeValue(detail.descriptionItem),
      "-",
      "-",
      "-",
      "-",
      "Unidad",
      formatAmount(detail.quantity, numberLocale),
      formatAmount(detail.unitPrice, numberLocale),
      formatAmount(detail.total, numberLocale),
    ]),
  });

  const finalTableY =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? 60;
  let footerTop = Math.max(finalTableY + 6, 174);

  if (footerTop > 190) {
    doc.addPage();
    drawPageBorder(doc);
    footerTop = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);

  const summaryWidth = 58;
  const signatureHeight = 31;
  const signatureStartX = 5;
  const summaryStartX = pageWidth - 5 - summaryWidth;
  const signatureSectionWidth = summaryStartX - signatureStartX;
  const signatureColumnWidth = signatureSectionWidth / 3;

  doc.rect(signatureStartX, footerTop, signatureSectionWidth, signatureHeight);
  doc.line(
    signatureStartX + signatureColumnWidth,
    footerTop,
    signatureStartX + signatureColumnWidth,
    footerTop + signatureHeight
  );
  doc.line(
    signatureStartX + signatureColumnWidth * 2,
    footerTop,
    signatureStartX + signatureColumnWidth * 2,
    footerTop + signatureHeight
  );
  doc.line(signatureStartX, footerTop + 6, summaryStartX, footerTop + 6);

  doc.text("AUTORIZACION", signatureStartX + 2, footerTop + 4.5);
  doc.text("VB AREA LOGISTICA", signatureStartX + 2, footerTop + 10.5);
  doc.text(
    "VB JEFATURA",
    signatureStartX + signatureColumnWidth + 2,
    footerTop + 10.5
  );
  doc.text(
    "VB GERENCIA",
    signatureStartX + signatureColumnWidth * 2 + 2,
    footerTop + 10.5
  );

  doc.rect(summaryStartX, footerTop, summaryWidth, signatureHeight);
  doc.line(summaryStartX + 28, footerTop, summaryStartX + 28, footerTop + signatureHeight);
  doc.line(summaryStartX, footerTop + 7, summaryStartX + summaryWidth, footerTop + 7);
  doc.line(summaryStartX, footerTop + 14, summaryStartX + summaryWidth, footerTop + 14);
  doc.line(summaryStartX, footerTop + 21, summaryStartX + summaryWidth, footerTop + 21);
  doc.line(summaryStartX, footerTop + 28, summaryStartX + summaryWidth, footerTop + 28);

  const summaryRows: Array<[string, string]> = [
    ["VALOR DE VENTA :", formatAmount(documentSubtotal, numberLocale)],
    ["IGV (18%) :", formatAmount(documentTax, numberLocale)],
    ["DESCUENTO :", ""],
    ["IMPORTE TOTAL :", formatAmount(documentTotal, numberLocale)],
  ];

  summaryRows.forEach(([label, value], index) => {
    const currentY = footerTop + 4.8 + index * 7;

    doc.text(label, summaryStartX + 2, currentY);
    doc.setFont("helvetica", "normal");
    doc.text(value, summaryStartX + summaryWidth - 2, currentY, {
      align: "right",
    });
    doc.setFont("helvetica", "bold");
  });

  doc.save(
    `Orden_C_${safeValue(
      purchaseOrder.orderNo,
      String(purchaseOrder.purchaseOrderID)
    ).replace(/[\\/:*?"<>|]/g, "_")}.pdf`
  );
};
