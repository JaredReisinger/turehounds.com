import UserConfig from '@11ty/eleventy/src/UserConfig';

import * as dates from './dates';
import * as filtersImpl from './filters';
import * as galleries from './galleries';
import * as images from './images';
import * as titles from './titles';

const addins = [dates, filtersImpl, galleries, images, titles];

// interface Addins {
//   filters: {
//     async: typeof dates.filters.async &
//       typeof filters.filters.async &
//       typeof galleries.filters.async &
//       typeof images.filters.async &
//       typeof titles.filters.async;
//     sync: typeof dates.filters.sync &
//       typeof filters.filters.sync &
//       typeof galleries.filters.sync &
//       typeof images.filters.sync &
//       typeof titles.filters.sync;
//   };
//   shortcodes: {
//     async: typeof dates.shortcodes.async &
//       typeof filters.shortcodes.async &
//       typeof galleries.shortcodes.async &
//       typeof images.shortcodes.async &
//       typeof titles.shortcodes.async;
//     sync: typeof dates.shortcodes.sync &
//       typeof filters.shortcodes.sync &
//       typeof galleries.shortcodes.sync &
//       typeof images.shortcodes.sync &
//       typeof titles.shortcodes.sync;
//   };
// }

// const filtersAndShortcodes = addins.reduce<Addins>(
//   (memo, addin) => {
//     memo.filters.async = { ...memo.filters.async, ...addin.filters?.async };
//     memo.filters.sync = { ...memo.filters.sync, ...addin.filters?.sync };
//     memo.shortcodes.async = {
//       ...memo.shortcodes.async,
//       ...addin.shortcodes?.async,
//     };
//     memo.shortcodes.sync = {
//       ...memo.shortcodes.sync,
//       ...addin.shortcodes?.sync,
//     };
//     return memo;
//   },
//   {
//     filters: { async: {}, sync: {} },
//     shortcodes: { async: {}, sync: {} },
//   } as Addins
// );

export function withConfig(
  eleventyConfig: UserConfig,
  configOptions: Record<PropertyKey, unknown>
) {
  addins.forEach((addin) => {
    if ('withConfig' in addin) {
      addin.withConfig(eleventyConfig, configOptions);
    }
  });
}

// module.exports = {
//   ...filtersAndShortcodes,
//   withConfig,
// };

// note sure if the coded reduce of filters/shortcodes is better with types...
export const filters = {
  async: {
    ...dates.filters.async,
    ...filtersImpl.filters.async,
    ...galleries.filters.async,
    ...images.filters.async,
    ...titles.filters.async,
  },
  sync: {
    ...dates.filters.sync,
    ...filtersImpl.filters.sync,
    ...galleries.filters.sync,
    ...images.filters.sync,
    ...titles.filters.sync,
  },
};

export const shortcodes = {
  async: {
    ...dates.shortcodes.async,
    ...filtersImpl.shortcodes.async,
    ...galleries.shortcodes.async,
    ...images.shortcodes.async,
    ...titles.shortcodes.async,
  },
  sync: {
    ...dates.shortcodes.sync,
    ...filtersImpl.shortcodes.sync,
    ...galleries.shortcodes.sync,
    ...images.shortcodes.sync,
    ...titles.shortcodes.sync,
  },
};
