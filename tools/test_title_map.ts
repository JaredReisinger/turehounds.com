// Build the title map data file
import * as fs from 'fs';
import { ensureTitleMap } from '../plugins/titles/titles';

const OUTPUT_FILE = 'titles.csv';
// const OUTPUT_FILE_NEW = 'titles-new.csv';

writeTitlesCsv(OUTPUT_FILE);
// writeNewTitlesCsv(OUTPUT_FILE_NEW);

function writeTitlesCsv(filename: string) {
  const lines = Object.entries(ensureTitleMap()).flatMap(([title, obj]) => {
    if (!Array.isArray(obj)) {
      obj = [obj];
    }
    return obj.map((info) =>
      [
        info.event.name,
        title.toUpperCase(), // letters?
        info.name,
      ].join(',')
    );
  });

  lines.unshift('Event,Title,Name');
  lines.push('');

  fs.writeFileSync(filename, lines.join('\n'));
}

// function writeNewTitlesCsv(filename: string) {
//   const lines = Object.entries(ensureNewTitleMap()).map(([title, obj]) => [
//     obj.event.name,
//     title.toUpperCase(), // letters?
//     obj.name,
//   ].join(","));

//   lines.unshift("Event,Title,Name");
//   lines.push("");

//   fs.writeFileSync(filename, lines.join("\n"));
// }
