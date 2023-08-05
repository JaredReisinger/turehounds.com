// import UserConfig from '@11ty/eleventy/src/UserConfig';

import * as dates from './dates';
import * as filtersImpl from './filters';

// note sure if the coded reduce of filters/shortcodes is better with types...
export const filters = {
  async: {
    ...dates.filters.async,
    ...filtersImpl.filters.async,
  },
  sync: {
    ...dates.filters.sync,
    ...filtersImpl.filters.sync,
  },
};

export const shortcodes = {
  async: {
    ...dates.shortcodes.async,
    ...filtersImpl.shortcodes.async,
  },
  sync: {
    ...dates.shortcodes.sync,
    ...filtersImpl.shortcodes.sync,
  },
};
