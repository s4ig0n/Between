import * as AuthSession from 'expo-auth-session';
import { isRunningInExpoGo } from 'expo';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

import { EPIC_SCOPES, type EpicConfig } from './config';
import { fetchSmartEndpoints } from './discovery';
import {
  APP_SCHEME_REDIRECT,
  EPIC_HTTPS_REDIRECT,
  EPIC_REDIRECT_PATH,
  expoGoRedirectUri,
  makeHandoffState,
} from './redirect';
import { sessionFromTokenResponse, type EpicSession } from './session';
import { saveSession } from './sessionStore';

WebBrowser.maybeCompleteAuthSession();

/** The redirect URI registered in Epic and sent in the sign-in request. */
export function epicRedirectUri(): string {
  return EPIC_HTTPS_REDIRECT;
}

/**
 * Where the hand-off page sends the browser so the app gets the code: an
 * exp:// link in Expo Go (which can't receive between:// links), or
 * between://auth/epic in an installed build.
 */
export function appReturnUri(): string {
  // Expo Go on Android (SDK 58) reports its execution environment as "bare",
  // so ask Expo directly whether this is Expo Go.
  if (isRunningInExpoGo()) {
    const hostUri = Constants.expoConfig?.hostUri;
    const expoGo =
      expoGoRedirectUri(Constants.linkingUri) ??
      expoGoRedirectUri(Constants.experienceUrl) ??
      (hostUri ? expoGoRedirectUri(`exp://${hostUri}`) : undefined);
    if (expoGo) return expoGo;
  }
  return AuthSession.makeRedirectUri({ scheme: 'between', path: EPIC_REDIRECT_PATH, native: APP_SCHEME_REDIRECT });
}

export type SignInResult = { type: 'success'; session: EpicSession } | { type: 'cancelled' };

/**
 * SMART on FHIR standalone launch: authorization code with PKCE, public
 * client, no client secret. Epic redirects to the https hand-off page, which
 * passes the code on to the app's own link. The token is saved to SecureStore
 * and never logged.
 */
export async function signInWithEpic(config: EpicConfig): Promise<SignInResult> {
  const endpoints = await fetchSmartEndpoints(config.fhirBaseUrl);
  const discovery = {
    authorizationEndpoint: endpoints.authorizationEndpoint,
    tokenEndpoint: endpoints.tokenEndpoint,
  };
  const redirectUri = epicRedirectUri();
  const returnUri = appReturnUri();
  if (__DEV__) {
    // Helps match the addresses registered in Epic. Contains no secrets.
    console.log(`Epic sign-in: redirect ${redirectUri}, returns to ${returnUri}`);
  }

  const request = new AuthSession.AuthRequest({
    clientId: config.clientId,
    redirectUri,
    scopes: EPIC_SCOPES,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    state: makeHandoffState(Crypto.randomUUID().replace(/-/g, ''), returnUri),
    extraParams: { aud: config.fhirBaseUrl },
  });

  const authUrl = await request.makeAuthUrlAsync(discovery);
  const browser = await WebBrowser.openAuthSessionAsync(authUrl, returnUri);
  if (browser.type !== 'success') return { type: 'cancelled' };

  // Checks that the state matches this request before trusting the code.
  const result = request.parseReturnUrl(browser.url);
  if (result.type !== 'success') {
    const reason = result.type === 'error' ? result.params.error_description || result.params.error : result.type;
    throw new Error(`Epic sign-in failed: ${reason}`);
  }
  if (!request.codeVerifier) throw new Error('Missing PKCE code verifier');

  const token = await AuthSession.exchangeCodeAsync(
    {
      clientId: config.clientId,
      code: result.params.code,
      redirectUri,
      extraParams: { code_verifier: request.codeVerifier },
    },
    discovery,
  );

  const session = sessionFromTokenResponse(
    { accessToken: token.accessToken, expiresIn: token.expiresIn, scope: token.scope },
    token.rawResponse,
    new Date(),
  );
  await saveSession(session);
  return { type: 'success', session };
}
