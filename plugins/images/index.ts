import debugFn from 'debug';
import type UserConfig from '../../@types/@11ty/eleventy/src/UserConfig';

import { backgroundImage, image, imageSync, imageUrl } from './images';
import { autoGallery, galleryHeadTransform } from './galleries';

const debug = debugFn('plugin:images');

// TODO: we should define our expectation about configOptions and export it!
export default function (
  eleventyConfig: UserConfig
  // configOptions: Record<PropertyKey, unknown>,
) {
  debug('loading images plugin' /* , configOptions */);

  eleventyConfig.addAsyncShortcode('image', image);
  eleventyConfig.addAsyncShortcode('backgroundImage', backgroundImage);
  eleventyConfig.addShortcode('imageSync', imageSync);
  eleventyConfig.addShortcode('imageUrl', imageUrl);

  eleventyConfig.addAsyncShortcode('autoGallery', autoGallery);

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

  // add transform for injecting scripts, etc.
  eleventyConfig.addTransform('galleryHeadTransform', galleryHeadTransform);
}
