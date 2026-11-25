import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

import { EPIC_SCOPES, type EpicConfig } from './config';
import { fetchSmartEndpoints } from './discovery';
import { sessionFromTokenResponse, type EpicSession } from './session';
import { saveSession } from './sessionStore';

WebBrowser.maybeCompleteAuthSession();

/**
 * Where Epic sends the patient back after sign-in. In Expo Go this is an
 * exp:// address that includes the computer's network address; in a dev build
 * it is between://auth/epic. Either way it must be registered exactly in the
 * Epic app settings.
 */
export function epicRedirectUri(): string {
  return AuthSession.makeRedirectUri({ scheme: 'between', path: 'auth/epic' });
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
