import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn as _browserSupportsWebAuthn,
} from '@simplewebauthn/browser';
import { supabase } from './supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_ANON_KEY,
};

/** Returns true if the current browser supports WebAuthn (Passkeys / Face ID) */
export function browserSupportsWebAuthn(): boolean {
  try {
    return _browserSupportsWebAuthn();
  } catch {
    return false;
  }
}

export interface PasskeyCredential {
  id: string;
  credential_id: string;
  device_type: 'face_id' | 'fingerprint' | 'windows_hello' | 'security_key' | 'passkey';
  created_at: string;
}

/** Register a new passkey for the current user */
export async function registerPasskey(userId: string, username: string): Promise<void> {
  // 1. Get challenge from edge function
  const chalRes = await fetch(`${SUPABASE_URL}/functions/v1/webauthn-challenge`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ type: 'registration', userId, username }),
  });
  if (!chalRes.ok) throw new Error(`challenge_failed_${chalRes.status}`);
  const options = await chalRes.json();

  // 2. Start registration in browser
  const registrationResponse = await startRegistration({ optionsJSON: options });

  // 3. Verify with edge function
  const verRes = await fetch(`${SUPABASE_URL}/functions/v1/webauthn-verify`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ type: 'registration', userId, response: registrationResponse }),
  });
  if (!verRes.ok) throw new Error(`verify_failed_${verRes.status}`);
  const result = await verRes.json();
  if (!result.ok) throw new Error(result.error ?? 'registration_failed');
}

/** Authenticate with a passkey (discoverable credentials) */
export async function authenticatePasskey(): Promise<Record<string, unknown>> {
  // 1. Get challenge
  const chalRes = await fetch(`${SUPABASE_URL}/functions/v1/webauthn-challenge`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ type: 'authentication' }),
  });
  if (!chalRes.ok) throw new Error(`challenge_failed_${chalRes.status}`);
  const options = await chalRes.json();

  // 2. Start authentication in browser
  const authResponse = await startAuthentication({ optionsJSON: options });

  // 3. Verify with edge function
  const verRes = await fetch(`${SUPABASE_URL}/functions/v1/webauthn-verify`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({ type: 'authentication', response: authResponse }),
  });
  if (!verRes.ok) throw new Error(`verify_failed_${verRes.status}`);
  const result = await verRes.json();
  if (!result.ok) throw new Error(result.error ?? 'authentication_failed');
  return result.user as Record<string, unknown>;
}

/** Check if userId has any registered passkeys */
export async function hasPasskey(userId: string): Promise<boolean> {
  const { count } = await supabase
    .from('webauthn_credentials')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);
  return (count ?? 0) > 0;
}

/** List all passkeys for a user */
export async function listPasskeys(userId: string): Promise<PasskeyCredential[]> {
  const { data } = await supabase
    .from('webauthn_credentials')
    .select('id, credential_id, device_type, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data ?? []) as PasskeyCredential[];
}

/** Delete a passkey by credential ID */
export async function deletePasskey(credentialId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('webauthn_credentials')
    .delete()
    .eq('credential_id', credentialId)
    .eq('user_id', userId);
  return !error;
}
