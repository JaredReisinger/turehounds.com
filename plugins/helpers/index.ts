import debugFn from 'debug';
import type UserConfig from '../../@types/@11ty/eleventy/src/UserConfig';

import * as addins from './addins';
import { pick } from './filters.js';

const debug = debugFn('plugin:helpers');

// TODO: we should define our expectation about configOptions and export it!
export default function (
  eleventyConfig: UserConfig,
  configOptions: Record<PropertyKey, unknown>
) {
  debug('loading helpers with config', configOptions);

  // Add all filters/shortcodes from our helper addins...
  Object.entries(addins.filters?.async).forEach(([k, v]) => {
    debug(`adding async filter ${k}...`);
    eleventyConfig.addAsyncFilter(k, v);
  });

  Object.entries(addins.filters?.sync).forEach(([k, v]) => {
    debug(`adding sync filter ${k}...`);
    eleventyConfig.addFilter(k, v);
  });

  Object.entries(addins.shortcodes?.async).forEach(([k, v]) => {
    debug(`adding async shortcode ${k}...`);
    eleventyConfig.addAsyncShortcode(k, v);
  });

  Object.entries(addins.shortcodes?.sync).forEach(([k, v]) => {
    debug(`adding sync shortcode ${k}...`);
    eleventyConfig.addShortcode(k, v);
  });

  // if (addins.withConfig) {
  //   addins.withConfig(eleventyConfig, configOptions);
  // }

  eleventyConfig.addGlobalData('debugConfig', () =>
    // somehow, we know that dir and pathPrefix are added by the time the
    // function is called... is this documented anywhere?
    pick(eleventyConfig as UserConfig & { dir: unknown; pathPrefix: unknown }, [
      'collections',
      'dir',
      'pathPrefix',
    ])
  );
}
