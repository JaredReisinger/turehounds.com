import debugFn from 'debug';
import type { EleventyConfig } from '11ty.ts';

import * as addins from './addins.js';
import { pick } from './filters.js';

const debug = debugFn('plugin:helpers');

// TODO: we should define our expectation about configOptions and export it!
export default function (
  eleventyConfig: EleventyConfig,
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
    //@ts-expect-error -- (2345) The types for addFilter think the filter
    // function can only return string, but that's not accurate. A filter can
    // return anything that another filter can take as input.  Therefore, we
    // expect/ignore this error.
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
    pick(eleventyConfig as EleventyConfig & { dir: unknown; pathPrefix: unknown }, [
      'collections',
      'dir',
      'pathPrefix',
    ])
  );
}
