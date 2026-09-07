const DEFAULT_SKAAPHOND_API_URL = "https://skaaphond.konnek360.co.za";
const DEFAULT_WOLKPOORT_API_URL = "https://wolkpoort.konnek360.co.za";
const DEFAULT_LOCAL_API_URL = "http://localhost:5000";

function resolve(configured: string | undefined, fallback: string): string {
  const trimmed = configured?.trim();
  const base = trimmed && trimmed.length > 0 ? trimmed : fallback;

  return base.replace(/\/$/, "");
}

/** SkaapHond issues and refreshes the tokens this app authenticates with. */
export function getSkaaphondBaseUrl(): string {
  return resolve(process.env.SKAAPHOND_API_URL, DEFAULT_SKAAPHOND_API_URL);
}

/** WolkPoort is only used when this app needs data owned by another GroeiSentrum service. */
export function getWolkpoortBaseUrl(): string {
  return resolve(process.env.WOLKPOORT_API_URL, DEFAULT_WOLKPOORT_API_URL);
}

/**
 * This deployment's own C# API. It runs on the same instance and owns the app's
 * content, categories and settings — it is not reached through WolkPoort.
 */
export function getLocalApiBaseUrl(): string {
  return resolve(process.env.LOCAL_API_URL, DEFAULT_LOCAL_API_URL);
}
