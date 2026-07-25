import { buildFactilizaUrl, getFactilizaToken } from "../../../../helpers/external-api";

export const fetchRazonSocialByRuc = async (
  ruc: string,
  signal?: AbortSignal
): Promise<string | null> => {
  const cleanRuc = ruc.trim().replace(/\D/g, "");

  if (cleanRuc.length !== 11) {
    return null;
  }

  // 1. Primary: Factiliza API
  try {
    const factilizaToken = getFactilizaToken();

    if (factilizaToken) {
      const response = await fetch(
        buildFactilizaUrl(`ruc/info/${cleanRuc}`),
        {
          headers: {
            Authorization: `Bearer ${factilizaToken}`,
          },
          signal,
        }
      );

      if (response.ok) {
        const result = await response.json();
        const supplierData = result?.data;
        const razonSocial =
          supplierData?.nombre_o_razon_social ||
          supplierData?.razon_social ||
          supplierData?.nombre ||
          result?.nombre_o_razon_social;

        if (razonSocial) {
          return String(razonSocial).trim();
        }
      }
    }
  } catch {
    // Ignore error and proceed to fallback
  }

  // 2. Fallback: apis.net.pe
  try {
    const response = await fetch(
      `https://api.apis.net.pe/v1/ruc?numero=${cleanRuc}`,
      {
        method: "GET",
        signal,
      }
    );

    if (response.ok) {
      const data = await response.json();
      const razonSocial = data?.nombre || data?.nombreComercial;

      if (razonSocial) {
        return String(razonSocial).trim();
      }
    }
  } catch {
    // Ignore error
  }

  return null;
};
