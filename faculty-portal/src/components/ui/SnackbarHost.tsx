import React, { useCallback, useEffect, useState } from 'react';
import { Snackbar } from 'react-native-paper';
import { Text } from 'react-native';
import { _registerToastListener, ToastOptions } from '../../services/toast';

const COLORS: Record<string, string> = {
  success: '#16a34a',
  error:   '#dc2626',
  info:    '#2563eb',
};

export default function SnackbarHost() {
  const [opts, setOpts]       = useState<ToastOptions | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    _registerToastListener((next) => {
      if (next) { setOpts(next); setVisible(true); }
      else      { setVisible(false); }
    });
    return () => _registerToastListener(null);
  }, []);

  const onDismiss = useCallback(() => setVisible(false), []);

  if (!opts) return null;

  return (
    <Snackbar
      visible={visible}
      onDismiss={onDismiss}
      duration={opts.visibilityTime ?? 4000}
      style={{ backgroundColor: COLORS[opts.type ?? 'info'] }}
      action={{ label: 'Dismiss', onPress: onDismiss, textColor: '#ffffff' }}
    >
      <Text style={{ color: '#ffffff', fontWeight: '600' }}>{opts.text1}</Text>
      {opts.text2 ? (
        <Text style={{ color: '#ffffff', fontSize: 12, marginTop: 2 }}>{opts.text2}</Text>
      ) : null}
    </Snackbar>
  );
}
