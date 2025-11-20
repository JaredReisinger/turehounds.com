// Build the title map data file
import * as fs from 'fs';
import { ensureTitleMap, type TitleMapInfo } from '../plugins/titles/titles';

const OUTPUT_FILE = '_site/static/js/titleMap.js';

writeTitleMap(OUTPUT_FILE);

function writeTitleMap(filename: string) {
  const leanMap = Object.fromEntries(
    Object.entries(ensureTitleMap()).map(([title, obj]) => {
      var name = '';
      if (Array.isArray(obj)) {
        name = obj.map((info) => eventName(info)).join(' or ');
      } else {
        name = eventName(obj);
      }

      return [title.toUpperCase(), name];
    })
  );
  fs.writeFileSync(filename, `window.titleMap = ${JSON.stringify(leanMap)};`);
}

function eventName(info: TitleMapInfo) {
  return `${info.name}${
    info.event.name !== info.name ? `—${info.event.name}` : ''
  }`;
}
