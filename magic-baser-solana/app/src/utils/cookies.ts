// Cookie utility functions for Magic Baser

const COOKIE_PREFIX = "magic-baser-";

/**
 * Set a cookie with optional expiration
 */
export function setCookie(name: string, value: string, days: number = 365): void {
  if (typeof document === "undefined") return;

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);

  document.cookie = `${COOKIE_PREFIX}${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;

  const fullName = `${COOKIE_PREFIX}${name}=`;
  const cookies = document.cookie.split(";");

  for (let cookie of cookies) {
    cookie = cookie.trim();
    if (cookie.startsWith(fullName)) {
      return decodeURIComponent(cookie.substring(fullName.length));
    }
  }

  return null;
}

/**
 * Delete a cookie by name
 */
export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;

  document.cookie = `${COOKIE_PREFIX}${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
}

// Game-specific cookie functions

const COINS_KEY = "coins";
const NICKNAME_KEY = "nickname";

/**
 * Get total accumulated coins from cookies
 */
export function getTotalCoins(): number {
  const value = getCookie(COINS_KEY);
  if (!value) return 0;

  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Set total coins in cookies
 */
export function setTotalCoins(coins: number): void {
  setCookie(COINS_KEY, Math.max(0, Math.floor(coins)).toString());
}

/**
 * Add coins to the total and return new total
 */
export function addCoins(amount: number): number {
  const current = getTotalCoins();
  const newTotal = current + Math.floor(amount);
  setTotalCoins(newTotal);
  return newTotal;
}

/**
 * Spend coins if sufficient balance, returns true if successful
 */
export function spendCoins(amount: number): boolean {
  const current = getTotalCoins();
  if (current < amount) return false;

  setTotalCoins(current - amount);
  return true;
}

/**
 * Get player nickname from cookies
 */
export function getPlayerNickname(): string | null {
  return getCookie(NICKNAME_KEY);
}

/**
 * Set player nickname in cookies
 */
export function setPlayerNickname(nickname: string): void {
  setCookie(NICKNAME_KEY, nickname.slice(0, 20));
}

/**
 * Clear player nickname from cookies
 */
export function clearPlayerNickname(): void {
  deleteCookie(NICKNAME_KEY);
}
