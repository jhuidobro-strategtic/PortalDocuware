import {
  BarcodeFormat,
  BinaryBitmap,
  DecodeHintType,
  GlobalHistogramBinarizer,
  HybridBinarizer,
  InvertedLuminanceSource,
  MultiFormatReader,
  RGBLuminanceSource,
} from "@zxing/library";
import jsQR from "jsqr";

import { ParsedExpenseVoucherQr } from "../shared/types";

type BarcodeDetectorResult = {
  rawValue?: string;
};

type BarcodeDetectorLike = {
  detect: (
    source: ImageBitmap | HTMLCanvasElement | OffscreenCanvas
  ) => Promise<BarcodeDetectorResult[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => BarcodeDetectorLike;

type ExpenseVoucherScanSource = "qr" | "pdf-text";

type ParsedExpenseVoucherCandidate = Partial<
  Omit<ParsedExpenseVoucherQr, "rawValue">
>;

type CropScanConfig = {
  heightRatio: number;
  maxDimension?: number;
  widthRatio: number;
  x: number;
  y: number;
};

const getBarcodeDetector = () =>
  (window as unknown as {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }).BarcodeDetector;

const PDF_MIME_TYPES = new Set(["application/pdf", "application/x-pdf"]);
const PDF_WORKER_PUBLIC_PATH = `${
  process.env.PUBLIC_URL ? process.env.PUBLIC_URL.replace(/\/$/, "") : ""
}/pdf.worker.min.js`;
const QR_HINTS = new Map<DecodeHintType, any>([
  [DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]],
  [DecodeHintType.TRY_HARDER, true],
]);
let pdfJsPromise: Promise<typeof import("pdfjs-dist/legacy/build/pdf")> | null = null;

const normalizeAmount = (value: string) => {
  const trimmedValue = value.trim().replace(/\s+/g, "");

  if (!trimmedValue) {
    return "";
  }

  if (/^\d{1,3}(\.\d{3})+,\d+$/.test(trimmedValue)) {
    return trimmedValue.replace(/\./g, "").replace(",", ".");
  }

  if (/^\d{1,3}(,\d{3})+\.\d+$/.test(trimmedValue)) {
    return trimmedValue.replace(/,/g, "");
  }

  if (/^\d+,\d+$/.test(trimmedValue)) {
    return trimmedValue.replace(",", ".");
  }

  return trimmedValue;
};

const decodeValue = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const extractSunatPipePayload = (rawValue: string) => {
  const trimmedValue = rawValue.trim();
  const directCandidate = decodeValue(trimmedValue);

  if (directCandidate.includes("|")) {
    return directCandidate;
  }

  if (!/^https?:\/\//i.test(trimmedValue)) {
    return directCandidate;
  }

  try {
    const url = new URL(trimmedValue);
    const urlCandidates = [
      ...Array.from(url.searchParams.values()),
      url.pathname,
      url.hash.replace(/^#/, ""),
    ]
      .map((candidate) => decodeValue(candidate))
      .filter(Boolean);

    return urlCandidates.find((candidate) => candidate.includes("|")) || directCandidate;
  } catch {
    return directCandidate;
  }
};

export const parseExpenseVoucherQr = (
  rawValue: string
): ParsedExpenseVoucherQr | null => {
  const payload = extractSunatPipePayload(rawValue);

  if (!payload.includes("|")) {
    return null;
  }

  const parts = payload.split("|").map((item) => item.trim());
  const supplierRuc = parts[0]?.replace(/\D/g, "") || "";
  const sunatDocumentType = parts[1] || "";
  const seriesNumber = parts[2]?.toUpperCase() || "";
  const voucherNumber = parts[3] || "";
  const igvAmount = normalizeAmount(parts[4] || "");
  const amount = normalizeAmount(parts[5] || parts[4] || "");

  if (supplierRuc.length !== 11 || !seriesNumber || !voucherNumber || !amount) {
    return null;
  }

  return {
    rawValue: payload,
    supplierRuc,
    sunatDocumentType,
    seriesNumber,
    voucherNumber,
    igvAmount,
    amount,
  };
};

const buildParsedExpenseVoucherData = (
  candidate: ParsedExpenseVoucherCandidate
): ParsedExpenseVoucherQr | null => {
  const supplierRuc = candidate.supplierRuc?.replace(/\D/g, "") || "";
  const seriesNumber = candidate.seriesNumber?.trim().toUpperCase() || "";
  const voucherNumber = candidate.voucherNumber?.trim() || "";
  const amount = normalizeAmount(candidate.amount || "");

  if (supplierRuc.length !== 11 || !seriesNumber || !voucherNumber || !amount) {
    return null;
  }

  const sunatDocumentType = candidate.sunatDocumentType?.trim() || "";
  const igvAmount = normalizeAmount(candidate.igvAmount || "");
  const rawValue = [
    supplierRuc,
    sunatDocumentType,
    seriesNumber,
    voucherNumber,
    igvAmount,
    amount,
  ].join("|");

  return {
    rawValue,
    supplierRuc,
    sunatDocumentType,
    seriesNumber,
    voucherNumber,
    igvAmount,
    amount,
  };
};

const normalizeTextContent = (value: string) =>
  value.replace(/\s+/g, " ").replace(/\s+([:;,.])/g, "$1").trim();

const extractFirstMatch = (value: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const match = value.match(pattern);

    if (match?.[1]) {
      return match[1].trim();
    }
  }

  return "";
};

const extractLastMatch = (value: string, patterns: RegExp[]) => {
  for (const pattern of patterns) {
    const matches = Array.from(value.matchAll(pattern));

    if (matches.length > 0) {
      const lastMatch = matches[matches.length - 1];

      if (lastMatch?.[1]) {
        return lastMatch[1].trim();
      }
    }
  }

  return "";
};

const extractAllMatches = (value: string, patterns: RegExp[]) => {
  const matches: string[] = [];

  for (const pattern of patterns) {
    for (const match of Array.from(value.matchAll(pattern))) {
      if (match?.[1]) {
        const nextValue = match[1].trim();

        if (nextValue && !matches.includes(nextValue)) {
          matches.push(nextValue);
        }
      }
    }
  }

  return matches;
};

const inferDocumentTypeFromText = (value: string, seriesNumber = "") => {
  if (/FACTURA\s+ELECTR[OÓ]NICA/i.test(value) || /^F/i.test(seriesNumber)) {
    return "01";
  }

  if (/BOLETA\s+ELECTR[OÓ]NICA/i.test(value) || /^B/i.test(seriesNumber)) {
    return "03";
  }

  if (/NOTA\s+DE\s+CR[EÉ]DITO/i.test(value)) {
    return "07";
  }

  if (/NOTA\s+DE\s+D[EÉ]BITO/i.test(value)) {
    return "08";
  }

  return "";
};

const extractVoucherDataFromFileName = (
  fileName: string
): ParsedExpenseVoucherCandidate => {
  const normalizedFileName = fileName.replace(/\.[^.]+$/, "");
  const match = normalizedFileName.match(
    /(\d{11})[-_\s]+(\d{2})[-_\s]+([A-Z0-9]{3,5})[-_\s]+(\d{1,12})/i
  );

  if (!match) {
    return {};
  }

  return {
    supplierRuc: match[1],
    sunatDocumentType: match[2],
    seriesNumber: match[3],
    voucherNumber: match[4],
  };
};

const extractVoucherDataFromText = (rawText: string, fileName = "") => {
  const normalizedText = normalizeTextContent(rawText);
  const fileNameCandidate = extractVoucherDataFromFileName(fileName);
  const seriesMatch =
    normalizedText.match(/\b([A-Z][A-Z0-9]{2,4})\s*-\s*([0-9]{1,12})\b/) ||
    normalizedText.match(
      /\bSERIE[:\s-]*([A-Z0-9]{3,5})\b[\s\S]{0,60}?\b(?:NRO|NUMERO|NÚMERO)[:\s-]*([0-9]{1,12})\b/i
    );
  const supplierRucCandidates = extractAllMatches(normalizedText, [
    /\bRUC(?:\s+NRO\.?)?[:\s-]*([0-9]{11})\b/gi,
    /\b([0-9]{11})\b/g,
  ]);
  const supplierRuc =
    fileNameCandidate.supplierRuc ||
    supplierRucCandidates.find((candidate) => candidate.length === 11) ||
    "";
  const seriesNumber =
    seriesMatch?.[1]?.trim().toUpperCase() || fileNameCandidate.seriesNumber || "";
  const voucherNumber =
    seriesMatch?.[2]?.trim() || fileNameCandidate.voucherNumber || "";
  const igvAmount = extractLastMatch(normalizedText, [
    /\bIGV[:\s-]*([0-9]+(?:[.,][0-9]{2,3})?)\b/i,
    /\bI\.?G\.?V\.?[:\s-]*([0-9]+(?:[.,][0-9]{2,3})?)\b/i,
  ]);
  const amount = extractFirstMatch(normalizedText, [
    /\bImporte\s+Total[:\s-]*([0-9]+(?:[.,][0-9]{2,3})?)\b/i,
    /\bTotal\s+a\s+Pagar[:\s-]*([0-9]+(?:[.,][0-9]{2,3})?)\b/i,
    /\bMonto\s+Total[:\s-]*([0-9]+(?:[.,][0-9]{2,3})?)\b/i,
    /\bImporte[:\s-]*([0-9]+(?:[.,][0-9]{2,3})?)\b/i,
  ]);
  const sunatDocumentType =
    inferDocumentTypeFromText(normalizedText, seriesNumber) ||
    fileNameCandidate.sunatDocumentType ||
    "";

  return buildParsedExpenseVoucherData({
    supplierRuc,
    sunatDocumentType,
    seriesNumber,
    voucherNumber,
    igvAmount,
    amount,
  });
};

const getScaledDimensions = (width: number, height: number, maxDimension: number) => {
  const longestSide = Math.max(width, height);
  const ratio = longestSide > maxDimension ? maxDimension / longestSide : 1;

  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
};

const createCanvas = (width: number, height: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

const getCanvasContext = (canvas: HTMLCanvasElement) => {
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("Unable to prepare the image for QR detection.");
  }

  return context;
};

const renderBitmapToCanvas = (
  bitmap: ImageBitmap,
  width: number,
  height: number,
  rotation: 0 | 90 | 180 | 270
) => {
  const isVerticalRotation = rotation === 90 || rotation === 270;
  const canvas = createCanvas(
    isVerticalRotation ? height : width,
    isVerticalRotation ? width : height
  );
  const context = getCanvasContext(canvas);

  context.save();
  context.clearRect(0, 0, canvas.width, canvas.height);

  if (rotation === 90) {
    context.translate(canvas.width, 0);
    context.rotate(Math.PI / 2);
  } else if (rotation === 180) {
    context.translate(canvas.width, canvas.height);
    context.rotate(Math.PI);
  } else if (rotation === 270) {
    context.translate(0, canvas.height);
    context.rotate(-Math.PI / 2);
  }

  context.drawImage(bitmap, 0, 0, width, height);
  context.restore();

  return canvas;
};

const cloneImageData = (imageData: ImageData) =>
  new ImageData(
    new Uint8ClampedArray(imageData.data),
    imageData.width,
    imageData.height
  );

const applyGrayscaleContrast = (imageData: ImageData, contrast = 1.55) => {
  const nextImageData = cloneImageData(imageData);
  const pixelData = nextImageData.data;

  for (let index = 0; index < pixelData.length; index += 4) {
    const luminance =
      pixelData[index] * 0.299 +
      pixelData[index + 1] * 0.587 +
      pixelData[index + 2] * 0.114;
    const contrasted = Math.max(
      0,
      Math.min(255, (luminance - 128) * contrast + 128)
    );

    pixelData[index] = contrasted;
    pixelData[index + 1] = contrasted;
    pixelData[index + 2] = contrasted;
  }

  return nextImageData;
};

const applyThreshold = (imageData: ImageData) => {
  const nextImageData = cloneImageData(imageData);
  const pixelData = nextImageData.data;
  let luminanceSum = 0;

  for (let index = 0; index < pixelData.length; index += 4) {
    luminanceSum +=
      pixelData[index] * 0.299 +
      pixelData[index + 1] * 0.587 +
      pixelData[index + 2] * 0.114;
  }

  const averageLuminance = luminanceSum / (pixelData.length / 4);
  const threshold = Math.max(90, Math.min(190, averageLuminance));

  for (let index = 0; index < pixelData.length; index += 4) {
    const luminance =
      pixelData[index] * 0.299 +
      pixelData[index + 1] * 0.587 +
      pixelData[index + 2] * 0.114;
    const color = luminance >= threshold ? 255 : 0;

    pixelData[index] = color;
    pixelData[index + 1] = color;
    pixelData[index + 2] = color;
  }

  return nextImageData;
};

const scanImageDataWithJsQr = (imageData: ImageData) => {
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });

  return code?.data || null;
};

