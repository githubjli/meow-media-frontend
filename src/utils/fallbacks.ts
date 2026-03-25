export const normalizeText = (value: any) =>
  typeof value === 'string' ? value.trim() : String(value || '').trim();

export const safeText = (value: any, fallback: string) => {
  const normalized = normalizeText(value);
  return normalized || fallback;
};

export const safeOptionalText = (value: any) => {
  const normalized = normalizeText(value);
  return normalized || '';
};

export const safeImageUrl = (value: any) => {
  const normalized = normalizeText(value);
  return normalized || '';
};

export const firstNonEmpty = (...values: any[]) => {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) {
      return normalized;
    }
  }

  return '';
};
