/** Path the sign-in returns to, under whichever scheme the app is running with. */
export const EPIC_REDIRECT_PATH = 'auth/epic';

/** Redirect for a dev build or installed app, which registers the `between://` scheme. */
export const APP_SCHEME_REDIRECT = `between://${EPIC_REDIRECT_PATH}`;

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
