interface GoogleConfig {
  API_KEY: string;
  CLIENT_ID: string;
  SECRET: string;
}

interface FacebookConfig {
  APP_ID: string;
}

interface ApiConfig {
  API_URL: string;
}

interface ExternalServiceConfig {
  API_URL: string;
  TOKEN: string;
}

interface Config {
  google: GoogleConfig;
  facebook: FacebookConfig;
  api: ApiConfig;
  services: {
    factiliza: ExternalServiceConfig;
    sunat: ExternalServiceConfig;
  };
}

const apiUrl =
  process.env.REACT_APP_API_URL ||
  "https://docuware-api-a09ab977636d.herokuapp.com/api/";
const factilizaApiUrl =
  process.env.REACT_APP_FACTILIZA_API_URL || "https://api.factiliza.com/v1/";
const sunatApiUrl =
  process.env.REACT_APP_SUNAT_API_URL || "https://dev.apisunat.pe/api/v1/";

const config: Config = {
  google: {
    API_KEY: "",
    CLIENT_ID: "",
    SECRET: "",
  },
  facebook: {
    APP_ID: "",
  },
  api: {
    API_URL: apiUrl,
  },
  services: {
    factiliza: {
      API_URL: factilizaApiUrl,
      TOKEN: process.env.REACT_APP_FACTILIZA_TOKEN || "",
    },
    sunat: {
      API_URL: sunatApiUrl,
      TOKEN: process.env.REACT_APP_SUNAT_TOKEN || "",
    },
  },
};

export default config;
