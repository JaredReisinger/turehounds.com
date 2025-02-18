import * as fs from 'fs';
import * as path from 'path';
// import { exit } from 'process';
import * as glob from 'glob';
import debugFn from 'debug';
import { DateTime } from 'luxon';

// const UserConfig = require('@11ty/eleventy/src/UserConfig');
import Image from '@11ty/eleventy-img';

import {
  ElementAttributes,
  ImageOptions
} from './options';
import { generateHtmlObject } from './html';
import { HtmlObject } from './html';
import { renderObjectHtml } from './html';
import { getCaptionInfo } from './captions';

const debug = debugFn('plugin:images:galleries:photoswipe');

export const staticFiles = {
  js: [
    'node_modules/photoswipe/dist/photoswipe.esm.min.js',
    'node_modules/photoswipe/dist/photoswipe-lightbox.esm.min.js',
    'node_modules/photoswipe-dynamic-caption-plugin/dist/photoswipe-dynamic-caption-plugin.esm.min.js',
  ],
  css: [
    'node_modules/photoswipe/dist/photoswipe.css',
    'node_modules/photoswipe-dynamic-caption-plugin/photoswipe-dynamic-caption-plugin.css',
  ],
};

export interface GalleryOptions {
  /** Glob for gallery image files, relative to the current page. */
  galleryGlob: string | string[];
  /** Attributes (classes, styles) for the container element. */
  containerAttrs: ElementAttributes;
  imageOptions: Partial<ImageOptions>;
}

