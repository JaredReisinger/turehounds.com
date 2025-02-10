import Image from '@11ty/eleventy-img';

/**
 * This is basically the same as `@11ty/eleventy-img`'s `ImageOptions`.
 */
export type ImageGenOptions = Required<
  Pick<Image.BaseImageOptions, 'widths' | 'formats' | 'outputDir' | 'urlPath'>
>;

export interface ElementAttributes {
  /** Class(es) for the element. */
  class?: string;
  /** Style(s) for the element. */
  style?: string;
}

// Rather than positional arguments (which can't be omitted if a later one is
// needed), we use a structured object for the options *other than* `src`.
export interface ImageOptions {
  generate: Partial<ImageGenOptions>;
  alt: string; // Should this just go inside img?
  sizes: string;
  loading: string;
  decoding: string;
  image: ElementAttributes;
  picture: ElementAttributes;
  img: ElementAttributes;
}
