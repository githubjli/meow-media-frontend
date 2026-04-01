import { normalizeLiveStatus, type FrontendLiveStatus } from '@/services/live';

type IntlLike = { formatMessage: (descriptor: { id: string }) => string };
export type LiveUiStatus = 'not_started' | 'live' | 'ended' | 'unavailable';

export const toLiveUiStatus = (
  value?: string | FrontendLiveStatus | null,
): LiveUiStatus => {
  if (!value) return 'unavailable';
  const normalized = normalizeLiveStatus(String(value));
  if (normalized === 'live') return 'live';
  if (normalized === 'ended') return 'ended';
  if (normalized === 'ready' || normalized === 'waiting_for_signal') {
    return 'not_started';
  }
  return 'unavailable';
};

export const getLiveStatusPresentation = (
  value: string | FrontendLiveStatus | null | undefined,
  intl: IntlLike,
) => {
  const uiStatus = toLiveUiStatus(value);
  if (uiStatus === 'live') {
    return {
      uiStatus,
      label: intl.formatMessage({ id: 'live.status.live' }),
      description: intl.formatMessage({ id: 'live.status.onAir' }),
      color: 'error' as const,
    };
  }
  if (uiStatus === 'ended') {
    return {
      uiStatus,
      label: intl.formatMessage({ id: 'live.status.ended' }),
      description: intl.formatMessage({ id: 'live.status.broadcastEnded' }),
      color: 'default' as const,
    };
  }
  if (uiStatus === 'not_started') {
    return {
      uiStatus,
      label: intl.formatMessage({ id: 'live.status.notStarted' }),
      description: intl.formatMessage({ id: 'live.status.readyToGoLive' }),
      color: 'processing' as const,
    };
  }
  return {
    uiStatus,
    label: intl.formatMessage({ id: 'live.status.unavailable' }),
    description: intl.formatMessage({ id: 'live.status.unavailable' }),
    color: 'default' as const,
  };
};
