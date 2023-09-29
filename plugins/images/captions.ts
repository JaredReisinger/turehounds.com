import * as fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import exifReader from 'exif-reader';
import debugFn from 'debug';
import yaml from 'js-yaml';

import { DateTime } from 'luxon';

const debug = debugFn('plugin:images:captions');

export interface Caption {
  artist?: string;
  copyright?: string;
  title?: string;
  subject?: string;
  comment?: string;
  date?: DateTime;
}

interface CaptionYaml extends Omit<Caption, 'date'> {
  date?: Date | string;
}

// We cache loaded/parsed/detected caption data so that we don't go through the
// process for the same imge more than once. This is predicated on the
// fundamental image src (non-resized) path.
const captionsFromSidecar: Record<string, Promise<Caption>> = {};
const captionsFromImage: Record<string, Promise<Caption>> = {};
const captionCache: Record<string, Caption> = {};

// we also cache caption sidecar file attempts for much the same reason; a
// sparse file in a directory with a lot of images will result in attempts for
// all of the images *not* listed in the caption file.  Note that "true" in this
// cache merely means that the sidecar file has been attempted at least once,
// even if it does not exist.
const sidecars: Record<string, Promise<boolean>> = {};

// @11ty/eleventy-img doesn't expose the sharp image, nor the raw metadata, so
// it's not possible to get other useful info like the EXIF/XMP data, which
// would be useful for captions and things.  Thus, we have to replicate that
// logic here, which is slower, and not as flexible as @11ty/eleventy-img's
// support for remote images, etc.
/**
 * Gets the sharp metadata for an image.
 * @param src The image to get the metadata for.
 */
export async function getCaptionInfo(src: string) {
  src = path.resolve(src);
  // let caption = await captionCache[src];

  if (captionCache[src]) {
    return captionCache[src];
  }

  // TODO: we should really merge these!
  const [fromSidecar, fromImage] = await Promise.all([
    findSidecarCaption(src),
    extractCaptionFromImage(src),
  ]);

  const caption = { ...fromImage, ...fromSidecar };
  // caption = await findCaptionDatafile(src);

  // if (!caption) {
  //   caption = await extractCaptionFromImage(src);
  // }

  if (
    caption.artist ||
    caption.copyright ||
    caption.title ||
    caption.subject ||
    caption.comment ||
    caption.date
  ) {
    debug('found caption info...', caption);
  }

  // cache[src] = caption;
  captionCache[src] = caption;

  return caption;
}

/**
 * Attempts to find caption information in a sidecar file. If found, caption
 * data for *all* images listed in the sidecar file are added to the cache.
 * @param src image file for which to extract a captions
 */
async function findSidecarCaption(src: string) {
  const dir = path.dirname(src);
  const sidecar = path.join(dir, 'captions.yaml');

  // We want to avoid multiple loading attempts, and they can all come in
  // parallel.  Rather than caching the result, we actually cache the promise...
  // once it's resolved, awaiting it is instantaneous. But if it's still
  // in-progress, 2-N attempts will just wait for the initial attempt.
  if (sidecars[sidecar]) {
    debug('sidecar already found for', src);
  } else {
    sidecars[sidecar] = (async () => {
      try {
        debug('looking for caption yaml', sidecar);
        const content = await fs.readFile(sidecar, { encoding: 'utf8' });
        const captions = (await yaml.load(content, {})) as Record<
          string,
          CaptionYaml
        >;

        Object.entries(captions).forEach(([name, caption]) => {
          const filename = path.join(dir, name);
          captionsFromSidecar[filename] = Promise.resolve({
            ...(caption as Omit<CaptionYaml, 'date'>),
            ...(caption.date ? { date: luxonify(caption.date) } : {}),
          });
        });

        debug('loaded captions for', Object.keys(captions));
        // debug('current caption cache: %o', cacheFromSidecar);
        debug('sidecar caption for %s: %o', src, captionsFromSidecar[src]);

        // return cache[src]; // could be undefined!
        // } catch (e) {
        //   return;
      } finally {
        return true;
      }
    })();
  }

  await sidecars[sidecar];
  debug('cached sidecar caption for %s: %o', src, captionsFromSidecar[src]);
  return captionsFromSidecar[src]; // promise or undefined?
}

function luxonify(date: Date | string | undefined) {
  if (!date) {
    return undefined;
  }

  if (date instanceof Date) {
    return DateTime.fromJSDate(date);
  }

  const dt = DateTime.fromISO(date, {
    zone: 'America/Los_Angeles',
    setZone: true,
  });
  if (dt.isValid) {
    return dt;
  }
  throw new Error(`could not parse ${date} as luxon.DateTime`);
}

const datePatterns = [
  /(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/,
  /(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})_(?<hour>\d{2})(?<minute>\d{2})(?<second>\d{2})/,
  /(?<year>\d{4})(?<month>\d{2})(?<day>\d{2})/,
];

/**
 * Attempts to extract caption information from image metadata.
 * @param src image file for which to extract a captions
 */
function extractCaptionFromImage(src: string) {
  if (captionsFromImage[src]) {
    return captionsFromImage[src];
  }

  captionsFromImage[src] = (async () => {
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
        date = luxonify(
          (exif.DateTimeOriginal || exif.DateTimeDigitized) as Date | string
        );
      }

      // debug('UserComment:', exif.exif?.UserComment?.toString());
    }

    // if (metadata.xmp) {
    //   debug('got image metadata with xmp', src);
    //   const xmp = metadata.xmp.toString();
    //   debug(xmp);
    // }

    // If we don't have the date, see if we can find a likely candidate in the
    // path/filename...
    if (!date) {
      for (const pat of datePatterns) {
        const m = src.match(pat);
        if (m) {
          // sanity-check the year... between 1970 and 2050 (should use current
          // year?)
          const year = Number.parseInt(m.groups.year, 10);
          if (year < 1970 || year > 2050) {
            continue;
          }

          date = luxonify(
            `${m.groups.year}-${m.groups.month}-${m.groups.day}T${
              m.groups.hour ?? '00'
            }:${m.groups.minute ?? '00'}:${m.groups.second ?? '00'}`
          );
          debug('date from filename', src, m, date);
          break;
        }
      }
    }

    return {
      ...(artist ? { artist } : {}),
      ...(copyright ? { copyright } : {}),
      ...(title ? { title } : {}),
      ...(subject ? { subject } : {}),
      ...(comment ? { comment } : {}),
      ...(date ? { date } : {}),
    } as Caption;
  })();

  return captionsFromImage[src];
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
