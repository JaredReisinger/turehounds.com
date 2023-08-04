# Internal plugins

This is an attempt to better modularize the additional functionality in the same way that a full standalone plugin would, where a single "config and set up" entrypoint is exported for each notional plugin.

## `helpers`

Amalgam of helper filters and shortcodes... the images/gallery should be separated out, but this is the first stab at things.  The images/gallery stuff would add/use these dependencies:

- `@11ty/eleventy-img`
- `exif-reader` (`@types/exif-reader`)
- `photoswipe`
- `photoswipe-dynamic-caption-plugin`
- `luxon` (`@types/luxon`)
- maybe `js-yaml` (`@types/js-yaml`) for sidecar caption stuff...
- `@types/node`