const scanImageDataWithZxing = (imageData: ImageData) => {
  const luminanceSource = new RGBLuminanceSource(
    imageData.data,
    imageData.width,
    imageData.height
  );
  const reader = new MultiFormatReader();
  const luminanceVariants = [
    luminanceSource,
    new InvertedLuminanceSource(luminanceSource),
  ];

  reader.setHints(QR_HINTS);

  try {
    for (const sourceVariant of luminanceVariants) {
      const bitmapVariants = [
        new BinaryBitmap(new HybridBinarizer(sourceVariant)),
        new BinaryBitmap(new GlobalHistogramBinarizer(sourceVariant)),
      ];

      for (const bitmap of bitmapVariants) {
        try {
          const result = reader.decodeWithState(bitmap);

          if (result?.getText()) {
            return result.getText();
          }
        } catch {
          // Try the next luminance/binarizer combination.
        } finally {
          reader.reset();
          reader.setHints(QR_HINTS);
        }
      }
    }

    return null;
  } finally {
    reader.reset();
  }
};

const scanCanvasVariantsWithJsQr = (canvas: HTMLCanvasElement) => {
  const context = getCanvasContext(canvas);
  const baseImageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const variantImageData = [
    baseImageData,
    applyGrayscaleContrast(baseImageData),
    applyThreshold(baseImageData),
  ];

  for (const imageData of variantImageData) {
    const detectedCode =
      scanImageDataWithJsQr(imageData) || scanImageDataWithZxing(imageData);

    if (detectedCode) {
      return detectedCode;
    }
  }

  return null;
};

