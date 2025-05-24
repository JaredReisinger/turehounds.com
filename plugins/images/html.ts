import debugFn from 'debug';
import Image from '@11ty/eleventy-img';
import { ImageOptions } from './options.js';

const debug = debugFn('plugin:images:html');

/**
 * An object representation for HTML rendering; $tag is the element name, where
 * $content is direct textual content *or* $children are child elements, and all
 * other properties are attributes.
 */
export interface HtmlObject {
  $tag: string;
  $content?: string;
  $children?: HtmlObject[]; // HtmlObject | HtmlObject[];
  [index: string]: unknown;
}

// /**
//  * A Javascript object used to (eventually) render HTML. This is a flexible
//  * intermediate format. We define "pre-known" tagNames to ensure that the right
//  * allowable properties are included.
//  */
// export type HtmlObjectDefinition =
//   // these types are confusing... why are '$content' and '$children' excluded?
//   | Omit<
//       {
//         $tag: 'img' | 'source'; // define known HTML elements?
//         [index: string]: unknown;
//       },
//       '$content' | '$children'
//     >
//   | Omit<
//       {
//         $tag: 'div' | 'a';
//         $content?: string | number;
//         [index: string]: unknown;
//       },
//       '$children'
//     >
//   | Omit<
//       {
//         $tag: 'picture' | 'div' | 'a';
//         $children?: HtmlObjectDefinition[];
//         [index: string]: unknown;
//       },
//       '$content'
//     >;

/**
 * Renders the `<picture>` element for the given image. Based on
 * `Image.generateHTML`, but adds some tweaking of the output.
 * @param src : Path to the original image.
 * @param metadata Image metadata to use.
 * @param options Rendering options.
 * @param pictureAttrs Additional attribute generator for picture element
 * @returns Rendered HTML string.
 */
export function generateHtml(
  src: string,
  metadata: Image.Metadata,
  options?: Partial<ImageOptions>,
  pictureAttrs?: (meta: Image.MetadataEntry) => Record<string, string | number>
) {
  const obj = generateHtmlObject(src, metadata, options, pictureAttrs);
  const html = renderObjectHtml(obj);
  // console.log('GENERATED', obj, html);
  return html;
}

/**
 * Improved version of Image.generateObject().  Instead of each element having
 * attributes (if an object) *or* children (if an array), always uses an object
 * but with a `children` property for any child elements.
 * @param src Path to the original image.
 * @param metadata Image metadata to use.
 * @param options Rendering options.
 * @param pictureAttrs Additional attribute generator for picture element.
 * @returns Object representing elements.
 */
