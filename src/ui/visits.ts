// Counting visits, so the owner can see how many people use the site over time. Cloudflare Web Analytics:
// no cookies, nothing stored on the device, no identifier that follows anyone between sites.
//
// Off unless the site was built with a token (the CF_ANALYTICS_TOKEN repository variable). Off for anyone
// whose browser says not to track them.

const TOKEN = ((import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_CF_ANALYTICS_TOKEN ?? '').trim();

export const visitsOn = (): boolean => {
  if (!/^[0-9a-f]{32}$/i.test(TOKEN)) return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return !(nav.globalPrivacyControl === true || nav.doNotTrack === '1');
};

export function countVisits(): void {
  if (!visitsOn()) return;
  const s = document.createElement('script');
  s.defer = true;
  s.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  s.dataset.cfBeacon = JSON.stringify({ token: TOKEN });
  document.head.appendChild(s);
}
