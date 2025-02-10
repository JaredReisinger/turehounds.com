// Image shortcode implementations
import Image from '@11ty/eleventy-img';
import { generateHtml, generateHtmlObject } from './html.js';
import { ImageGenOptions, ImageOptions } from './options.js';

// We want the general-purpose `image` shortcode to be async, which allows the
// image to be on-disk before the update is rendered and the browser refreshed.
// But for a Nunjucks macro, we need non-async because macros can't use async.
// To that end, this is factored to share as much implementation as possible.
//
// Also, the documentation on @11ty/eleventy-img doesn't really describe a lot
// about what the attributes and options mean, and the names are vague.  As this
// gets refined, we will hopefully add some clarity.
//
// The shortcodes need to generate HTML (string) output, but the sync/async
// difference is basically in the very first lines of code, which makes sharing
// an implementation tricky.

/** The standard set of sizes/formats we want to generate */
const defaultImageGenOpts: ImageGenOptions = {
  widths: [null, 1280, 1024, 600],
  formats: ['webp', 'jpg'],
  outputDir: './_site/static/img/',
  urlPath: '/static/img/',
};

/**
 * Renders a `<picture>` element for a given image.
 * @param src Path to the original image.
 * @param options Rendering options.
 * @returns Rendered HTML string for the image.
 */
export async function image(
  src: string,
  options: Partial<ImageOptions> | undefined = undefined
) {
  // kick off--and wait for!--the image to generate
  const genOpts = mergeImageGenOptions(options?.generate);
  const metadata = await Image(src, genOpts);
  const html = generateHtml(src, metadata, options);
  return html;
}

/**
 * Renders a `<picture>` element for a given image.
 * @param src Path to the original image.
 * @param options Rendering options.
 * @returns Rendered HTML string for the image.
 */
export function imageSync(
  src: string,
  options: Partial<ImageOptions> | undefined = undefined
) {
  // kick off image generation, but don't await it!
  const genOpts = mergeImageGenOptions(options?.generate);
  Image(src, genOpts);
  const metadata = Image.statsSync(src, genOpts);
  const html = generateHtml(src, metadata, options);
  return html;
}

/**
 * A helper for thumbnail images, generating just a single, specific-width
 * image.  Intended for things like open-graph tags and the like.
 * @param src Path to the original image.
 * @param width Target width for the image.
 * @returns A URL for the generated image.
 */
export function imageUrl(src: string, width: number) {
  const genOpts = mergeImageGenOptions({ widths: [width], formats: ['jpg'] });
  // const metadata = await Image(src, genOpts);
  Image(src, genOpts);
  const metadata = Image.statsSync(src, genOpts);
  const obj = generateHtmlObject(src, metadata);
  // console.log('****', obj.src);
  // require object to be { $tag: 'img' }?
  return obj.src as string;
}

/**
 * Merges provided image generation options with the default.
 * @param options generation options
 * @returns Merged object.
 */
function mergeImageGenOptions(options?: Partial<ImageGenOptions>) {
  return Object.assign({}, defaultImageGenOpts, options);
}

// /**
//  * @typedef {object} BackgroundImageOptions
//  * @property {string} quote Character to use for quote (' by default).
//  * @property {string} before List of layers to put before the image.
//  * @property {string} after List of layers to put before the image.
//  */

export interface BackgroundImageOptions {
  /**  Character to use for quote (`'` by default). */
  quote: string;
  /**  List of layers to put before the image. */
  before: string;
  /**  List of layers to put before the image. */
  after: string;
}

/**
 * Returns a series of `background-image` values to be used in the style of an
 * element in order to give it a background image.
 * @param src original source image
 * @param options options for background-image
 */
export async function backgroundImage(
  src: string,
  options: BackgroundImageOptions
) {
  const opts = Object.assign({}, { quote: "'" }, options);
  const { quote, before, after } = opts;

  // For background-image image-set, there's a way to specify "resolution", but
  // not "size".  We aim for a reasonable resolution (1280) with no size
  // fallbacks.
  const metadata = await Image(src, {
    ...defaultImageGenOpts,
    widths: [1280],
    sharpWebpOptions: { quality: 50 },
    sharpJpegOptions: { quality: 50 },
  });
  // console.log('background metadata', metadata);
  const formats = Object.values(metadata).map((list) => list[0]);

  const imageSet = formats
    .map((format) => {
      return `url(${quote}${format.url}${quote}) type(${quote}${format.sourceType}${quote})`;
    })
    .join(', ');

  // Many browsers don't support the "by type", so we include non-image-set as
  // well... (and if they don't handle image-set, they might not handle webp,
  // either, so we just fall back to jpeg.)
  const bgImageKinds = [
    `url(${metadata.jpeg[0].url})`,
    `-webkit-image-set(${imageSet})`,
    `image-set(${imageSet})`,
  ];

  return bgImageKinds
    .map(
      (kind) =>
        `background-image: ${before ? `${before}, ` : ''}${kind}${
          after ? `, ${after}` : ''
        };`
    )
    .join(' ');
}
