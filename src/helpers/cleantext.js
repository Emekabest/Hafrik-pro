

const CleanText = (text) => {

  const cleanText = text ? text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/p>/gi, '\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&rsquo;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#039;/g, "'")
        .replace(/&ndash;/g, '-')
        .replace(/&ldquo;/g, '“')
        .replace(/&bull;/g, '*')
        .trim() : '';

    return cleanText;
}

export default CleanText;