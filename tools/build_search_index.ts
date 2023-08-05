// Build a search index using cheerio and lunr...
// based on https://github.com/BLE-LTER/Lunr-Index-and-Search-for-Static-Sites/blob/master/build_index.js

import fs from 'fs';
import debugFn from 'debug';
import lunr from 'lunr';
import { load as cheerioLoad } from 'cheerio';
import * as glob from 'glob';

const debug = debugFn('search:build');

const HTML_FOLDER = '_site';
const HTML_FILES = '**/*.{htm,html}';
// Valid search fields: "title", "description", "keywords", "body"
const SEARCH_FIELDS = ['title', 'description', 'keywords', 'body'];
// const EXCLUDE_FILES = [/*"search.html"*/];
const EXCLUDE_URLS = [
  '/debug/',
  '/puppy-interest-questionnaire-success/',
  '/test-form/',
];
const MAX_PREVIEW_CHARS = 275;
const OUTPUT_INDEX = '_site/static/js/search_index.js';

main();

// the original source climbed the tree looking for files; we use `glob` instead

interface FileInfo {
  url: string;
  file: string;
}

interface Content {
  title: string;
  description: string;
  keywords: string;
  body: string;
}

interface DocInfo extends FileInfo {
  content: Content;
}

export interface Preview {
  /** link / URL */
  l: string;
  /** title */
  t: string;
  /** preview text */
  p: string;
}

export type Previews = Record<string, Preview>;

export interface Index {
  idx: lunr.Index.Attributes;
  previews: Previews;
}

function main() {
  const infos = findHtml(HTML_FOLDER, HTML_FILES)
    // Function.bind isn't typed to keep the return value!
    .map<FileInfo>(generateMetaInfo.bind(null, HTML_FOLDER))
    .filter((i) => !excluded(EXCLUDE_URLS, i))
    .map(loadContent);
  debug('got file infos %o', infos);

  const index = buildIndex(SEARCH_FIELDS, infos);
  const idx = index.toJSON() as lunr.Index.Attributes;
  debug(
    'built index terms %j',
    (idx.invertedIndex as [string, unknown][]).map(([k, v]) => k)
  );

  const previews = buildPreviews(infos, MAX_PREVIEW_CHARS);
  debug('built previews %o', previews);

  writeIndexFile(OUTPUT_INDEX, { idx, previews });
}

/**
 * Finds all HTML files to process.
 * @param folder Folder in which to search for files.
 * @param pattern Glob pattern for file matching.
 * @returns An array of file paths
 */
function findHtml(folder: string, pattern: string) {
  // TODO: find a way to bundle the EXCLUDE_FILES into the glob?
  // we *could* use async, but let's keep things super-simple for now...
  const files = glob.sync(`${folder}/${pattern}`);
  return files;
}

/**
 * Generate meta-info for the given file.
 * @param folder Top-level folder to remove from file paths
 * @param file File that will be processed
 * @returns A `FileInfo` object.
 */
function generateMetaInfo(folder: string, file: string): FileInfo {
  let url = file;

  if (url.startsWith(folder)) {
    url = url.substring(folder.length);
  }

  // possible default/index files names to strip...
  const strippableFiles = [
    'index.html',
    'index.htm',
    'default.html',
    'default.htm',
  ];

  strippableFiles.forEach((toStrip) => {
    if (url.endsWith(`/${toStrip}`)) {
      url = url.substring(0, url.length - toStrip.length);
    }
  });

  return { file, url };
}

/**
 * Returns whether the file/url should be excluded or not.
 * @param excludeList List of URLs to exclude.
 * @param info File info to check.
 * @returns Whether the file/url should be excluded or not.
 */
function excluded(excludeList: string[], info: FileInfo) {
  return excludeList.includes(info.url);
}

/**
 * Loads HTML content, returning an updated info object.
 * @returns Modified file info
 */
function loadContent(info: FileInfo): DocInfo {
  const text = fs.readFileSync(info.file).toString();
  const $ = cheerioLoad(text);
  const content = {
    title: $('title').text() || info.url,
    description: $('meta[name=description]').attr('content') || '',
    keywords: $('meta[name=keywords]').attr('content') || '',
    // TODO: exclude header/footer?
    body: $('#body-content').text() /* || $('body').text() */ || '',
  };
  return { ...info, content };
}

/**
 * Build the index from the content
 * @param fields Fields to include in the index
 * @param infos All of the `DocInfo`s
 * @returns a `Lunr.Index`.
 */
function buildIndex(fields: string[], infos: DocInfo[]) {
  // first, map the info context into the lunr form... (t/d/k/b is just to keep
  // the resulting JSON compact, I think.)
  const docs = infos.map((info) => ({
    id: info.url,
    link: info.url,
    t: info.content.title,
    d: info.content.description,
    k: info.content.keywords,
    b: info.content.body,
  }));

  debug('docs %o', docs);

  // the configuration function is passed a lunr.Builder as `this`
  const idx = lunr(function () {
    this.ref('id'); // why not just use link?

    const that = this;
    fields.forEach((field) => {
      // HACK: we shouldn't know that the first letter of the field is used.
      that.field(field.substring(0, 1));
    });

    // add the docs!
    docs.forEach((doc) => {
      that.add(doc);
    });
  });

  // debug('built index?', idx);
  return idx;
}

/**
 * Builds the previews information.
 * @param infos List of doc infos.
 * @param previewLimit Length-limit for previews
 * @returns A mapping object of preview information.
 */
function buildPreviews(infos: DocInfo[], previewLimit: number) {
  // The source I'm modelling this on builds based on the doc structure, but we
  // just use infos as a "more-canonical" reference.

  const previews = {};

  infos.forEach((info) => {
    let p = info.content.description || info.content.body;
    if (p.length > previewLimit) {
      p = `${p.substring(0, previewLimit)}...`;
    }

    previews[info.url] = {
      l: info.url,
      t: info.content.title,
      p,
    };
  });

  return previews;
}

/**
 * Writes the index file for the client to load.
 * @param file File to write
 * @param content index content to include.
 */
function writeIndexFile(file: string, content: Index) {
  fs.writeFileSync(file, `window.SEARCH_INDEX = ${JSON.stringify(content)};`);
}
