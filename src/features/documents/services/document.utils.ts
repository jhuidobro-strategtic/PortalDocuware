import type { Document } from "../types/list.types";

const DOCUMENTS_FLASH_NOTIFICATION_KEY = "documents-flash-notification";

type DocumentFileSource = Pick<Document,
  "uploadedDocumentUrl" | "displayDocumentUrl" | "batchFile" | "file_url" | "documenturl"
>;

const getUploadedDocumentUrl = (document?: DocumentFileSource | null) =>
  String(document?.uploadedDocumentUrl || "").trim() ||
  String(document?.batchFile?.r2Url || "").trim();

const getDocumentSourceUrl = (document?: DocumentFileSource | null) =>
  getUploadedDocumentUrl(document) ||
  String(document?.displayDocumentUrl || "").trim() ||
  String(document?.file_url || "").trim() ||
  String(document?.documenturl || "").trim();

const extractDriveId = (url: string) => {
  const match = url.match(/\/d\/(.*?)\//);
  return match ? match[1] : null;
};

const getPreviewUrl = (url: string) => {
  const fileId = extractDriveId(url);
  return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
};

const getDownloadUrl = (url: string) => {
  const fileId = extractDriveId(url);
  return fileId
    ? `https://drive.google.com/uc?export=download&id=${fileId}`
    : url;
};

const getViewerUrl = (url: string) => {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return "";
  }

  if (trimmedUrl.includes("drive.google.com/file/d/")) {
    return trimmedUrl.includes("?")
      ? `${trimmedUrl}&rm=minimal`
      : `${trimmedUrl}?rm=minimal`;
  }

  if (trimmedUrl.includes("#")) {
    return `${trimmedUrl}&toolbar=0&navpanes=0&view=FitH`;
  }

  return `${trimmedUrl}#toolbar=0&navpanes=0&view=FitH`;
};

export {
  DOCUMENTS_FLASH_NOTIFICATION_KEY,
  getUploadedDocumentUrl,
  getDocumentSourceUrl,
  extractDriveId,
  getPreviewUrl,
  getDownloadUrl,
  getViewerUrl,
};
