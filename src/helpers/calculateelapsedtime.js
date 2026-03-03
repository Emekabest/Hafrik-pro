const CalculateElapsedTime = (dateString) => {
    if (!dateString) return "";

    // Parse as UTC: replace space separator, then append Z if no timezone info present
    const iso = dateString.replace(' ', 'T');
    const utc = iso.endsWith('Z') || iso.includes('+') || /[+-]\d{2}:\d{2}$/.test(iso)
      ? iso
      : iso + 'Z';
    const date = new Date(utc);
    const now = new Date();
    
    // Calculate difference in seconds
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return "Just now";

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) {
        return interval + (interval === 1 ? " year" : " years");
    }

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
        return interval + (interval === 1 ? " month" : " months");
    }

    interval = Math.floor(seconds / 604800);
    if (interval >= 1) {
        return interval + (interval === 1 ? " week" : " weeks");
    }

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
        return interval + (interval === 1 ? " day" : " days");
    }

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
        return interval + (interval === 1 ? "h" : "h");
    }

    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
        return interval + (interval === 1 ? "m" : "m");
    }

    return "Just now";
};

export default CalculateElapsedTime;