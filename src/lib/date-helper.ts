const parseUTC = (timestamp: string): Date => {
  // Ensure timestamp is treated as UTC even if the Z suffix is missing
  if (!timestamp.endsWith("Z") && !timestamp.includes("+")) {
    return new Date(timestamp + "Z");
  }
  return new Date(timestamp);
};

/** 本地时间格式化成 2026-10-06 17:07:25 */
export const formatDateTime = (date: Date = new Date()): string => {
  const pad = (value: number) => `${value}`.padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
};

/** 本地日期格式化成 2026-10-06（也可直接传 supabase 返回的时间字符串） */
export const formatDate = (value: Date | string = new Date()): string => {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => `${n}`.padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const formatTimeAgo = (createdAt: string): string => {
  const now = new Date();
  const created = parseUTC(createdAt);
  const diff = now.getTime() - created.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

export const formatTimeRemaining = (expiresAt: string): string => {
  const now = new Date();
  const expires = parseUTC(expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) return "Expired";

  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours > 0) {
    return `${hours}h ${minutes}m left`;
  }
  return `${minutes}m left`;
};
