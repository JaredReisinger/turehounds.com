// Build the title map data file
import * as fs from 'fs';
import { ensureTitleMap } from '../plugins/titles/titles';

const OUTPUT_FILE = '_site/static/js/titleMap.js';

writeTitleMap(OUTPUT_FILE);

function writeTitleMap(filename: string) {
  const leanMap = Object.fromEntries(
    Object.entries(ensureTitleMap()).map(([title, obj]) => [
      title.toUpperCase(),
      `${title}: ${obj.name}${
        obj.event.name !== obj.name ? `—${obj.event.name}` : ''
      }`,
    ])
  );
  fs.writeFileSync(filename, `window.titleMap = ${JSON.stringify(leanMap)};`);
}
