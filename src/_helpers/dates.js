const { DateTime } = require('luxon');

function readableDate(dateObj) {
  return DateTime.fromJSDate(dateObj, { zone: 'utc' }).toFormat('dd LLL yyyy');
}

function year() {
  return new Date().getFullYear().toString();
}

module.exports = {
  filters: {
    async: {},
    sync: {
      readableDate,
    }
  },
  shortcodes: {
    async: {},
    sync: {
      year,
    }
  },
}
