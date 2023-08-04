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

  // copy dependency files -- TODO: pass static css/js locations in config?
  eleventyConfig.addPassthroughCopy({
    // photoswipe
    'node_modules/photoswipe/dist/photoswipe.esm.min.js':
      'static/js/photoswipe.esm.min.js',
    'node_modules/photoswipe/dist/photoswipe-lightbox.esm.min.js':
      'static/js/photoswipe-lightbox.esm.min.js',
    'node_modules/photoswipe/dist/photoswipe.css': 'static/css/photoswipe.css',
    // photoswipe captions
    'node_modules/photoswipe-dynamic-caption-plugin/dist/photoswipe-dynamic-caption-plugin.esm.min.js':
      'static/js/photoswipe-dynamic-caption-plugin.esm.min.js',
    'node_modules/photoswipe-dynamic-caption-plugin/photoswipe-dynamic-caption-plugin.css':
      'static/css/photoswipe-dynamic-caption-plugin.css',
  });
}
