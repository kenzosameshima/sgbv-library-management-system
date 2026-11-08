/** Keep in sync with the backend limits (src/utils/constants.ts). */
export const PASSWORD_MIN_LENGTH = 8;
export const MAX_ACTIVE_LOANS = 5;

export const CSRF_COOKIE_NAME = "sgb_csrf";
export const LOCAL_RESERVATIONS_KEY = "sgb_reservations";

export const CURRENCY_SYMBOL = "R$";

export function formatMoney(amount: number): string {
  return `${CURRENCY_SYMBOL} ${amount.toFixed(2)}`;
}
