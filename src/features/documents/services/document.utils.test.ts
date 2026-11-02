/** @jest-environment node */
import { getDocumentSourceUrl, getUploadedDocumentUrl } from "./document.utils";

describe("invoice file selection", () => {
  const legacyInvoice = {
    documenturl: "https://sunat.example/factura.pdf",
    file_url: "https://sunat.example/public.pdf",
  };

  it("uses the commercial original even when legacy fields point to SUNAT", () => {
    const invoice = {
      ...legacyInvoice,
      uploadedDocumentUrl: " https://r2.example/original.pdf?fresh=1 ",
      displayDocumentUrl: "https://sunat.example/factura.pdf",
    };
    expect(getDocumentSourceUrl(invoice)).toBe("https://r2.example/original.pdf?fresh=1");
    expect(getUploadedDocumentUrl(invoice)).toBe("https://r2.example/original.pdf?fresh=1");
  });

  it("recovers the original from batch metadata when the uploaded URL is empty", () => {
    expect(getDocumentSourceUrl({
      ...legacyInvoice,
      uploadedDocumentUrl: "  ",
      batchFile: { r2Url: "https://r2.example/batch-original.pdf" },
    })).toBe("https://r2.example/batch-original.pdf");
  });

  it("uses the API display URL before legacy file fields", () => {
    expect(getDocumentSourceUrl({
      ...legacyInvoice,
      displayDocumentUrl: "https://r2.example/preferred.pdf",
    })).toBe("https://r2.example/preferred.pdf");
  });

  it("preserves access to older invoices with no original import metadata", () => {
    expect(getDocumentSourceUrl(legacyInvoice)).toBe(legacyInvoice.file_url);
    expect(getDocumentSourceUrl({ documenturl: legacyInvoice.documenturl })).toBe(legacyInvoice.documenturl);
    expect(getUploadedDocumentUrl(legacyInvoice)).toBe("");
  });

  it("handles missing files and blank URLs", () => {
    expect(getDocumentSourceUrl(null)).toBe("");
    expect(getDocumentSourceUrl({ documenturl: " ", displayDocumentUrl: " " })).toBe("");
  });
});
