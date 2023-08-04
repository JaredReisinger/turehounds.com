// Build a search index using cheerio and lunr...
// based on https://github.com/BLE-LTER/Lunr-Index-and-Search-for-Static-Sites/blob/master/build_index.js

// const path = require('path');
const fs = require('fs');
// const util = require('util');
const lunr = require('lunr');
const cheerio = require('cheerio');
const glob = require('glob');

const HTML_FOLDER = '_site';
const HTML_FILES = '**/*.{htm,html}';
// Valid search fields: "title", "description", "keywords", "body"
const SEARCH_FIELDS = ['title', 'description', 'keywords', 'body'];
// const EXCLUDE_FILES = [/*"search.html"*/];
const EXCLUDE_URLS = ['/debug/', '/puppy-interest-questionnaire-success/'];
const MAX_PREVIEW_CHARS = 275;
const OUTPUT_INDEX = '_site/static/js/search_index.js';

main();

// the original source climbed the tree looking for files; we use `glob` instead

function main() {
  const infos = findHtml(HTML_FOLDER, HTML_FILES)
    .map(generateMetaInfo.bind(null, HTML_FOLDER))
    .filter((i) => !excluded(EXCLUDE_URLS, i))
    .map(loadContent);
  // console.log('got file infos', infos);

  const idx = buildIndex(SEARCH_FIELDS, infos);
  // console.log('built index', idx);
  const previews = buildPreviews(infos, MAX_PREVIEW_CHARS);
  // console.log('built previews', previews);

  writeIndexFile(OUTPUT_INDEX, { idx, previews });
}

/**
 * Finds all HTML files to process.
 * @param {string} folder Folder in which to search for files.
 * @param {string} pattern Glob pattern for file matching.
 * @returns An array of file paths
 */
function findHtml(folder, pattern) {
  // TODO: find a way to bundle the EXCLUDE_FILES into the glob?
  // we *could* use async, but let's keep things super-simple for now...
  const files = glob.sync(`${folder}/${pattern}`);
  return files;
}

/**
 * Generate meta-info for the given file.
 * @param {string} folder Top-level folder to remove from file paths
 * @param {string} file File that will be processed
 * @returns `A { file, url }` object.
 */
function generateMetaInfo(folder, file) {
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
 * @param {Array<string>} excludeList List of URLs to exclude.
 * @param {{ file: string, url: string }} info File info to check.
 * @returns Whether the file/url should be excluded or not.
 */
function excluded(excludeList, info) {
  return excludeList.includes(info.url);
}

/**
 * Loads HTML content, returning an updated info object.
 * @param {{ file: string, url: string }} info
 * @returns Modified file info
 */
function loadContent(info) {
  const text = fs.readFileSync(info.file).toString();
  const $ = cheerio.load(text);
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
 * @param {Array[string]} fields Fields to include in the index
 * @param {Array<{ file: string, url: string, content: { title: string, description: string, keywords: string, body: string }}>} infos
 * @returns a `Lunr.Index`.
 */
function buildIndex(fields, infos) {
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

  // console.log('docs', docs);

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

  // console.log('built index?', idx);
  return idx;
}

/**
 * Builds the previews information.
 * @param {*} infos List of doc infos.
 * @param {*} previewLimit Length-limit for previews
 * @returns A mapping object of preview information.
 */
function buildPreviews(infos, previewLimit) {
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
 * @param {string} file File to write
 * @param {Object} content content to include.
 */
function writeIndexFile(file, content) {
  fs.writeFileSync(file, `window.SEARCH_INDEX = ${JSON.stringify(content)};`);
}
