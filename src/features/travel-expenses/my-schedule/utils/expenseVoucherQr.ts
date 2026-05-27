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

const scanWithJsQr = async (file: File) => {
  const bitmap = await createImageBitmap(file);

  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      throw new Error("Unable to prepare the image for QR detection.");
    }

    const dimensionAttempts = [1800, 1400, 1000]
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

    for (const dimensions of dimensionAttempts) {
      canvas.width = dimensions.width;
      canvas.height = dimensions.height;
      context.clearRect(0, 0, dimensions.width, dimensions.height);
      context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

      const imageData = context.getImageData(0, 0, dimensions.width, dimensions.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "attemptBoth",
      });

      if (code?.data) {
        return code.data;
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
