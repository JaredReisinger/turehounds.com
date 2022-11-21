const fs = require('fs');
const path = require('path');
const glob = require('glob');

// const UserConfig = require('@11ty/eleventy/src/UserConfig');
const Image = require('@11ty/eleventy-img');

const { generateBetterObject, renderObjectHTML } = require('./images');

/**
 * @typedef GalleryOptions
 * @type {object}
 * @property {string} galleryGlob Glob for gallery image files, relative to the current page.
 * @property {import('./images').ElementAttributes} containerAttrs Attributes (classes, styles) for the container element.
 * @property {import('./images').ImageOptions} imageOptions
 */

const DEFAULT_OPTIONS = {
  galleryGlob: 'gallery/*.{jpg,JPG,jpeg,JPEG,png,PNG,heic,HEIC}',
  containerAttrs: {
    class: 'columns-xs gap-4 my-8',
  },
  imageOptions: {
    sizes: '20rem', // columns-xs gives a 20rem-wide column
    image: {
      class: 'rounded-lg mb-4 block w-full',
    },
  },
};

/**
 * Creates an image gallery from the images in the "gallery" subdirectory of the
 * current page.  Defaults to `columns-xs`-sized images, which aims for roughly
 * 20rem width presentation.
 *
 * As with the "improved" image shortcodes, this takes an option object rather
 * than positional parameters.  Also note that the `options.imageOptions` value
 * (passed to the image shortcode) is independetly merged with the defaults so
 * that if you only set classes, for example, you still get the default sizes.
 * @param {GalleryOptions} options
 * @param {string} galleryClasses
 * @param {string} imageClasses
 * @returns
 */
async function autoGallery(options = undefined) {
  // merge options and defaults (note additional merging for imageOptions)
  const opts = Object.assign({}, DEFAULT_OPTIONS, options, {
    imageOptions: Object.assign(
      {},
      DEFAULT_OPTIONS.imageOptions,
      options?.imageOptions
    ),
  });
  const { page } = this;
  console.log('building auto-gallery for', page.url);

  // output dir will be same as the page
  const outputDir = path.dirname(page.outputPath);

  const images = glob.sync(
    path.resolve(path.dirname(page.inputPath), opts.galleryGlob)
  );

  const items = await Promise.all(
    images.map(async (image) => {
      const metadata = await Image(image, {
        widths: [1200, 900, 600, 300],
        formats: ['webp', 'jpg'],
        outputDir,
        urlPath: page.url,
      });
      // console.log('image metadata', { image, metadata }, metadata);
      return { src: image, metadata };
    })
  );

  // console.log('auto-gallery?', items);
  const galleryObj = {
    div: {
      ...opts.containerAttrs,
      children: items.map(({ src, metadata }) => ({
        div: {
          ...opts.imageOptions?.image,
          children: [generateBetterObject(src, metadata, opts.imageOptions)],
        },
      })),
    },
  };

  // The `<picture>` element needs to be wrapped in a `div` to get actual column
  // behavior.  Also note that this isn't true masonry, row-first layout, it's
  // column-first layout.
  const html = renderObjectHTML(galleryObj);
  return html;
}

module.exports = {
  filters: {
    async: {},
    sync: {},
  },
  shortcodes: {
    async: { autoGallery },
    sync: {},
  },
  // withConfig,
};