const scanConfiguredCropsWithJsQr = (
  sourceCanvas: HTMLCanvasElement,
  cropConfigs: CropScanConfig[]
) => {
  for (const cropConfig of cropConfigs) {
    const sourceX = Math.round(sourceCanvas.width * cropConfig.x);
    const sourceY = Math.round(sourceCanvas.height * cropConfig.y);
    const sourceWidth = Math.min(
      sourceCanvas.width - sourceX,
      Math.round(sourceCanvas.width * cropConfig.widthRatio)
    );
    const sourceHeight = Math.min(
      sourceCanvas.height - sourceY,
      Math.round(sourceCanvas.height * cropConfig.heightRatio)
    );

    if (sourceWidth <= 0 || sourceHeight <= 0) {
      continue;
    }

    const targetDimensions = getScaledDimensions(
      sourceWidth,
      sourceHeight,
      cropConfig.maxDimension || 1400
    );
    const cropCanvas = createCanvas(targetDimensions.width, targetDimensions.height);
    const cropContext = getCanvasContext(cropCanvas);

    cropContext.drawImage(
      sourceCanvas,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      targetDimensions.width,
      targetDimensions.height
    );

    const detectedCode = scanCanvasVariantsWithJsQr(cropCanvas);

    if (detectedCode) {
      return detectedCode;
    }
  }

  return null;
};

