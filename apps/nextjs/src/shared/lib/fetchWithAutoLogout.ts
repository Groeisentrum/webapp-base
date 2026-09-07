import {
  AppError,
  getErrorCodeFromFailedResponse,
  getUserMessageFromFailedResponse,
} from "@/shared/lib/apiError";

const SESSION_EXPIRED_MESSAGE = "Jou sessie het verval. Teken asseblief weer in.";
const FORBIDDEN_MESSAGE = "Jy het nie toestemming vir hierdie aksie nie.";
const LOGOUT_DELAY_MS = 1500;

type LogoutHandler = () => void;

let logoutHandler: LogoutHandler | null = null;
let logoutTimer: ReturnType<typeof setTimeout> | null = null;

/** Registered once by the auth wrapper so this module needs no React or router import. */
export function registerLogoutHandler(handler: LogoutHandler): void {
  logoutHandler = handler;
}

/**
 * Wraps every authenticated call.
 *
 * A 401 means the session is gone, so the user is signed out after a short delay that
 * lets them read the toast. A 403 is a permission decision on a live session and must
 * not sign anyone out — conflating the two would eject users from pages they simply
 * cannot access.
 */
export async function fetchWithAutoLogoutOrThrow(
  input: RequestInfo | URL,
  init: RequestInit = {},
): Promise<Response> {
  const response = await fetch(input, { ...init, credentials: "include" });

  if (response.ok) {
    return response;
  }

  if (response.status === 401) {
    scheduleLogout();
    throw new AppError(SESSION_EXPIRED_MESSAGE, response.status);
  }

  if (response.status === 403) {
    throw new AppError(FORBIDDEN_MESSAGE, response.status);
  }

  const message = await getUserMessageFromFailedResponse(response);
  const code = await getErrorCodeFromFailedResponse(response);

  throw new AppError(message, response.status, code);
}

export async function parseJsonResponse<TValue>(response: Response): Promise<TValue> {
  return (await response.json()) as TValue;
}

function scheduleLogout(): void {
  if (logoutTimer !== null) {
    return;
  }

  logoutTimer = setTimeout(() => {
    logoutTimer = null;
    logoutHandler?.();
  }, LOGOUT_DELAY_MS);
}
