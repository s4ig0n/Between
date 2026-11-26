import * as AuthSession from 'expo-auth-session';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';

import { EPIC_SCOPES, type EpicConfig } from './config';
import { fetchSmartEndpoints } from './discovery';
import { APP_SCHEME_REDIRECT, EPIC_REDIRECT_PATH, expoGoRedirectUri } from './redirect';
import { sessionFromTokenResponse, type EpicSession } from './session';
import { saveSession } from './sessionStore';

WebBrowser.maybeCompleteAuthSession();

/**
 * Where Epic sends the patient back after sign-in. In Expo Go this is an
 * exp:// address that includes the computer's network address; in a dev build
 * it is between://auth/epic. Either way it must be registered exactly in the
 * Epic app settings.
 *
 * Expo Go is detected explicitly: on Android, makeRedirectUri was observed to
 * return between://auth/epic inside Expo Go, which Expo Go cannot receive, so
 * the sign-in never returned to the app.
 */
export function epicRedirectUri(): string {
  const inExpoGo =
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient || Constants.appOwnership === 'expo';
  const expoGo = inExpoGo ? expoGoRedirectUri(Constants.linkingUri) : undefined;
  return expoGo ?? AuthSession.makeRedirectUri({ scheme: 'between', path: EPIC_REDIRECT_PATH, native: APP_SCHEME_REDIRECT });
}

export type SignInResult = { type: 'success'; session: EpicSession } | { type: 'cancelled' };

/**
 * SMART on FHIR standalone launch: authorization code with PKCE, public
 * client, no client secret. The token is saved to SecureStore and never
 * logged.
 */
export async function signInWithEpic(config: EpicConfig): Promise<SignInResult> {
  const endpoints = await fetchSmartEndpoints(config.fhirBaseUrl);
  const discovery = {
    authorizationEndpoint: endpoints.authorizationEndpoint,
    tokenEndpoint: endpoints.tokenEndpoint,
  };
  const redirectUri = epicRedirectUri();
  if (__DEV__) {
    // Helps match the URI registered in Epic. Contains no secrets.
    console.log(`Epic sign-in redirect: ${redirectUri} (${Constants.executionEnvironment})`);
  }

  const request = new AuthSession.AuthRequest({
    clientId: config.clientId,
    redirectUri,
    scopes: EPIC_SCOPES,
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: { aud: config.fhirBaseUrl },
  });

  const result = await request.promptAsync(discovery);
  if (result.type === 'cancel' || result.type === 'dismiss' || result.type === 'locked') {
    return { type: 'cancelled' };
  }
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