const scanFocusedRegionsWithJsQr = (sourceCanvas: HTMLCanvasElement) => {
  const cropConfigs: CropScanConfig[] = [
    { x: 0, y: 0, widthRatio: 0.58, heightRatio: 0.58, maxDimension: 1600 },
    { x: 0.42, y: 0, widthRatio: 0.58, heightRatio: 0.58, maxDimension: 1600 },
    { x: 0, y: 0.42, widthRatio: 0.58, heightRatio: 0.58, maxDimension: 1600 },
    { x: 0.42, y: 0.42, widthRatio: 0.58, heightRatio: 0.58, maxDimension: 1600 },
    { x: 0.2, y: 0.2, widthRatio: 0.6, heightRatio: 0.6, maxDimension: 1800 },
    { x: 0, y: 0, widthRatio: 1, heightRatio: 0.5, maxDimension: 2000 },
    { x: 0, y: 0.5, widthRatio: 1, heightRatio: 0.5, maxDimension: 2000 },
    { x: 0, y: 0, widthRatio: 0.5, heightRatio: 1, maxDimension: 2000 },
    { x: 0.5, y: 0, widthRatio: 0.5, heightRatio: 1, maxDimension: 2000 },
  ];

  const windowRatio = 0.48;
  const positions = [0, 0.26, 0.52];

  for (const y of positions) {
    for (const x of positions) {
      cropConfigs.push({
        x,
        y,
        widthRatio: windowRatio,
        heightRatio: windowRatio,
        maxDimension: 1700,
      });
    }
  }

  return scanConfiguredCropsWithJsQr(sourceCanvas, cropConfigs);
};

const isPdfFile = (file: File) =>
  PDF_MIME_TYPES.has(file.type) || /\.pdf$/i.test(file.name || "");

const loadPdfJs = async () => {
  if (!pdfJsPromise) {
    pdfJsPromise = import("pdfjs-dist/legacy/build/pdf").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_PUBLIC_PATH;
      return pdfjs;
    });
  }

  return pdfJsPromise;
};

