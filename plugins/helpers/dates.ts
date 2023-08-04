import { DateTime } from 'luxon';

function readableDate(date: Date) {
  return DateTime.fromJSDate(date, { zone: 'utc' }).toFormat('dd LLL yyyy');
}

function toISO(date: Date) {
  return DateTime.fromJSDate(date, { zone: 'utc' }).toISO();
}

function year() {
  return new Date().getFullYear().toString();
}

export const filters = {
  async: {},
  sync: {
    readableDate,
    toISO,
  },
};

export const shortcodes = {
  async: {},
  sync: {
    year,
  },
};
