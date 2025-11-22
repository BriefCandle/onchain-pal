export function unixTimeSecond() {
  return Math.floor(Date.now() / 1000);
}

export function unixTime() {
  return Date.now();
}

export function formatTimestamp(timestamp: number) {
  if (!timestamp) return "N/A";
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  return `${year}/${month}/${day} ${hour}:${minute}:${second}`;
}
