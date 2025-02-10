import debugFn from 'debug';
import { basename } from 'node:path';
import type UserConfig from '../../@types/@11ty/eleventy/src/UserConfig';

import { backgroundImage, image, imageSync, imageUrl } from './images';
// import {
//   autoGallery as autoGalleryPswp,
//   galleryHeadTransform as galleryHeadTransformPswp,
//   staticFiles as staticFilesPswp,
// } from './gallery-photoswipe';
import {
  autoGallery as autoGalleryBp,
  fileGallery as fileGalleryBp,
  galleryHeadTransform as galleryHeadTransformBp,
  staticFiles as staticFilesBp,
} from './gallery-bigger-picture';

const debug = debugFn('plugin:images');

// So... the examples that create shortcodes for eleventy-image don't have great
// consumability/extensibility design.  This plugin attempts to solve some of
// those problems.

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

  // eleventyConfig.addAsyncShortcode('autoGalleryPswp', autoGalleryPswp);
  eleventyConfig.addAsyncShortcode('autoGallery', autoGalleryBp);
  eleventyConfig.addAsyncShortcode('fileGallery', fileGalleryBp);

  // copy dependency files -- TODO: pass static css/js locations in config?
  // eleventyConfig.addPassthroughCopy(
  //   passthroughMapper(staticFilesPswp.js, 'js')
  // );
  // eleventyConfig.addPassthroughCopy(
  //   passthroughMapper(staticFilesPswp.css, 'css')
  // );

  eleventyConfig.addPassthroughCopy(passthroughMapper(staticFilesBp.js, 'js'));
  eleventyConfig.addPassthroughCopy(
    passthroughMapper(staticFilesBp.css, 'css')
  );

  // add transform for injecting scripts, etc.
  // eleventyConfig.addTransform(
  //   'galleryHeadTransformPswp',
  //   galleryHeadTransformPswp
  // );
  eleventyConfig.addTransform('galleryHeadTransformBp', galleryHeadTransformBp);
}

function passthroughMapper(srcs: string[], outDir: string) {
  return srcs.reduce((memo, val) => {
    memo[val] = `static/${outDir}/${basename(val)}`;
    return memo;
  }, {});
}