const extractVoucherDataFromPdfText = async (
  pdfDocument: Awaited<ReturnType<Awaited<ReturnType<typeof loadPdfJs>>["getDocument"]>["promise"]>,
  fileName: string
) => {
  const pageCount = Math.min(pdfDocument.numPages, 3);

  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const page = await pdfDocument.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const rawText = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");
    const parsed = extractVoucherDataFromText(rawText, fileName);

    if (parsed) {
      return parsed;
    }
  }

  return null;
};

const scanPdfWithJsQr = async (file: File) => {
  const pdfjs = await loadPdfJs();
  const pdfData = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({
    data: pdfData,
    useWorkerFetch: false,
    isEvalSupported: false,
    verbosity: 0,
  });

  try {
    const pdfDocument = await loadingTask.promise;
    const pageCount = Math.min(pdfDocument.numPages, 3);

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const baseViewport = page.getViewport({ scale: 1 });
      const targetWidth = 2200;
      const renderScale =
        Math.max(baseViewport.width, baseViewport.height) > 0
          ? targetWidth / Math.max(baseViewport.width, baseViewport.height)
          : 2.5;
      const viewport = page.getViewport({
        scale: Math.max(2.2, Math.min(renderScale, 4)),
      });
      const canvas = createCanvas(
        Math.max(1, Math.floor(viewport.width)),
        Math.max(1, Math.floor(viewport.height))
      );
      const context = getCanvasContext(canvas);

      await page
        .render({
          canvasContext: context,
          viewport,
        })
        .promise;

      const directCode = scanCanvasVariantsWithJsQr(canvas);

      if (directCode) {
        return {
          rawValue: directCode,
          parsed: parseExpenseVoucherQr(directCode),
          source: "qr" as ExpenseVoucherScanSource,
        };
      }

      const cornerCode = scanFocusedRegionsWithJsQr(canvas);

      if (cornerCode) {
        return {
          rawValue: cornerCode,
          parsed: parseExpenseVoucherQr(cornerCode),
          source: "qr" as ExpenseVoucherScanSource,
        };
      }
    }

    const parsedFromText = await extractVoucherDataFromPdfText(pdfDocument, file.name);

    if (!parsedFromText) {
      return null;
    }

    return {
      rawValue: parsedFromText.rawValue,
      parsed: parsedFromText,
      source: "pdf-text" as ExpenseVoucherScanSource,
    };
  } finally {
    await loadingTask.destroy();
  }
};

const scanWithJsQr = async (file: File) => {
  const bitmap = await createImageBitmap(file);

  try {
    const dimensionAttempts = [2400, 2000, 1600, 1200]
      .map((maxDimension) =>
        getScaledDimensions(bitmap.width, bitmap.height, maxDimension)
      )
      .filter(
        (dimensions, index, dimensionsList) =>
          dimensionsList.findIndex(
            (candidate) =>
              candidate.width === dimensions.width &&
              candidate.height === dimensions.height
          ) === index
      );
    const rotationAttempts: Array<0 | 90 | 180 | 270> = [0, 90, 180, 270];

    for (const dimensions of dimensionAttempts) {
      for (const rotation of rotationAttempts) {
        const canvas = renderBitmapToCanvas(
          bitmap,
          dimensions.width,
          dimensions.height,
          rotation
        );
        const directCode = scanCanvasVariantsWithJsQr(canvas);

        if (directCode) {
          return directCode;
        }

        const cornerCode = scanFocusedRegionsWithJsQr(canvas);

        if (cornerCode) {
          return cornerCode;
        }
      }
    }

    return null;
  } finally {
    bitmap.close();
  }
};

const scanWithBarcodeDetector = async (file: File) => {
  const BarcodeDetector = getBarcodeDetector();

  if (!BarcodeDetector) {
    return null;
  }

  const detector = new BarcodeDetector({ formats: ["qr_code"] });
  const bitmap = await createImageBitmap(file);

  try {
    const detectedCodes = await detector.detect(bitmap);
    return detectedCodes.find((item) => String(item.rawValue || "").trim())?.rawValue || null;
  } finally {
    bitmap.close();
  }
};

export const scanExpenseVoucherQr = async (file: File) => {
  if (isPdfFile(file)) {
    return scanPdfWithJsQr(file);
  }

  const barcodeDetectorValue = await scanWithBarcodeDetector(file);
  const rawValue = barcodeDetectorValue || (await scanWithJsQr(file));

  if (!rawValue) {
    return null;
  }

  return {
    rawValue,
    parsed: parseExpenseVoucherQr(rawValue),
    source: "qr" as ExpenseVoucherScanSource,
  };
};
