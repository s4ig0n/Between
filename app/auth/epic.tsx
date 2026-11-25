import { Redirect } from 'expo-router';

/**
 * Epic sends the browser back to .../auth/epic after sign-in. The auth
 * session picks up the code itself; if the link also opens the app here,
 * go straight back to Today.
 */
export default function EpicRedirect() {
  return <Redirect href="/" />;
}
