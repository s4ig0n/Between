import { APP_SCHEME_REDIRECT, expoGoRedirectUri } from '../src/fhir/redirect';

describe('expoGoRedirectUri', () => {
  it('builds the exp:// redirect registered in Epic from the Expo Go linking URI', () => {
    expect(expoGoRedirectUri('exp://192.168.1.11:8081/--/')).toBe('exp://192.168.1.11:8081/--/auth/epic');
    expect(expoGoRedirectUri('exp://192.168.1.11:8081')).toBe('exp://192.168.1.11:8081/--/auth/epic');
    expect(expoGoRedirectUri('exp://192.168.1.11:8081/--')).toBe('exp://192.168.1.11:8081/--/auth/epic');
  });

  it('returns nothing outside Expo Go', () => {
    expect(expoGoRedirectUri('between://')).toBeUndefined();
    expect(expoGoRedirectUri(undefined)).toBeUndefined();
    expect(expoGoRedirectUri('')).toBeUndefined();
  });

  it('keeps the app scheme redirect for builds', () => {
    expect(APP_SCHEME_REDIRECT).toBe('between://auth/epic');
  });
});
