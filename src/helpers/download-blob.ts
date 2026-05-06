type SaveAsFunction = (data: Blob, filename: string) => void;

const resolveSaveAs = async (): Promise<SaveAsFunction | null> => {
  try {
    const fileSaverModule = await import("file-saver");
    const directSaveAs = fileSaverModule.saveAs;

    if (typeof directSaveAs === "function") {
      return directSaveAs;
    }

    const defaultExport = fileSaverModule.default as
      | SaveAsFunction
      | { saveAs?: SaveAsFunction }
      | undefined;

    if (typeof defaultExport === "function") {
      return defaultExport;
    }

    if (typeof defaultExport?.saveAs === "function") {
      return defaultExport.saveAs;
    }
  } catch {
    // Fallback to native browser download below.
  }

  return null;
};

export const downloadBlob = async (blob: Blob, filename: string) => {
  const saveAs = await resolveSaveAs();

  if (saveAs) {
    saveAs(blob, filename);
    return;
  }

  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 1000);
};
