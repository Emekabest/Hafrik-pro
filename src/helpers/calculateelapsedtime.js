import moment from 'moment';

const CalculateElapsedTime = (dateString) => {
    if (!dateString) return "";

    // If the string already carries timezone info (Z, +HH:MM, -HH:MM)
    // let moment parse it as-is — the offset is already correct.
    // Otherwise assume the server sent a bare UTC timestamp and convert
    // to the device's local timezone before computing relative time.



    const hasTimezone =
        dateString.includes('Z') ||
        /[+-]\d{2}:\d{2}$/.test(dateString) ||
        (dateString.includes('+') && !dateString.startsWith('+'));

    if (hasTimezone) {
        return moment(dateString).fromNow();
    }

    return moment.utc(dateString).local().fromNow();
};

export default CalculateElapsedTime;
