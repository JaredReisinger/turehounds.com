import { DateTime, Zone } from 'luxon';

type Dateable = DateTime | Date | string;

function luxonify(date: Dateable, zone?: string | Zone) {
  // if (!date) {
  //   return undefined;
  // }

  if (DateTime.isDateTime(date)) {
    return date;
  }

  let dt: DateTime;
  if (date instanceof Date) {
    return DateTime.fromJSDate(date, { zone: zone || 'utc' });
  }

  dt = DateTime.fromISO(date, {
    zone: zone || 'America/Phoenix',
    setZone: true,
  });
  if (dt.isValid) {
    return dt;
  }

  throw new Error(`could not parse ${date} as luxon.DateTime`);
}

function dateify(date: Dateable) {
  return luxonify(date, 'utc');
}

function readableDate(date: Dateable) {
  return luxonify(date).toFormat('dd LLL yyyy');
}

function toISO(date: Dateable) {
  return luxonify(date).toISO();
}

function year() {
  return new Date().getFullYear().toString();
}

export const filters = {
  async: {},
  sync: {
    luxonify,
    dateify,
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
