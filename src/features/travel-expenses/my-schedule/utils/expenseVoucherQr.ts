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

const getBarcodeDetector = () =>
  (window as unknown as {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }).BarcodeDetector;

const PDF_MIME_TYPES = new Set(["application/pdf", "application/x-pdf"]);

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

const scanCanvasVariantsWithJsQr = (canvas: HTMLCanvasElement) => {
  const context = getCanvasContext(canvas);
  const baseImageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const variantImageData = [
    baseImageData,
    applyGrayscaleContrast(baseImageData),
    applyThreshold(baseImageData),
  ];

  for (const imageData of variantImageData) {
    const detectedCode = scanImageDataWithJsQr(imageData);

    if (detectedCode) {
      return detectedCode;
    }
  }

  return null;
};

const scanCornerCropsWithJsQr = (sourceCanvas: HTMLCanvasElement) => {
  const cropConfigs = [
    { x: 0, y: 0, widthRatio: 0.58, heightRatio: 0.58 },
    { x: 0.42, y: 0, widthRatio: 0.58, heightRatio: 0.58 },
    { x: 0, y: 0.42, widthRatio: 0.58, heightRatio: 0.58 },
    { x: 0.42, y: 0.42, widthRatio: 0.58, heightRatio: 0.58 },
  ];

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
    const targetDimensions = getScaledDimensions(sourceWidth, sourceHeight, 1400);
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

const isPdfFile = (file: File) =>
  PDF_MIME_TYPES.has(file.type) || /\.pdf$/i.test(file.name || "");

const loadPdfJs = async () => {
  await import("pdfjs-dist/legacy/build/pdf.worker.entry");
  return import("pdfjs-dist/legacy/build/pdf");
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
        return directCode;
      }

      const cornerCode = scanCornerCropsWithJsQr(canvas);

      if (cornerCode) {
        return cornerCode;
      }
    }

    return null;
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

        const cornerCode = scanCornerCropsWithJsQr(canvas);

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
    const rawPdfValue = await scanPdfWithJsQr(file);

    if (!rawPdfValue) {
      return null;
    }

    return {
      rawValue: rawPdfValue,
      parsed: parseExpenseVoucherQr(rawPdfValue),
    };
  }

  const barcodeDetectorValue = await scanWithBarcodeDetector(file);
  const rawValue = barcodeDetectorValue || (await scanWithJsQr(file));

  if (!rawValue) {
    return null;
  }

  return {
    rawValue,
    parsed: parseExpenseVoucherQr(rawValue),
  };
};
