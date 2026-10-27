// Utility to format date as YYYY-MM-DD
const formatDateYYYYMMDD = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Calculate difference in working minutes between two timestamps
const calculateMinutesDiff = (start, end) => {
  if (!start || !end) return 0;
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (endTime < startTime) return 0;
  return Math.round((endTime - startTime) / (1000 * 60));
};

// Format minutes into "Xh Ym"
const formatMinutes = (minutes = 0) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

module.exports = {
  formatDateYYYYMMDD,
  calculateMinutesDiff,
  formatMinutes
};
