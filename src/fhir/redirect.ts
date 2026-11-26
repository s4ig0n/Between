/** Path the sign-in returns to, under whichever scheme the app is running with. */
export const EPIC_REDIRECT_PATH = 'auth/epic';

/** Redirect for a dev build or installed app, which registers the `between://` scheme. */
export const APP_SCHEME_REDIRECT = `between://${EPIC_REDIRECT_PATH}`;

/**
 * The redirect registered with Epic and sent in the sign-in request. It is a
 * small page (docs/auth/epic.html, served by GitHub Pages) that passes the
 * code on to the app. Android's browser would not hand Epic's sign-in
 * straight to an exp:// link, but it does load https pages.
 */
export const EPIC_HTTPS_REDIRECT = 'https://s4ig0n.github.io/Between/auth/epic';

function toHex(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c > 0x7e) throw new Error('Return address must be plain ASCII');
    out += c.toString(16).padStart(2, '0');
  }
  return out;
}

/**
 * OAuth state carrying the app's return address for the hand-off page:
 * "<random>.<hex of return address>". The random part keeps it unguessable;
 * expo-auth-session checks the whole value when the app gets it back.
 */
export function makeHandoffState(random: string, returnUri: string): string {
  if (!/^[A-Za-z0-9_-]{16,}$/.test(random)) throw new Error('State needs at least 16 random URL-safe characters');
  return `${random}.${toHex(returnUri)}`;
}

/**
 * Redirect for Expo Go, built from its linking URI (for example
 * "exp://192.168.1.11:8081/--/"). Expo Go can only receive exp:// links, so a
 * between:// redirect would never make it back to the app.
 */
export function expoGoRedirectUri(linkingUri: string | undefined | null): string | undefined {
  if (!linkingUri || !/^exps?:\/\//.test(linkingUri)) return undefined;
  const base = linkingUri.replace(/\/+$/, '').replace(/\/--$/, '');
  return `${base}/--/${EPIC_REDIRECT_PATH}`;
}
