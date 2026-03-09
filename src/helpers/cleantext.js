
const CleanText = (text) => {
  if (!text) return '';

  const cleanText = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    // Must decode &amp; first to avoid double-decoding
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '”')
    .replace(/&apos;/g, '\'')
    // Apostrophes / single quotes
    .replace(/&rsquo;/g, '\u2019')
    .replace(/&lsquo;/g, '\u2018')
    .replace(/&#039;/g, '\'')
    .replace(/&#39;/g, '\'')
    .replace(/&#8217;/g, '\u2019')
    .replace(/&#8216;/g, '\u2018')
    // Double quotes
    .replace(/&ldquo;/g, '\u201C')
    .replace(/&rdquo;/g, '\u201D')
    .replace(/&#8220;/g, '\u201C')
    .replace(/&#8221;/g, '\u201D')
    // Dashes
    .replace(/&ndash;/g, '\u2013')
    .replace(/&mdash;/g, '\u2014')
    .replace(/&#8211;/g, '\u2013')
    .replace(/&#8212;/g, '\u2014')
    // Ellipsis
    .replace(/&hellip;/g, '\u2026')
    .replace(/&#8230;/g, '\u2026')
    // Misc
    .replace(/&bull;/g, '\u2022')
    .replace(/&copy;/g, '\u00A9')
    .replace(/&reg;/g, '\u00AE')
    .replace(/&trade;/g, '\u2122')
    .replace(/&euro;/g, '\u20AC')
    .replace(/&pound;/g, '\u00A3')
    .replace(/&times;/g, '\u00D7')
    .replace(/&divide;/g, '\u00F7')
    // Catch-all numeric refs &#NNN; and &#xHHH;
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    // Whitespace cleanup
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return cleanText;
};

export default CleanText;