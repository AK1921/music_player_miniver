((scope) => {
  function selectTranslation(data, query, target) {
    if (Number(data?.responseStatus) !== 200) return '';
    const translation = data.responseData?.translatedText;
    if (typeof translation !== 'string' || !translation.trim()) return '';
    const normalize = text => text.trim().normalize('NFC').toLowerCase();
    if (normalize(translation) !== normalize(query) || !Array.isArray(data.matches)) return translation;

    // The memory can rank an untranslated copy above a near-exact translation.
    const locale = target.toLowerCase();
    return data.matches.find(match =>
      Number(match.match) >= 0.98 &&
      typeof match.translation === 'string' && match.translation.trim() &&
      normalize(match.segment || '') === normalize(query) &&
      (match.target?.toLowerCase() === locale || match.target?.toLowerCase().startsWith(locale + '-')) &&
      normalize(match.translation) !== normalize(query)
    )?.translation || translation;
  }

  if (typeof module === 'object' && module.exports) module.exports = selectTranslation;
  else scope.selectTranslation = selectTranslation;
})(globalThis);
