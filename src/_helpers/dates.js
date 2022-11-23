const { DateTime } = require('luxon');

function readableDate(dateObj) {
  return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat('dd LLL yyyy');
}

function toISO(dateObj) {
  return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toISO();
}

function year() {
  return new Date().getFullYear().toString();
}

module.exports = {
  filters: {
    async: {},
    sync: {
      readableDate,
      toISO,
    }
  },
  shortcodes: {
    async: {},
    sync: {
      year,
    }
  },
}
