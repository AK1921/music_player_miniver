async function translateWithGoogle(query, source, target, apiKey) {
  const endpoint = new URL('https://translation.googleapis.com/language/translate/v2');
  endpoint.searchParams.set('key', apiKey);
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: query, source: source === 'auto' ? undefined : source, target, format: 'text' }),
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    const entry = data.data?.translations?.[0];
    const translation = entry?.translatedText;
    if (response.ok && typeof translation === 'string' && translation.trim()) {
      return { translation, translatedText: translation, sourceLanguage: entry.detectedSourceLanguage || source, plainText: true, success: true, status: 'ok' };
    }
  } catch { /* Report a consistent provider error without exposing credentials. */ }
  return { success: false, error: 'Google Cloud Translation could not complete this request.' };
}

module.exports = translateWithGoogle;
