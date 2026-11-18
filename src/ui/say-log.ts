// What people type into the "or say it" box is the one thing this app sends
// anywhere: the words, what the app made of them, and nothing about who typed
// them. It goes to the collector in worker/ so the app can learn to understand
// more. Taps on tiles are never sent, nor is anything else.
//
// Off unless the site was built with an address to send to (the SAY_LOG_URL
// repository variable). Off for anyone whose browser says not to track them.

/**
 * The collector's address, however it was written in the repository variable: with or without
 * https://, with or without /say. (Written bare, a browser takes it for a page on this site.)
 */
export function collectorUrl(raw: string | undefined): string {
  let u = (raw ?? '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const url = new URL(u);
    if (url.pathname === '/' || url.pathname === '') url.pathname = '/say';
    return url.toString();
  } catch {
    return '';
  }
}

const URL_TO = collectorUrl((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_SAY_LOG_URL);

export const sayLogOn = (): boolean => {
  if (!URL_TO) return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return !(nav.globalPrivacyControl === true || nav.doNotTrack === '1');
};

export function logSay(entry: { text: string; heard: string[]; lost: boolean; picks: number; minutes: number }): void {
  if (!sayLogOn()) return;
  const body = JSON.stringify({ ...entry, text: entry.text.trim().slice(0, 200) });
  try {
    // Plain text, so the browser sends it without a pre-flight; a beacon, so it never holds the page up.
    if (!navigator.sendBeacon?.(URL_TO, new Blob([body], { type: 'text/plain' }))) void fetch(URL_TO, { method: 'POST', body, keepalive: true, headers: { 'content-type': 'text/plain' } }).catch(() => undefined);
  } catch {
    // Logging is never worth an error on the page.
  }
}
