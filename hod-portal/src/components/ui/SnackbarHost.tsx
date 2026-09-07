import React, { useCallback, useEffect, useState } from 'react';
import { Snackbar, Text } from 'react-native-paper';
import { _registerToastListener, ToastOptions } from '../../services/toast';

// Mounted once at the app root (see App.tsx), replacing <Toast /> from
// react-native-toast-message. Renders whatever the last services/toast.ts
// showToast() call passed in, using Paper's Snackbar for the actual UI.
const COLORS: Record<string, string> = {
  success: '#16a34a',
  error: '#dc2626',
  info: '#2563eb',
};

export default function SnackbarHost() {
  const [opts, setOpts] = useState<ToastOptions | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    _registerToastListener((next) => {
      if (next) {
        setOpts(next);
        setVisible(true);
      } else {
        setVisible(false);
      }
    });
    return () => _registerToastListener(null);
  }, []);

  const onDismiss = useCallback(() => setVisible(false), []);

  if (!opts) return null;

  return (
    <Snackbar
      visible={visible}
      onDismiss={onDismiss}
      duration={opts.autoHide === false ? Number.MAX_SAFE_INTEGER : (opts.visibilityTime ?? 4000)}
      style={{ backgroundColor: COLORS[opts.type ?? 'info'] }}
      action={{ label: 'Dismiss', onPress: onDismiss, textColor: '#ffffff' }}
    >
      <Text style={{ color: '#ffffff', fontWeight: '600' }}>{opts.text1}</Text>
      {opts.text2 ? <Text style={{ color: '#ffffff', fontSize: 12, marginTop: 2 }}>{opts.text2}</Text> : null}
    </Snackbar>
  );
}
