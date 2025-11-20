import * as fs from 'fs';
import * as path from 'path';
import yaml from 'js-yaml';

// Rather than load the titles as a 11ty data file, it's encapsulated by this
// "plugin" so that all of the needed variants are exposed.  I tried doing this
// using a "normal" data file, but couldn't guarantee it was loaded when the
// `addGlobalData` helper was called.  :-(

interface RawTitleData {
  levels: Record<string, string>;
  events: RawTitleEvent[];
}

interface RawTitleEvent {
  name: string;
  desc?: string;
  defaultTitle?: string;
  key: string;
  titles: Record<string, RawTitleDetail>;
}

interface RawTitleDetail {
  name?: string;
  desc?: string;
  supersedes?: string[];
  prefix?: boolean;
}

export interface TitleInfo {
  title: string;
  name: string;
  desc?: string;
  supersedes?: string[];
  isPrefix?: boolean;
}

export interface TitleEvent {
  key: string;
  name: string;
  desc?: string;
  titles: TitleInfo[];
}

interface TitleData {
  levels: RawTitleData['levels'];
  events: TitleEvent[];
}

// We currently use a simple map, but that kills us for the (very few) times
// that a title is used by more than one event. For example, "SOR" can mean both
// "Senior Oval Racer" (NOTRA) and also "Summer of Ruff" (DMWYD-Tricks).  I
// think we can make this map either *always* key to an array of title details,
// or allow either a singular object or an array.
type TitleMap = Record<string, TitleMapInfo | TitleMapInfo[]>;

export interface TitleMapInfo {
  name: string;
  desc: string;
  info: TitleInfo;
  event: TitleEvent;
}

let titleMap: TitleMap = undefined;

export function ensureTitleMap() {
  if (titleMap) {
    return titleMap;
  }

  const { /* levels, */ events } = ensureTitleData();

  // console.log('EVENTS', events);
  titleMap = events.reduce<TitleMap>((memo, evt) => {
    // console.log('*** event', evt);
    return evt.titles.reduce<TitleMap>((memo2, titleInfo) => {
      // *not* getting supersedes or isPrefix!
      const { title, name, desc } = titleInfo;
      const newInfo: TitleMapInfo = { name, desc, info: titleInfo, event: evt };
      if (title in memo2) {
        // // TODO: handle title collisions!
        // throw new Error(`title ${title} is already used!`);
        if (!Array.isArray(memo2[title])) {
          memo2[title] = [memo2[title]];
        }
        memo2[title].push(newInfo);
      } else {
        memo2[title] = { name, desc, info: titleInfo, event: evt };
      }
      return memo2;
    }, memo);
  }, {});

  // console.log('TITLE MAP', titleMap);

  return titleMap;
}

let titleData: TitleData = undefined;

export function ensureTitleData() {
  if (titleData) {
    return titleData;
  }

  const titleDataFile = path.resolve(__dirname, 'titles.yaml');
  const titleDataYaml = fs.readFileSync(titleDataFile).toString();
  const rawTitleData = yaml.load(titleDataYaml, {
    filename: titleDataFile,
  }) as RawTitleData;

  // We should normalize the title data here!
  if (!rawTitleData.events) {
    throw new Error(`NO "events" IN titles.yaml`);
  }

  const events = rawTitleData.events.map<TitleEvent>((rawEvent) => {
    let {
      key: eventKey,
      name: eventName,
      desc: eventDesc,
      defaultTitle,
      titles: rawTitles,
    } = rawEvent;

    defaultTitle ??= eventName;

    if (!rawTitles) {
      throw new Error(`NO "titles" IN "${eventName}"`);
      console.error(`NO "titles" IN "${eventName}"`);
    }

    const titles = Object.entries(rawTitles).map<TitleInfo>(
      ([title, rawTitle]) => {
        // if (!rawTitle) {
        //   console.error(`missing title info for ${title}...`);
        // }

        const {
          name: titleNameRaw,
          desc: titleDesc,
          supersedes,
          prefix: isPrefix,
        } = rawTitle ?? {};

        // TODO: flesh out name...
        return {
          title,
          name: expandName(
            titleNameRaw ?? '^^',
            title,
            defaultTitle,
            rawTitleData.levels
          ),
          desc: titleDesc,
          supersedes,
          isPrefix,
        };
      }
    );

    return { key: eventKey, name: eventName, desc: eventDesc, titles };
  });

  titleData = { ...rawTitleData, events };
  return titleData;
}

// Expand any ^-escapes in the raw string.
function expandName(
  raw: string,
  title: string,
  defaultTitle: string,
  levels: RawTitleData['levels']
): string {
  const levelKeyLast = title.slice(-1);
  const levelKeyFirst = title.slice(0, 1);

  let name = raw;

  let i = -1;
  while ((i = name.indexOf('^')) >= 0) {
    let len = 2;
    if (i + len > name.length || name[i + 1] == ' ') {
      len = 1;
    }
    const replacement = name.slice(i, i + len);
    // const origName = name;

    // look up replacement value!
    let replacementKey = '^'; // assume '^^'
    if (len > 1) {
      replacementKey = replacement[1];
    }

    let replacementValue = '';
    switch (replacementKey) {
      case '^':
        replacementValue = '^1 ^2';
        break;

      case '1':
        replacementValue = defaultTitle;
        break;

      case '2':
        replacementValue = levels[levelKeyLast];
        break;

      case '3':
        replacementValue = levels[levelKeyFirst];
        break;

      default:
        replacementValue = levels[replacementKey];
    }

    name = name.slice(0, i) + replacementValue + name.slice(i + len);
    // console.log(`found "${replacement}" in "${origName}" ==> "${replacementValue}" ==> "${name}"`);
  }
  return name;
}

export function getTitleLevels() {
  const { levels } = ensureTitleData();
  return levels;
}

export function getTitleEvents() {
  const { events } = ensureTitleData();
  return events;
}

export function titlify(str: string) {
  const titleMap = ensureTitleMap();
  const parts = str.split(' ').filter((x) => x);
  return parts
    .map(
      (part) => {
        var name = '(unknown title)';
        const val = titleMap[part];
        if (val) {
          if (Array.isArray(val)) {
            name = val.map(v => v.name).join(', or ');
          } else {
            name = val.name;
          }
        }

        return `<span title="${name}">${part}</span>`;
      }
    )
    .join(' ');
}
