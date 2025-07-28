export function formatDateWithTime(date) {
    const d = new Date(date);

    const day = d.getDate();
    const ordinal = (n) => {
        const s = ["th", "st", "nd", "rd"];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };

    const formattedDate = `${ordinal(day)} ${d.toLocaleString("en-US", {
        month: "long",
        year: "numeric",
    })}`;

    const time = d.toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    }).toLowerCase();

    return `${formattedDate}, ${time}`;
}