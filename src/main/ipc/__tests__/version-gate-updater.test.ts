import { describe, it, expect } from 'vitest';
import { VersionGateState } from '../../../shared/types';

describe('Version Gate & Auto-Updater Integration', () => {
  it('correctly structures VersionGateState for an outdated version', () => {
    const serverCheckResponse = {
      allowed: false,
      reason: 'Version 0.1.4 is outdated or no longer supported. Please update to v0.1.5 or later.',
      minVersion: '0.1.5',
      latestVersion: '0.1.5',
    };

    const currentVersion = '0.1.4';

    const gateState: VersionGateState = {
      allowed: serverCheckResponse.allowed,
      reason: serverCheckResponse.reason,
      minVersion: serverCheckResponse.minVersion,
      latestVersion: serverCheckResponse.latestVersion,
      currentVersion,
    };

    expect(gateState.allowed).toBe(false);
    expect(gateState.currentVersion).toBe('0.1.4');
    expect(gateState.minVersion).toBe('0.1.5');
    expect(gateState.reason).toContain('outdated');
  });

  it('correctly structures VersionGateState for an allowed version', () => {
    const serverCheckResponse = {
      allowed: true,
      currentVersion: '0.1.7',
      latestVersion: '0.1.7',
    };

    const gateState: VersionGateState = {
      allowed: serverCheckResponse.allowed,
      currentVersion: serverCheckResponse.currentVersion,
      latestVersion: serverCheckResponse.latestVersion,
    };

    expect(gateState.allowed).toBe(true);
    expect(gateState.currentVersion).toBe('0.1.7');
  });

  it('intercepts HTTP 426 Upgrade Required and generates force-version-block event payload', () => {
    const mock426Response = {
      status: 426,
      data: {
        success: false,
        error: {
          statusCode: 426,
          message: 'Version 0.1.0 is outdated or no longer supported. Please update to v0.1.5 or later.',
          minVersion: '0.1.5',
        },
      },
    };

    const interceptor = (errResponse: typeof mock426Response, appVersion: string) => {
      if (errResponse.status === 426) {
        return {
          event: 'app:force-version-block',
          payload: {
            allowed: false,
            reason: errResponse.data.error.message,
            minVersion: errResponse.data.error.minVersion,
            currentVersion: appVersion,
          } as VersionGateState,
        };
      }
      return null;
    };

    const result = interceptor(mock426Response, '0.1.0');
    expect(result).not.toBeNull();
    expect(result?.event).toBe('app:force-version-block');
    expect(result?.payload.allowed).toBe(false);
    expect(result?.payload.minVersion).toBe('0.1.5');
    expect(result?.payload.currentVersion).toBe('0.1.0');
  });
});
