export type LiveQrConfig = {
  /**
   * Temporary client-side cache for pay QR payload only.
   * Preferred source is backend `payment_address`.
   */
  paymentAddress?: string;
  /**
   * Temporary client-side cache for watch QR URL.
   * Preferred source is backend `watch_url` or deterministic room URL.
   */
  watchUrl?: string;
  uploadedImageDataUrl?: string;
};

const getStorageKey = (id: string | number) => `live_qr_config_${id}`;

export const getLiveQrConfig = (id?: string | number): LiveQrConfig | null => {
  if (!id || typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = localStorage.getItem(getStorageKey(id));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
};

export const saveLiveQrConfig = (
  id: string | number | undefined,
  config: LiveQrConfig,
) => {
  if (!id || typeof window === 'undefined') {
    return;
  }

  localStorage.setItem(getStorageKey(id), JSON.stringify(config));
};
