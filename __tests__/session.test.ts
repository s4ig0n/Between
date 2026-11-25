import { isSessionUsable, sessionFromTokenResponse } from '../src/fhir/session';

const NOW = new Date('2026-10-06T15:00:00Z');

describe('sessionFromTokenResponse', () => {
  it('takes the patient id from the token response and computes expiry', () => {
    const s = sessionFromTokenResponse(
      { accessToken: 'tok', expiresIn: 3600, scope: 'patient/Appointment.read' },
      { patient: 'eP1', access_token: 'tok' },
      NOW,
    );
    expect(s).toEqual({
      accessToken: 'tok',
      expiresAt: '2026-10-06T16:00:00.000Z',
      patientId: 'eP1',
      scope: 'patient/Appointment.read',
    });
  });

  it('defaults the lifetime when Epic leaves it out', () => {
    expect(sessionFromTokenResponse({ accessToken: 't' }, { patient: 'p' }, NOW).expiresAt).toBe(
      '2026-10-06T16:00:00.000Z',
    );
  });

  it('fails without a patient in context', () => {
    expect(() => sessionFromTokenResponse({ accessToken: 't' }, {}, NOW)).toThrow(/patient/);
    expect(() => sessionFromTokenResponse({ accessToken: 't' }, undefined, NOW)).toThrow(/patient/);
  });
});

describe('isSessionUsable', () => {
  const s = sessionFromTokenResponse({ accessToken: 't', expiresIn: 600 }, { patient: 'p' }, NOW);

  it('is usable until a minute before expiry', () => {
    expect(isSessionUsable(s, NOW)).toBe(true);
    expect(isSessionUsable(s, new Date('2026-10-06T15:08:59Z'))).toBe(true);
    expect(isSessionUsable(s, new Date('2026-10-06T15:09:01Z'))).toBe(false);
    expect(isSessionUsable(undefined, NOW)).toBe(false);
  });
});
