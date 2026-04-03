const CATEGORY_ALIASES: Record<string, string> = {
  tech: 'technology',
  technology: 'technology',
  game: 'gaming',
  gaming: 'gaming',
  edu: 'education',
  education: 'education',
  news: 'news',
  entertainment: 'entertainment',
  travel: 'travel',
  finance: 'finance',
  movies: 'movies',
  beauty: 'beauty',
  commerce: 'commerce',
};

const CATEGORY_LABEL_MESSAGE_IDS: Record<string, string> = {
  technology: 'nav.category.technology',
  gaming: 'nav.category.gaming',
  news: 'nav.category.news',
  education: 'nav.category.education',
  entertainment: 'nav.category.entertainment',
  travel: 'menu.categories.travel',
  finance: 'menu.categories.finance',
  movies: 'menu.categories.movies',
  beauty: 'menu.categories.beauty',
  commerce: 'menu.commerce',
};

export const getCanonicalCategorySlug = (slug?: string) =>
  CATEGORY_ALIASES[String(slug || '').toLowerCase()] ||
  String(slug || '').toLowerCase();

export const getLocalizedCategoryLabel = (
  intl: any,
  category: { slug?: string; name?: string },
) => {
  const canonicalSlug = getCanonicalCategorySlug(
    category.slug || category.name,
  );
  const messageId = CATEGORY_LABEL_MESSAGE_IDS[canonicalSlug];

  if (messageId) {
    return intl.formatMessage({ id: messageId });
  }

  return category.name || category.slug || '';
};
