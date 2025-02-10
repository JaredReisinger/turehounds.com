import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
// import { exit } from 'process';
import * as glob from 'glob';
import debugFn from 'debug';
import { DateTime } from 'luxon';
import yaml from 'js-yaml';

// const UserConfig = require('@11ty/eleventy/src/UserConfig');
import Image from '@11ty/eleventy-img';

import { ElementAttributes, ImageOptions } from './options';
import { generateHtmlObject, type HtmlObject, renderObjectHtml } from './html';
import { getCaptionInfo } from './captions';
import type { Page, ShortcodeCallbackThis } from './eleventy-types';

const debug = debugFn('plugin:images:galleries:bigger-picture');

export const staticFiles = {
  js: ['node_modules/bigger-picture/dist/bigger-picture.min.mjs'],
  css: ['node_modules/bigger-picture/dist/bigger-picture.css'],
};

// As we start thinking about more-complicated galleries, we need to separate
// the glob-based auto-gallery from a file-driven gallery.
export interface GalleryOptions {
  /** Attributes (classes, styles) for the container element. */
  containerAttrs: ElementAttributes;
  /** Attributes (classes, styles) for the image wrapper (`<a>`) element. */
  wrapperOptions: ElementAttributes;
  /** Attributes (classes, styles) for the image element. */
  imageOptions: Partial<ImageOptions>;
}

export type AutoGalleryOptions = GalleryOptions & {
  /** Glob for auto-gallery image files, relative to the current page. */
  galleryGlob: string | string[];
  // TODO: rename to 'glob'?
};

export type FileGalleryOptions = GalleryOptions & {
  /** relative path to YAML file which defines the gallery */
  file: string;
};

const DEFAULT_OPTIONS: GalleryOptions = {
  containerAttrs: {
    class: 'gallery-bp columns-xs gap-4 my-8',
  },
  wrapperOptions: {
    class: 'block w-full rounded-lg mb-4',
  },
  imageOptions: {
    sizes: '20rem', // columns-xs gives a 20rem-wide column
    image: {
      class: 'block w-full rounded-lg', // 'gallery-img w-full',
    },
  },
};

const DEFAULT_AUTO_OPTIONS: AutoGalleryOptions = {
  galleryGlob: 'gallery/*.{jpg,JPG,jpeg,JPEG,png,PNG}',
  ...DEFAULT_OPTIONS,
};

/**
 * Creates an image gallery from the images in the "gallery" subdirectory of the
 * current page (or galleryGlob in the options).  Defaults to `columns-xs`-sized
 * images, which aims for roughly 20rem width presentation.
 *
 * As with the "improved" image shortcodes, this takes an option object rather
 * than positional parameters.  Also note that the `options.imageOptions` value
 * (passed to the image shortcode) is independently merged with the defaults so
 * that if you only set classes, for example, you still get the default sizes.
 */
export async function autoGallery(
  this: ShortcodeCallbackThis,
  options: AutoGalleryOptions | undefined = undefined
) {
  // merge options and defaults (note additional merging for imageOptions)
  const opts = Object.assign({}, DEFAULT_AUTO_OPTIONS, options, {
    imageOptions: Object.assign(
      {},
      DEFAULT_AUTO_OPTIONS.imageOptions,
      options?.imageOptions
    ),
  });
  const { page } = this;

  debug('building auto-gallery for', page.url);

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

  const itemSpecs = imageSrcs.map((src) => ({ file: src }));

  return await galleryImpl(page, itemSpecs, opts);
}

// define the gallery YAML types...
interface GalleryYaml {
  assets: GalleryItem[];
}

type GalleryItem = GalleryFileItem | GalleryYouTubeItem;

interface GalleryFileItem {
  file: string;
}

interface GalleryYouTubeItem {
  youtube: string;
  caption?: string;
}

export async function fileGallery(
  this: ShortcodeCallbackThis,
  options: FileGalleryOptions
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

  debug('building file-gallery for', page.url, opts.file);

  const inputFile = path.resolve(path.dirname(page.inputPath), opts.file);

  const content = await fs.readFile(inputFile, { encoding: 'utf8' });
  const info = (await yaml.load(content, {})) as GalleryYaml;

  // canonicalize file paths?
  const inputDir = path.dirname(inputFile);
  const itemSpecs = info.assets.map((spec) => {
    if ('file' in spec) {
      return {
        ...spec,
        file: path.resolve(inputDir, spec.file),
      };
    }
    return spec;
  });

  // console.log(JSON.stringify({ info, itemSpecs }));

  const html = galleryImpl(page, itemSpecs, opts);
  return html;
}

// use an always increasing counter for galleries?
let galleryCounter = 0;

function nextGalleryID() {
  const id = ++galleryCounter;
  // TODO: better stringify?  like a hashid?
  return String(id);
}

