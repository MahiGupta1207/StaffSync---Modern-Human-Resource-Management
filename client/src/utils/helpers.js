// Format date for display: "27 Oct 2026"
export const formatDate = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// Format time: "09:30 AM"
export const formatTime = (date) => {
  if (!date) return '—';
  return new Date(date).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

// "27 Oct 2026, 09:30 AM"
export const formatDateTime = (date) => {
  if (!date) return '—';
  return `${formatDate(date)}, ${formatTime(date)}`;
};

// "2026-10-27"
export const toYYYYMMDD = (date = new Date()) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
};

// Minutes → "8h 30m"
export const minutesToHM = (minutes = 0) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

// Relative time: "3 minutes ago"
export const timeAgo = (date) => {
  if (!date) return '';
  const now  = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)   return `${days}d ago`;
  return formatDate(date);
};

// Initials from name: "Eleanor Vance" → "EV"
export const initials = (name = '') =>
  name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// Get today full date string: "Tuesday, 27 October 2026"
export const todayFull = () =>
  new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

// Capitalize first letter
export const capitalize = (str = '') =>
  str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

// Human-readable enum values
export const humanEnum = (str = '') =>
  str.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

// Extract error message from Axios error
export const getErrorMsg = (err) =>
  err?.response?.data?.message || err?.message || 'Something went wrong';
