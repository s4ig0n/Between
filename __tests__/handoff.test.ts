import { APP_SCHEME_REDIRECT, makeHandoffState } from '../src/fhir/redirect';

// The same script the GitHub Pages hand-off page runs.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { handoffTarget, returnUriFromState } = require('../docs/auth/handoff.js') as {
  handoffTarget: (search: string) => string | null;
  returnUriFromState: (state: string | null) => string | null;
};

const RANDOM = 'a1B2c3D4e5F6g7H8i9J0';
const EXPO_GO = 'exp://192.168.1.11:8081/--/auth/epic';

describe('makeHandoffState', () => {
  it('round-trips the return address through the hand-off script', () => {
    expect(returnUriFromState(makeHandoffState(RANDOM, EXPO_GO))).toBe(EXPO_GO);
    expect(returnUriFromState(makeHandoffState(RANDOM, APP_SCHEME_REDIRECT))).toBe(APP_SCHEME_REDIRECT);
  });

  it('requires a real random part', () => {
    expect(() => makeHandoffState('short', EXPO_GO)).toThrow();
    expect(() => makeHandoffState('has spaces in it!!!!', EXPO_GO)).toThrow();
  });
});

describe('handoffTarget', () => {
  const state = makeHandoffState(RANDOM, EXPO_GO);

  it('forwards code and state to the app address', () => {
    const search = `?code=abc123&state=${encodeURIComponent(state)}`;
    expect(handoffTarget(search)).toBe(`${EXPO_GO}?code=abc123&state=${encodeURIComponent(state)}`);
  });

  it('forwards errors so the app can show them', () => {
    const t = handoffTarget(`?error=access_denied&error_description=User+said+no&state=${state}`);
    expect(t).toContain('error=access_denied');
    expect(t).toContain('error_description=User+said+no');
  });

  it('drops anything else in the query', () => {
    expect(handoffTarget(`?code=x&state=${state}&evil=1`)).not.toContain('evil');
  });

  it('refuses to send people anywhere but the app', () => {
    const toWeb = makeHandoffState(RANDOM, 'https://evil.example/--/auth/epic');
    expect(handoffTarget(`?code=x&state=${toWeb}`)).toBeNull();
    const otherPath = makeHandoffState(RANDOM, 'between://somewhere-else');
    expect(handoffTarget(`?code=x&state=${otherPath}`)).toBeNull();
    expect(handoffTarget('?code=x&state=no-dot-here')).toBeNull();
    expect(handoffTarget('?code=x&state=abc.zz')).toBeNull();
    expect(handoffTarget('?code=x')).toBeNull();
  });
});
