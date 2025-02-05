export function formatMessageTime(date, use24HourFormat = true) {
  const messageDate = new Date(date);
  if (isNaN(messageDate)) return "Invalid Date";

  const now = new Date();
  const isToday = messageDate.toDateString() === now.toDateString();
  const isYesterday = messageDate.toDateString() === new Date(now.setDate(now.getDate() - 1)).toDateString();

  let formattedTime = messageDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: !use24HourFormat,
  });

  if (isToday) return `Today, ${formattedTime}`;
  if (isYesterday) return `Yesterday, ${formattedTime}`;

  return messageDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }) + `, ${formattedTime}`;
}