const DEFAULT_OPTIONS: GalleryOptions = {
  galleryGlob: 'gallery/*.{jpg,JPG,jpeg,JPEG,png,PNG}',
  containerAttrs: {
    class: 'gallery-pswp columns-xs gap-4 my-8',
  },
  imageOptions: {
    sizes: '20rem', // columns-xs gives a 20rem-wide column
    image: {
      class: 'gallery-img rounded-lg mb-4 block w-full',
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
 * (passed to the image shortcode) is independently merged with the defaults so
 * that if you only set classes, for example, you still get the default sizes.
 */
export async function autoGallery(
  options: GalleryOptions | undefined = undefined
) {
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
  const inputDir = path.dirname(page.inputPath);

  let patterns = opts.galleryGlob;
  if (!Array.isArray(patterns)) {
    patterns = [patterns];
  }

  patterns = patterns.map((p) => path.resolve(inputDir, p));

  const imageSrcs = await glob.glob(patterns);

  // glob seems to pretty reliably return reverse-sorted strings... we want
  // deterministically forward-sorted strings (so that you can define order with
  // prefixes like "01-", "02-", etc.)
  imageSrcs.sort(photoNameComparer);

  const items = await Promise.all(
    imageSrcs.map(async (src) => {
      // get captions and metadata in parallel...
      const [caption, metadata] = await Promise.all([
        getCaptionInfo(src),
        Image(src, {
          // Using fork of eleventy-img!
          widths: [1800, 600, 300],
          /*
          // Unfortunately, there's not a "max of X, or use original size if
          // that's the best you can do" option, *unless* that's the only size
          // available.  As soon as you ask for another (smaller) size, you will
          // *only* get specified sizes smaller than the original, unless `null`
          // in the list, which might result in huge files.  For example, `[1500,
          // 600]` with a 1200px image will *only* create a 600px one.  With
          // `[null, 1500, 600]`, you'd get 1200px and 600px, but a 99999px file
          // will pass through a huge one!  Maybe worth a PR to
          // @11ty/eleventy-img to turn explicit-but-too-large widths into the
          // original width?
          widths: [1800, 1200, 600, 300],
          */
          formats: ['webp', 'jpg'],
          outputDir,
          urlPath: page.url,
        }),
      ]);

      const { title, date, artist, copyright } = caption;

      // debug('image metadata', src, metadata );
      // console.log('image metadata', { src, metadata }, metadata);

      // in order to shoehorn any image-specific `alt` attribute, we need to
      // create an image-specific options object here...
      const imageOptions = Object.assign({}, opts.imageOptions);

      if (title) {
        imageOptions.alt = title;
      }

      const imageObj = generateHtmlObject(src, metadata, imageOptions, pictureAttrs);

      const captionParts: HtmlObject[] = [];

      ['title', 'subject', 'comment'].forEach((part) => {
        if (caption[part]) {
          captionParts.push({
            $tag: 'div',
            class: part,
            $content: caption[part],
          });
        }
      });

      if (date) {
        let dateFmt = date.toLocaleString(DateTime.DATE_FULL);

        // Look for some sentinel date/times... 23:59:58 means "we don't really
        // know the day, just show month and year".
        if (date.hour === 23 && date.minute === 59 && date.second === 58) {
          dateFmt = date.toLocaleString({ year: 'numeric', month: 'long' });
        }

        captionParts.push({
          $tag: 'div',
          class: 'date',
          $content: dateFmt,
        });
      }

      // artist/copyright go together
      if (artist || copyright) {
        const creatorParts: HtmlObject[] = [];

        if (artist) {
          creatorParts.push({
            $tag: 'div',
            class: 'artist',
            $content: artist,
          });
        }

        if (copyright) {
          // strip any leading (c) or copyright, and replace with (c) symbol
          let cleaned = copyright;
          ['copyright', '(c)', '©'].forEach((prefix) => {
            if (cleaned.toLowerCase().startsWith(prefix)) {
              cleaned = cleaned.substring(prefix.length).trimStart();
            }
          });

          // automatically inject the year, if there's a date?
          if (date) {
            const yearFmt = date.toLocaleString({ year: 'numeric' });
            if (!cleaned.startsWith(yearFmt)) {
              cleaned = `${yearFmt} ${cleaned}`;
            }
          }

          creatorParts.push({
            $tag: 'div',
            class: 'copyright',
            $content: cleaned, // © added in CSS styling
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
  const galleryObj: HtmlObject = {
    $tag: 'div',
    ...opts.containerAttrs,
    $children: items.map<HtmlObject>(({ imageObj, captionDiv }) => {
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
  const html = renderObjectHtml(galleryObj);
  return html;
}

/** Additional picture element attributes */
function pictureAttrs(meta:Image.MetadataEntry) {
  return {
    // 'data-pswp-type': 'image',
    'data-pswp-src': meta.url,
    'data-pswp-width': meta.width,
    'data-pswp-height': meta.height,
  };
}

// // replicates the logic inside Array.sort() when no comparer is given  (see
// // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort#Parameters):
// // convert to strings, and then sort by Unicode code point value.
// function defaultComparer(a: unknown, b: unknown) {
//   const aStr = String(a);
//   const bStr = String(b);

//   // instead of Unicode code point value, though, we use localeCompare...
//   return aStr.localeCompare(bStr, 'en', { sensitivity: 'base' });
// }

// export const compareStrings = defaultComparer;

// ensures we only look at the filename portion to sort...
function photoNameComparer(a: unknown, b: unknown) {
  const aStr = path.basename(String(a)).toLowerCase();
  const bStr = path.basename(String(b)).toLowerCase();

  // instead of Unicode code point value, though, we use localeCompare...
  return aStr.localeCompare(bStr, 'en', { sensitivity: 'base' });
}

// helper for injecting gallery styles/code
let galleryHead: string;

function getGalleryHead() {
  if (!galleryHead) {
    galleryHead = fs.readFileSync(
      path.join(__dirname, '_photoswipe-head.html'),
      {
        encoding: 'utf8',
      }
    );
  }

  return galleryHead;
}

export async function galleryHeadTransform(content: string) {
  // debug('transform', this);

  // if we don't see any 'data-pswp' on the page, immediately return the
  // existing content unchanged.
  if (!content.includes('data-pswp')) {
    return content;
  }

  // otherwise, assume we need to inject the photoswipe styles and
  // scripts...
  debug('need photoswipe stuff for', this.page.url);

  const endOfHead = content.indexOf('</head>');
  // debug('CONTENT', content.substring(endOfHead - 50, endOfHead + 10));
  const before = content.substring(0, endOfHead);
  const after = content.substring(endOfHead);

  // can I define this in a sidecar HTML file or something to get syntax
  // formatting?
  const magic = getGalleryHead();

  return before + magic + after;
}
