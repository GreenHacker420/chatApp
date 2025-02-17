export function formatMessageTime(date, use24HourFormat = true) {
  const messageDate = new Date(date);
  if (isNaN(messageDate)) return "Invalid Date";

  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = messageDate.toDateString() === now.toDateString();
  const isYesterday = messageDate.toDateString() === yesterday.toDateString();

  const timeOptions = { hour: "2-digit", minute: "2-digit", hour12: !use24HourFormat };
  const formattedTime = messageDate.toLocaleTimeString("en-US", timeOptions);

  if (isToday) return `Today, ${formattedTime}`;
  if (isYesterday) return `Yesterday, ${formattedTime}`;

  return messageDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) + `, ${formattedTime}`;
}
