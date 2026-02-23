// src/helpers/linkparser.js

/**
 * Parses text to separate the first URL found from the rest of the text.
 * @param {string} text - The input text containing a message and optionally a URL.
 * @returns {object} - Returns an object { text, url }.
 */
export const parseLinkFromText = (text) => {
    if (!text) return { text: '', url: null };

    // Regex to find http/https URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const match = text.match(urlRegex);

    if (match && match.length > 0) {
        const url = match[0];
        // Remove the URL from the text and trim whitespace
        const cleanText = text.replace(url, '').trim();
        return { text: cleanText, url };
    }

    return { text: text, url: null };
};

export default parseLinkFromText;