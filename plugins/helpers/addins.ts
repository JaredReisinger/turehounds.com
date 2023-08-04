// import UserConfig from '@11ty/eleventy/src/UserConfig';

import * as dates from './dates';
import * as filtersImpl from './filters';
import * as galleries from './galleries';
import * as images from './images';
// import * as titles from '../../src/_helpers/titles';

// const addins = [dates, filtersImpl, galleries, images];

// // This may be overkill... only filtersImpl uses it, to add a "debugConfig"
// // data source.... perhaps hoist that into the main index.ts config function
// // directly?
// export function withConfig(
//   eleventyConfig: UserConfig,
//   configOptions: Record<PropertyKey, unknown>
// ) {
//   addins.forEach((addin) => {
//     if ('withConfig' in addin) {
//       addin.withConfig(eleventyConfig, configOptions);
//     }
//   });
// }

// note sure if the coded reduce of filters/shortcodes is better with types...
export const filters = {
  async: {
    ...dates.filters.async,
    ...filtersImpl.filters.async,
    ...galleries.filters.async,
    ...images.filters.async,
    // ...titles.filters.async,
  },
  sync: {
    ...dates.filters.sync,
    ...filtersImpl.filters.sync,
    ...galleries.filters.sync,
    ...images.filters.sync,
    // ...titles.filters.sync,
  },
};

export const shortcodes = {
  async: {
    ...dates.shortcodes.async,
    ...filtersImpl.shortcodes.async,
    ...galleries.shortcodes.async,
    ...images.shortcodes.async,
    // ...titles.shortcodes.async,
  },
  sync: {
    ...dates.shortcodes.sync,
    ...filtersImpl.shortcodes.sync,
    ...galleries.shortcodes.sync,
    ...images.shortcodes.sync,
    // ...titles.shortcodes.sync,
  },
};