async function galleryImpl(
  page: Page,
  // imageSrcs: string[],
  itemSpecs: GalleryItem[],
  opts: GalleryOptions
) {
  const items = await Promise.all(
    itemSpecs.map((item) => {
      if ('file' in item) {
        return getImageFile(page, item.file, opts);
      }

      if ('youtube' in item) {
        return getYouTubeItem(page, item, opts);
      }

      const errMsg = `unknown gallery item: ${JSON.stringify(item)}`;
      // debug(errMsg);
      throw new Error(errMsg);
      // const unknownItem: HtmlObject = {
      //   $tag: 'div',
      //   $content: errMsg,
      // }
      // return unknownItem;
    })
  );

  const galleryId = nextGalleryID();

  const galleryObj: HtmlObject = {
    $tag: 'div',
    class: `gallery-bp gallery-bp-${galleryId}${opts.containerAttrs.class ? ` ${opts.containerAttrs.class}` : ''}`,
    ...(opts.containerAttrs.style ? { style: opts.containerAttrs.style } : {}),
    $children: items,
  };

  // debug(galleryObj.div.children[0]);
  // The `<picture>` element needs to be wrapped in a `div` to get actual column
  // behavior.  Also note that this isn't true masonry, row-first layout, it's
  // column-first layout.
  const html = renderObjectHtml(galleryObj);

  // need a better way to write inline script?
  const scriptHtml = `
  <script type="module">
    const selector = "${`div.gallery-bp-${galleryId} > a`}";
    if (window.createBpGallery) {
      window.createBpGallery(selector);
    } else {
      document.addEventListener('bp-loaded', () => {
        window.createBpGallery(selector);
      });
    }
  </script>`;
  return html + scriptHtml;
}

async function getImageFile(page: Page, src: string, opts: GalleryOptions) {
  if (!page.outputPath) {
    throw new Error('need permalink and outputPath for gallery image file');
  }

  // output dir will be same as the page
  const outputDir = path.dirname(page.outputPath);

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

  // imageObj is the underlying <img> or <picture> element
  const imageObj = generateHtmlObject(
    src,
    metadata,
    imageOptions
    // pictureAttrs
  );

  // bigger-picture wants us to wrap that in an <a> for clicks
  // TODO: create helper utilities for managing metadata
  const formats = Object.values(metadata) as Image.MetadataEntry[][];
  const bestFormat = formats[0];
  const bestSize = bestFormat[bestFormat.length - 1];
  const imageWrapperObj: HtmlObject = {
    $tag: 'a',
    ...(opts.wrapperOptions?.class ? { class: opts.wrapperOptions.class } : {}),
    ...(opts.wrapperOptions?.style ? { style: opts.wrapperOptions.style } : {}),
    href: bestSize.url,
    'data-thumb': bestFormat[0].url, // use lowsrc?
    'data-img': bestFormat.map((entry) => entry.srcset).join(', '),
    'data-width': bestSize.width,
    'data-height': bestSize.height,
    $children: [imageObj],
  };
  // delete imageObj.class;

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
          class: 'bp-caption-content',
          $children: captionParts,
        }
      : undefined;

  debug('caption', captionDiv);
  imageWrapperObj['data-caption'] = renderObjectHtml(captionDiv)
    .replaceAll('"', '&quot;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
  return imageWrapperObj;
}

async function getYouTubeItem(
  page: Page,
  item: GalleryYouTubeItem,
  opts: GalleryOptions
) {
  const { youtube: videoId, caption } = item;
  const videoHref = `https://www.youtube.com/watch?v=${videoId}`;
  // const videoThumb = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  const videoThumb = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
  const videoInline = `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1`;

  const itemObj: HtmlObject = {
    $tag: 'a',
    ...(opts.wrapperOptions?.class ? { class: opts.wrapperOptions.class } : {}),
    ...(opts.wrapperOptions?.style ? { style: opts.wrapperOptions.style } : {}),
    href: videoHref,
    'data-thumb': videoThumb,
    // 'data-width': bestSize.width,
    // 'data-height': bestSize.height,
    'data-iframe': videoInline,
    ...(caption ? { 'data-caption': caption } : {}),
    $children: [
      {
        $tag: 'img',
        src: videoThumb,
        ...(opts.imageOptions?.image?.class
          ? { class: opts.imageOptions.image.class }
          : {}),
        ...(opts.imageOptions?.image?.style
          ? { style: opts.imageOptions.image.style }
          : {}),
      },
    ],
  };

  return itemObj;
}

// /** Additional picture element attributes */
// function pictureAttrs(meta: Image.MetadataEntry) {
//   return {
//     // 'data-type': 'image',
//     'data-image': meta.url,
//     // 'data-thumb': '???',
//     // 'data-alt': '???',
//     'data-width': meta.width,
//     'data-height': meta.height,
//   };
// }

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
    galleryHead = fsSync.readFileSync(
      path.join(__dirname, '_bigger-picture-head.html'),
      {
        encoding: 'utf8',
      }
    );
  }

  return galleryHead;
}

export async function galleryHeadTransform(content: string) {
  // debug('transform', this);

  // if we don't see any 'gallery-bp' on the page, immediately return the
  // existing content unchanged.
  if (!content.includes('gallery-bp')) {
    return content;
  }

  // otherwise, assume we need to inject the photoswipe styles and
  // scripts...
  debug('need bigger-picture stuff for', this.page.url);

  const endOfHead = content.indexOf('</head>');
  // debug('CONTENT', content.substring(endOfHead - 50, endOfHead + 10));
  const before = content.substring(0, endOfHead);
  const after = content.substring(endOfHead);

  // can I define this in a sidecar HTML file or something to get syntax
  // formatting?
  const magic = getGalleryHead();

  return before + magic + after;
}
