/**
 * Helper function to format date as dd/mm/yyyy
 * @param {Date} date 
 * @returns {string}
 */
function formatDate(date) {
  const d = new Date(date);
  if (isNaN(d)) return 'Invalid Date';
  return `${d.getDate().toString().padStart(2, '0')}/${
    (d.getMonth() + 1).toString().padStart(2, '0')
  }/${d.getFullYear()}`;
}

/**
 * Helper function to parse numeric values
 * @param {any} value 
 * @returns {number}
 */
function parseValue(value) {
  if (typeof value === 'string') {
    return parseFloat(value.replace(/\./g, '').replace(/,/g, '.')) || 0;
  } else if (typeof value === 'number') {
    return value;
  } else {
    return 0;
  }
}