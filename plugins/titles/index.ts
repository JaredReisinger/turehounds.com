import debugFn from 'debug';
import type { EleventyConfig } from '11ty.ts';

import {
  ensureTitleMap,
  getTitleEvents,
  getTitleLevels,
  titlify,
} from './titles.js';

const debug = debugFn('plugin:titles');

// TODO: we should define our expectation about configOptions and export it!
export default function (
  eleventyConfig: EleventyConfig,
  _configOptions?: any,
) {
  debug('loading titles plugin' /* , configOptions */);

  eleventyConfig.addFilter('titlify', titlify);

  eleventyConfig.addGlobalData('titleMap', ensureTitleMap);
  eleventyConfig.addGlobalData('titleLevels', getTitleLevels);
  eleventyConfig.addGlobalData('titleEvents', getTitleEvents);
}
