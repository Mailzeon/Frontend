'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

// Auto-detected (from the visitor's IP, server-side) calling code for the
// phone field's non-editable "+NN" badge. Display-only: the backend
// re-checks the number against the request's IP at submit time, so this
// can't be used to bypass anything. Defaults to India ("91") — the original
// behavior — until the lookup returns, and again if it fails.
//
// Module-level cache so register -> profile (or a remount) doesn't refetch.
let cached: string | null = null;
let inflight: Promise<string> | null = null;

function fetchCallingCode(): Promise<string> {
  if (cached) return Promise.resolve(cached);
  if (!inflight) {
    inflight = api
      .get('/auth/detect-country-code')
      .then(({ data }) => {
        const code = String(data?.data?.callingCode ?? '91').replace(/\D/g, '') || '91';
        cached = code;
        return code;
      })
      .catch(() => '91')
      .finally(() => { inflight = null; });
  }
  return inflight;
}

export function useDetectedCallingCode(): string {
  const [code, setCode] = useState<string>(cached ?? '91');
  useEffect(() => {
    let alive = true;
    fetchCallingCode().then(c => { if (alive) setCode(c); });
    return () => { alive = false; };
  }, []);
  return code;
}

/**
 * Builds the value to send to the backend from what the person typed:
 * India (+91) -> bare 10 digits (original shape); any other detected
 * country -> "+<code><digits>" (backend only accepts it if the IP matches).
 */
export function buildPhoneForSubmit(digits: string, callingCode: string): string {
  const d = digits.replace(/\D/g, '');
  return callingCode === '91' ? d : `+${callingCode}${d}`;
}

/** Local-number validity for the detected country (Indian numbers keep the strict 10-digit rule). */
export function isValidLocalPhone(digits: string, callingCode: string): boolean {
  const d = digits.replace(/\D/g, '');
  return callingCode === '91' ? /^[6-9]\d{9}$/.test(d) : d.length >= 6 && d.length <= 15 - callingCode.length;
}
