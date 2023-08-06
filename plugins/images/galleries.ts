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
  HtmlObjectDefinition,
  ImageOptions,
  generateBetterObject,
  renderObjectHTML,
} from './images';
import { getCaptionInfo } from './captions';

const debug = debugFn('plugin:images:galleries');

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

  const imageSrcs = glob.sync(
    path.resolve(path.dirname(page.inputPath), opts.galleryGlob)
  );

  const items = await Promise.all(
    imageSrcs.map(async (src) => {
      // get captions and metadata in parallel...
      const [caption, metadata] = await Promise.all([
        getCaptionInfo(src),
        Image(src, {
          // Using fork of eleventy-img!
          widths:[1800, 600, 300],
          /*
          // Unfortunately, there's not a "max of X, or use orignal size if
          // that's the best you can do" option, *unless* that's the only size
          // available.  As soon as you ask for another (smaller) size, you will
          // *only* get specified sizes smaller than the original, unless `null`
          // in the list, which might resultin huge files.  For example, `[1500,
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

      const imageObj = generateBetterObject(src, metadata, imageOptions);

      const captionParts: HtmlObjectDefinition[] = [];

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

        // Look for some sentinal date/times... 23:59:58 means "we don't really
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
        const creatorParts: HtmlObjectDefinition[] = [];

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

// helper for injecting gallery styles/code
let galleryHead: string;

function getGalleryHead() {
  if (!galleryHead) {
    galleryHead = fs.readFileSync(path.join(__dirname, '_gallery-head.html'), {
      encoding: 'utf8',
    });
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
