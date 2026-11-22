import catalog from '../../../web/translation-languages.json';

export type Language = { code: string; name: string; locale: string };
export const languages: Language[] = catalog;

export function customLanguage(value: string): Language | undefined {
  const tag = value.trim();
  if (!/^[a-z]{2,3}(?:-[a-z]{4})?(?:-[a-z]{2}|-\d{3})?$/i.test(tag)) return;
  try {
    const [locale] = Intl.getCanonicalLocales(tag);
    return languages.find(language => language.code === locale || language.locale === locale) ??
      { code: locale, name: locale, locale };
  } catch {
    return undefined;
  }
}

export async function translateText(text: string, from: Language, to: Language, signal: AbortSignal) {
  const query = encodeURIComponent(text.trim());
  if (query.replace(/%[\dA-F]{2}/g, ' ').length > 500) {
    throw new Error('Try a shorter phrase. The free service accepts up to 500 bytes per turn.');
  }

  // Primary attempt with standard language code
  let pair = `${from.code}|${to.code}`;
  let response = await fetch(
    `https://api.mymemory.translated.net/get?q=${query}&langpair=${encodeURIComponent(pair)}`,
    { signal, headers: { 'Cache-Control': 'no-store' } },
  );

  let data = await response.json();
  let status = Number(data?.responseStatus);

  // Fallback to 2-letter ISO code if needed (e.g. te-IN -> te)
  if (status !== 200) {
    const fromShort = from.code.split(/[-_]/)[0];
    const toShort = to.code.split(/[-_]/)[0];
    if (fromShort !== from.code || toShort !== to.code) {
      pair = `${fromShort}|${toShort}`;
      response = await fetch(
        `https://api.mymemory.translated.net/get?q=${query}&langpair=${encodeURIComponent(pair)}`,
        { signal, headers: { 'Cache-Control': 'no-store' } },
      );
      data = await response.json();
      status = Number(data?.responseStatus);
    }
  }

  if (response.status === 429 || status === 403 || status === 429) {
    throw new Error('The free translation service has reached its usage limit. Try again later.');
  }
  const translated = data?.responseData?.translatedText;
  if (!response.ok || status !== 200 || typeof translated !== 'string' || !translated.trim()) {
    throw new Error('Translation is unavailable. Try again shortly.');
  }
  const entities: Record<string, string> = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', nbsp: ' ' };
  return translated.replace(/&(#\d+|#x[\da-f]+|amp|quot|apos|lt|gt|nbsp);/gi, (match, entity: string) => {
    if (entity[0] !== '#') return entities[entity.toLowerCase()] ?? match;
    const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}
