export const getTodayDateString = () => {
  const d = new Date();
  // Use UTC for consistent Daily Challenge globally
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getYesterdayDateString = () => {
  const d = new Date();
  // Subtract one day
  //d.setUTCDate(d.getUTCDate() - 1);

  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
