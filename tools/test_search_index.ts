import * as fs from 'fs';
import lunr from 'lunr';
import windowPolyfill from 'node-window-polyfill';

import type { Index, Previews } from './build_search_index';

const SEARCH_INDEX = '_site/static/js/search_index.js';

// when we eval our data, it defines `SEARCH_INDEX` on window.
declare global {
  interface Window {
    SEARCH_INDEX: Index;
  }
}

main();

function main() {
  console.log('testing search...');
  windowPolyfill.register();
  const data = fs.readFileSync(SEARCH_INDEX).toString();
  eval(data); // approximate browser loading!
  // console.log('search index?', window.SEARCH_INDEX);

  const idx = lunr.Index.load(window.SEARCH_INDEX.idx);

  const allResults = idx.search('disa');

  // console.dir(results, { depth: null });
  const totalCount = allResults.length || 0;
  const count = totalCount > 10 ? 10 : totalCount;
  const results = allResults.slice(0, count);
  // console.log(
  //   `results ${count} of ${totalCount}:`,
  //   results.map((r) => r.ref)
  // );

  const html = buildSearchResults(results, window.SEARCH_INDEX.previews);

  console.log('result HTML:', html);
}

function buildSearchResults(results: lunr.Index.Result[], previews: Previews) {
  const htmls = results.map((r) => {
    const { l: link, t: title, p: preview } = previews[r.ref];
    return `<div class="search-result"><div class="search-result-title"><a href="${link}">${title}</a><div><div class="search-result-preview">${preview}</div></div>`;
  });

  return htmls.join('\n');
}