export function generateHtmlObject(
  src: string,
  metadata: Image.Metadata,
  options?: Partial<ImageOptions>,
  pictureAttrs?: (meta: Image.MetadataEntry) => Record<string, string | number>
): HtmlObject {
  const DEFAULT_OPTIONS = {
    src: '(MISSING)',
    alt: '',
    sizes: '100vw', // ?
    loading: 'lazy',
    decoding: 'async',
  };
  // TODO: define "lowsrc"... I *think* it's the "lowest common denominator"
  // source, which should work anywhere as a fallback.
  const LOWSRC_FORMAT_PREFERENCE = ['jpeg', 'png', 'svg', 'webp', 'avif'];

  const opts = Object.assign({}, DEFAULT_OPTIONS, options);

  // recall that metadata keys are in order of format preference, and then
  // small-to-large within each format.
  // If there is one format and one size, just return an "img" element.  For one
  // format with multiple sizes, we return "img" with a srcset.  With multiple
  // formats, return "picture"
  const formats = Object.values(metadata) as Image.MetadataEntry[][];
  const formatCount = formats.length;
  const entryCount = formats.reduce((acc, format) => acc + format.length, 0);
  // console.log('got counts', { formatCount, entryCount, formats });
  if (entryCount === 0) {
    throw new Error(
      'No image results (metadata) found from `eleventy-img`. Expects a results object similar to: https://www.11ty.dev/docs/plugins/image/#usage.'
    );
  }

  // TODO: lowsrc calculation?
  let lowsrcFormat: Image.MetadataEntry[];
  for (const format of LOWSRC_FORMAT_PREFERENCE) {
    if (format in metadata && (metadata[format].length > 0)) {
      lowsrcFormat = metadata[format];
      break;
    }
  }

  if (!lowsrcFormat && formatCount === 1) {
    lowsrcFormat = formats[0];
  }

  if (!lowsrcFormat?.length) {
    throw new Error(
      `Could not find the lowest <img> source for responsive markup for ${src}`
    );
  }

  // The url for the smallest image, but the width/height of the largest?
  const lowsrcAttributes = Object.assign(
    {
      src: lowsrcFormat[0].url,
      // REVIEW: do we really want width/height on the low-level fallback?
      // width: lowsrc[lowsrc.length - 1].width,
      // height: lowsrc[lowsrc.length - 1].height,
      alt: opts.alt,
    },
    opts.image,
    opts.img
  );

  if (entryCount === 1) {
    return {
      $tag: 'img',
      ...lowsrcAttributes,
    };
  }

  // For multi-entry images, we *must* have a sizes value!
  const missingSizesError = `Missing "sizes" attribute on shortcode from: ${src}`;

  if (formatCount === 1) {
    if (!opts.sizes) {
      // Per the HTML specification sizes is required srcset is using the `w`
      // unit
      // https://html.spec.whatwg.org/dev/semantics.html#the-link-element:attr-link-imagesrcset-4
      // Using the default "100vw" is okay
      throw new Error(missingSizesError);
    }

    return {
      $tag: 'img',
      ...lowsrcAttributes,
      sizes: opts.sizes,
      srcset: Object.values(lowsrcFormat)
        .map((entry) => entry.srcset)
        .join(', '),
    };
  }

  // If we get this far, we have multiple formats, and need to create the full
  // picture element. The original code filters out the lowsrc iff it has only
  // one size?  That seems like an unnecessary optimization; adding complexity
  // for a very edge case.
  const sources = formats.map<HtmlObject>((entries) => {
    if (entries.length > 1 && !opts.sizes) {
      // Per the HTML specification sizes is required srcset is using the `w`
      // unit
      // https://html.spec.whatwg.org/dev/semantics.html#the-link-element:attr-link-imagesrcset-4
      // Using the default "100vw" is okay
      throw new Error(missingSizesError);
    }
    return {
      $tag: 'source',
      type: entries[0].sourceType,
      srcset: entries.map((entry) => entry.srcset).join(', '),
      sizes: opts.sizes,
    };
  });

  return {
    // a: {
    //   ...pswpData,
    //   children: [
    //     {
    $tag: 'picture',
    ...opts.image,
    ...opts.picture,
    ...(pictureAttrs?.(lowsrcFormat[lowsrcFormat.length - 1]) ?? {}),
    $children: [...sources, { $tag: 'img', ...lowsrcAttributes }],
    //     },
    //   ],
    // },
  };
}

/**
 * Renders an object-representation for an HTML element; expects an object with
 * a single property which is the tag name
 * @returns HTML for the object element.
 */
export function renderObjectHtml(obj: HtmlObject): string {
  debug('rendering HTML for', obj);
  const { $tag: tagName, $children, $content, ...attrs } = obj;

  const attrHtml = Object.entries(attrs)
    .map(([k, v]) => `${k}="${v}"`)
    .join(' ');

  const innerHtml = $children
    ? //? (Array.isArray($children) ? $children : [$children])
      $children.map(renderObjectHtml).join('')
    : $content
      ? String($content)
      : '';

  // we predicate having a close tag on whether there is inner HTML ($children
  // or $content)... Not sure if that's the most robust, vs. knowing about
  // certain tags.
  const finalHtml = `<${tagName}${attrHtml ? ` ${attrHtml}` : ''}>${innerHtml ? `${innerHtml}</${tagName}>` : ''}`;

  return finalHtml;
}

// /**
//  * Renders an element with the given attributes.
//  * @param tagName
//  * @param attrs
//  * @returns HTML for the element.
//  */
// export function renderTagAttrHtml(
//   tagName: string,
//   attrs: Omit<HtmlObject, '$tag'>
// ) {
//   // console.log('renderTagAttrHTML', { tagName, attrs });
//   //`$children` and $`content` are handled differently from the other
//   //attributes!
//   const { $children, $content, ...rest } = attrs || {};

//   const attrHtml = Object.entries(rest)
//     .map(([k, v]) => `${k}="${v}"`) // TODO: escape value if needed?
//     .join(' ');

//   const contentHtml: string = $children
//     ? Array.isArray($children)
//       ? $children.map(renderObjectHtml).join('')
//       : renderObjectHtml($children)
//     : $content
//       ? String($content)
//       : '';

//   // we predicate having a close tag on whether there is content ($children or
//   // $content)... Not sure if that's the most robust, vs. knowing about certain
//   // tags.
//   return `<${tagName}${attrHtml ? ` ${attrHtml}` : ''}>${contentHtml ? `${contentHtml}</${tagName}>` : ''}`;
// }
