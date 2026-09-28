// @ts-nocheck
// Shared formatting for audit log entries — used by ActivityLogScreen and
// the Dashboard's Recent Activity panel so both render entries identically.

export const MODULE_META = {
  student: { icon: 'account-outline', accent: 'blue' },
  transfer: { icon: 'swap-horizontal', accent: 'violet' },
  faculty: { icon: 'briefcase-outline', accent: 'teal' },
  admin_user: { icon: 'shield-account-outline', accent: 'amber' },
};

export const getModuleMeta = (module) => MODULE_META[module] || { icon: 'clipboard-text-outline', accent: 'blue' };

export const actionLabel = (action = '') => action
  .split('_')
  .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
  .join(' ');

export const formatTimestamp = (iso, opts) => {
  if (!iso) return '—';
  const date = new Date(iso);
  return date.toLocaleString(undefined, opts || {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};
