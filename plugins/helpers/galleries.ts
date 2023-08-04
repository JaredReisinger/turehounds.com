// const fs = require('fs');
import * as path from 'path';
// import { exit } from 'process';
import * as glob from 'glob';
import sharp from 'sharp';
import debugFn from 'debug';
import exifReader from 'exif-reader';
import { DateTime } from 'luxon';

// const UserConfig = require('@11ty/eleventy/src/UserConfig');
import Image from '@11ty/eleventy-img';

import {
  ElementAttributes,
  HtmlObjectDefinition,
  ImageOptions,
  generateBetterObject,
  renderObjectHTML,
} from './images';

const debug = debugFn('galleries');

// /**
//  * @typedef GalleryOptions
//  * @type {object}
//  * @property {string} galleryGlob Glob for gallery image files, relative to the current page.
//  * @property {import('./images').ElementAttributes} containerAttrs Attributes (classes, styles) for the container element.
//  * @property {import('./images').ImageOptions} imageOptions
//  */

export interface GalleryOptions {
  /** Glob for gallery image files, relative to the current page. */
  galleryGlob: string;
  /** Attributes (classes, styles) for the container element. */
  containerAttrs: ElementAttributes;
  imageOptions: Partial<ImageOptions>;
}

const DEFAULT_OPTIONS: GalleryOptions = {
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

// @11ty/eleventy-img doesn't expose the sharp image, nor the raw metadata, so
// it's not possible to get other useful info like the EXIF/XMP data, which
// would be useful for captions and things.  Thus, we have to replicate that
// logic here, which is slower, and not as flexible as @11ty/eleventy-img's
// support for remote images, etc.

/**
 * Gets the sharp metadata for an image.
 * @param src The image to get the metadata for.
 * @returns
 */
async function getCaptionInfo(src: string) {
  const sharpImage = sharp(src, { failOn: 'none' });
  const metadata = await sharpImage.metadata();

  let artist: string | undefined;
  let copyright: string | undefined;
  let title: string | undefined;
  let subject: string | undefined;
  let comment: string | undefined;
  let date: DateTime | undefined;

  if (metadata.exif) {
    debug('got image metadata with EXIF', src);
    const { image: imageInfo, exif, ...other } = exifReader(metadata.exif);

    // debug('EXIF info', { image: imageInfo, exif, ...other});
    if (imageInfo) {
      artist = (imageInfo.Artist as string) || undefined;
      copyright = (imageInfo.Copyright as string) || undefined;
      title =
        (imageInfo.ImageDescription as string) ??
        cleanXPInfo(imageInfo.XPTitle as Uint8Array);
      subject = cleanXPInfo(imageInfo.XPSubject as Uint8Array);
      comment = cleanXPInfo(imageInfo.XPComment as Uint8Array);
    }

    if (exif) {
      date = DateTime.fromJSDate(
        (exif.DateTimeOriginal as Date) || (exif.DateTimeDigitized as Date),
        { zone: 'utc' }
      );
    }

    // debug('UserComment:', exif.exif?.UserComment?.toString());
  }

  // if (metadata.xmp) {
  //   debug('got image metadata with xmp', src);
  //   const xmp = metadata.xmp.toString();
  //   debug(xmp);
  // }

  const caption = { artist, copyright, title, subject, comment, date };

  if (artist || copyright || title || subject || comment || date) {
    debug('caption info...', caption);
  }

  return caption;
}

/**
 * Cleans a XP... string buffer from image metadata
 * @param buf raw buffer, UCS-2 encoded (?)
 * @returns A cleaned string, or undefined.
 */
function cleanXPInfo(buf: Uint8Array) {
  if (!buf) {
    return undefined;
  }

  let str = Buffer.from(buf).toString('ucs2');
  if (str.endsWith('\x00')) {
    str = str.substring(0, str.length - 1);
  }
  return str;
}

/**
 * Creates an image gallery from the images in the "gallery" subdirectory of the
 * current page.  Defaults to `columns-xs`-sized images, which aims for roughly
 * 20rem width presentation.
 *
 * As with the "improved" image shortcodes, this takes an option object rather
 * than positional parameters.  Also note that the `options.imageOptions` value
 * (passed to the image shortcode) is independetly merged with the defaults so
 * that if you only set classes, for example, you still get the default sizes.
 */
async function autoGallery(options: GalleryOptions | undefined = undefined) {
  // merge options and defaults (note additional merging for imageOptions)
  const opts = Object.assign({}, DEFAULT_OPTIONS, options, {
    imageOptions: Object.assign(
      {},
      DEFAULT_OPTIONS.imageOptions,
      options?.imageOptions
    ),
  });
  const { page } = this;
  debug('building auto-gallery for', page.url);
  // console.log('building auto-gallery for', page.url);

  // output dir will be same as the page
  const outputDir = path.dirname(page.outputPath);

  const imageSrcs = glob.sync(
    path.resolve(path.dirname(page.inputPath), opts.galleryGlob)
  );

  const items = await Promise.all(
    imageSrcs.map(async (src) => {
      //TEMP
      const caption = await getCaptionInfo(src);
      //TEMP
      const metadata = await Image(src, {
        widths: [null, 1200, 900, 600, 300],
        formats: ['webp', 'jpg'],
        outputDir,
        urlPath: page.url,
      });
      // debug('image metadata', src, metadata );
      // console.log('image metadata', { src, metadata }, metadata);

      // in order to shoehorn any image-specific `alt` attribute, we need to
      // create an image-specific options object here...
      const imageOptions = Object.assign({}, opts.imageOptions);
      if (caption.title) {
        imageOptions.alt = caption.title;
      }

      const imageObj = generateBetterObject(src, metadata, imageOptions);

      const captionParts: HtmlObjectDefinition[] = [];

      if (caption.title) {
        captionParts.push({
          $tag: 'div',
          class: 'title',
          $content: caption.title,
        });
      }

      if (caption.subject) {
        captionParts.push({
          $tag: 'div',
          class: 'subject',
          $content: caption.subject,
        });
      }

      if (caption.comment) {
        captionParts.push({
          $tag: 'div',
          class: 'comment',
          $content: caption.comment,
        });
      }

      if (caption.date) {
        captionParts.push({
          $tag: 'div',
          class: 'date',
          $content: caption.date.toFormat('dd LLL yyyy'),
        });
      }

      // artist/copyright go together
      if (caption.artist || caption.copyright) {
        const creatorParts: HtmlObjectDefinition[] = [];

        if (caption.artist) {
          creatorParts.push({
            $tag: 'div',
            class: 'artist',
            $content: caption.artist,
          });
        }

        if (caption.copyright) {
          creatorParts.push({
            $tag: 'div',
            class: 'copyright',
            $content: caption.copyright,
          });
        }
        captionParts.push({
          $tag: 'div',
          class: 'creator',
          $children: creatorParts,
        });
      }

      const captionDiv =
        captionParts.length > 0
          ? {
              $tag: 'div',
              class: 'pswp-caption-content',
              $children: captionParts,
            }
          : undefined;

      debug('caption', captionDiv);
      return { imageObj, captionDiv };
    })
  );

  // console.log('auto-gallery?', items);
  const galleryObj: HtmlObjectDefinition = {
    $tag: 'div',
    ...opts.containerAttrs,
    $children: items.map<HtmlObjectDefinition>(({ imageObj, captionDiv }) => {
      // hoist photoswipe attributes up to parent div!
      const pswpData = {};
      ['data-pswp-src', 'data-pswp-width', 'data-pswp-height'].forEach((k) => {
        if (imageObj.picture?.[k]) {
          pswpData[k] = imageObj.picture[k];
        }
      });

      return {
        $tag: 'div',
        // TODO: move class outside imageOptions?
        ...opts.imageOptions?.image,
        ...pswpData,
        $children: [imageObj, ...(captionDiv ? [captionDiv] : [])],
      };
    }),
  };

  // debug(galleryObj.div.children[0]);

  // The `<picture>` element needs to be wrapped in a `div` to get actual column
  // behavior.  Also note that this isn't true masonry, row-first layout, it's
  // column-first layout.
  const html = renderObjectHTML(galleryObj);
  return html;
}

export const filters = { async: {}, sync: {} };
export const shortcodes = { async: { autoGallery }, sync: {} };
