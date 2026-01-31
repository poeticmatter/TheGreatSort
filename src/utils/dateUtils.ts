export const getTodayDateString = () => {
  const d = new Date();
  // Use Local Time for Session Continuity
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};


