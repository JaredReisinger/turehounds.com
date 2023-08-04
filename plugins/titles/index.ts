import debugFn from 'debug';
import type UserConfig from '../../@types/@11ty/eleventy/src/UserConfig';

import {
  ensureTitleMap,
  getTitleEvents,
  getTitleLevels,
  titlify,
} from './titles';

const debug = debugFn('plugin:titles');

// TODO: we should define our expectation about configOptions and export it!
export default function (
  eleventyConfig: UserConfig,
  // configOptions: Record<PropertyKey, unknown>,
) {
  debug('loading titles plugin' /* , configOptions */);

  eleventyConfig.addFilter('titlify', titlify);

  eleventyConfig.addGlobalData('titleMap', ensureTitleMap);
  eleventyConfig.addGlobalData('titleLevels', getTitleLevels);
  eleventyConfig.addGlobalData('titleEvents', getTitleEvents);
}
