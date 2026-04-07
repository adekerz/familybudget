import { useState, useEffect } from 'react';
import { Fingerprint, DeviceMobile, Plus, Trash, Bell } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { useToastStore } from '../../store/useToastStore';
import { browserSupportsWebAuthn } from '../../lib/webauthn';
import { subscribeToPush, unsubscribeFromPush, isPushSubscribed, isPushSupported } from '../../lib/push';
import type { PasskeyCredential } from '../../lib/webauthn';

export function SettingsSecuritySection() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const registerPasskey = useAuthStore((s) => s.registerPasskey);
  const deleteUserPasskey = useAuthStore((s) => s.deleteUserPasskey);
  const listUserPasskeys = useAuthStore((s) => s.listUserPasskeys);
  const showToast = useToastStore((s) => s.show);

  const supportsWebAuthn = browserSupportsWebAuthn();
  const pushSupported = isPushSupported();

  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [passkeyLoading, setPasskeyLoading] = useState(false);
  const [deletingPasskeyId, setDeletingPasskeyId] = useState<string | null>(null);

  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    if (user && supportsWebAuthn) {
      listUserPasskeys().then(setPasskeys);
    }
  }, [user?.id]);

  useEffect(() => {
    if (pushSupported) {
      isPushSubscribed().then(setPushSubscribed);
    }
  }, []);

  async function handleRegisterPasskey() {
    setPasskeyLoading(true);
    try {
      await registerPasskey();
      const updated = await listUserPasskeys();
      setPasskeys(updated);
      const newest = updated[updated.length - 1];
      const label = newest?.device_type === 'face_id' ? 'Face ID' :
                    newest?.device_type === 'fingerprint' ? t('device_fingerprint') :
                    newest?.device_type === 'windows_hello' ? 'Windows Hello' :
                    newest?.device_type === 'security_key' ? t('device_key') :
                    'Passkey';
      showToast(t('passkey_connected_toast', { label }), 'success');
    } catch {
      showToast(t('passkey_connect_failed'), 'error');
    }
    setPasskeyLoading(false);
  }

  async function handleDeletePasskey(id: string) {
    setDeletingPasskeyId(id);
    const ok = await deleteUserPasskey(id);
    if (ok) {
      setPasskeys((p) => p.filter((pk) => pk.id !== id));
      showToast(t('faceid_deleted_toast'), 'success');
    } else {
      showToast(t('faceid_delete_failed'), 'error');
    }
    setDeletingPasskeyId(null);
  }

  async function handleTogglePush() {
    setPushLoading(true);
    try {
      if (pushSubscribed) {
        await unsubscribeFromPush();
        setPushSubscribed(false);
        showToast(t('push_disconnected'), 'success');
      } else {
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') {
          showToast(t('push_permission_denied'), 'error');
          return;
        }
        const ok = await subscribeToPush();
        if (ok) {
          setPushSubscribed(true);
          showToast(t('push_connected'), 'success');
        } else {
          showToast(t('push_connect_failed'), 'error');
        }
      }
    } finally {
      setPushLoading(false);
    }
  }

  if (!supportsWebAuthn && !pushSupported) return null;

  return (
    <>
      {supportsWebAuthn && (
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Fingerprint size={16} className="text-accent" />
            <p className="font-semibold text-ink text-sm">Face ID / Touch ID</p>
          </div>
          <div className="px-4 py-3 space-y-3">
            {passkeys.length === 0 ? (
              <p className="text-xs text-muted">{t('no_devices')}</p>
            ) : (
              <div className="space-y-2">
                {passkeys.map((pk) => (
                  <div key={pk.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DeviceMobile size={15} className="text-muted shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-ink">
                          {pk.device_type === 'face_id' ? 'Face ID' :
                           pk.device_type === 'fingerprint' ? t('device_fingerprint') :
                           pk.device_type === 'windows_hello' ? 'Windows Hello' :
                           pk.device_type === 'security_key' ? t('device_key') :
                           'Passkey'}
                        </p>
                        <p className="text-[10px] text-muted">
                          {t('device_added_date', { date: new Date(pk.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }) })}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeletePasskey(pk.id)}
                      disabled={deletingPasskeyId === pk.id}
                      className="text-muted hover:text-danger transition-colors p-1 disabled:opacity-40"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={handleRegisterPasskey}
              disabled={passkeyLoading}
              className="flex items-center gap-2 text-accent text-xs font-semibold disabled:opacity-40"
            >
              <Plus size={14} />
              {passkeyLoading ? t('configuring') : t('add_device')}
            </button>
          </div>
        </section>
      )}

      {pushSupported && (
        <section className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
            <Bell size={16} className="text-accent" />
            <p className="font-semibold text-ink text-sm">{t('push_notifications')}</p>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-ink">
                {pushSubscribed ? t('push_enabled') : t('push_disabled')}
              </p>
              <p className="text-[10px] text-muted mt-0.5">{t('push_hint')}</p>
            </div>
            <button
              onClick={handleTogglePush}
              disabled={pushLoading}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 disabled:opacity-40 ${pushSubscribed ? 'bg-accent' : 'bg-border'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all duration-200 ${pushSubscribed ? 'left-6' : 'left-1'}`} />
            </button>
          </div>
        </section>
      )}
    </>
  );
}
