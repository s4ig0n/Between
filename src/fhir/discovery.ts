import { isSandboxUrl } from './config';

export interface SmartEndpoints {
  authorizationEndpoint: string;
  tokenEndpoint: string;
}

/**
 * Validate a .well-known/smart-configuration document for a public client
 * doing a standalone launch with PKCE. Throws with a readable reason if the
 * server can't support that, or points somewhere other than the sandbox.
 */
export function parseSmartConfiguration(doc: unknown): SmartEndpoints {
  if (!doc || typeof doc !== 'object') throw new Error('SMART configuration is not a JSON object');
  const d = doc as Record<string, unknown>;
  const auth = d.authorization_endpoint;
  const token = d.token_endpoint;
  if (typeof auth !== 'string' || typeof token !== 'string') {
    throw new Error('SMART configuration is missing the authorization or token endpoint');
  }
  for (const url of [auth, token]) {
    if (!isSandboxUrl(url)) throw new Error('SMART endpoints are not on the Epic sandbox');
  }
  const methods = Array.isArray(d.code_challenge_methods_supported) ? d.code_challenge_methods_supported : [];
  if (!methods.includes('S256')) throw new Error('Server does not support PKCE with S256');
  const caps = Array.isArray(d.capabilities) ? d.capabilities : [];
  for (const needed of ['launch-standalone', 'client-public']) {
    if (!caps.includes(needed)) throw new Error(`Server does not support ${needed}`);
  }
  return { authorizationEndpoint: auth, tokenEndpoint: token };
}

export async function fetchSmartEndpoints(fhirBaseUrl: string): Promise<SmartEndpoints> {
  const res = await fetch(`${fhirBaseUrl}/.well-known/smart-configuration`, {
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`SMART discovery failed (HTTP ${res.status})`);
  return parseSmartConfiguration(await res.json());
}
