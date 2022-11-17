# \_helpers

Helpers for eleventy (filters, shortcodes, etc.)

In order to somewhat abstract _what_ is getting provided, each shortcode/filter helper file (not everything in here is?) returns a structured object that somewhat self-documents what everything is:

```javascript
module.exports = {
  filters: {
    async: {
      // properties are names of async filters
    },
    sync: {
      // properties are names of sync filters

    },
  },
  shortcodes: {
    async: {
      // properties are names of async shortcodes
    },
    sync: {
      // properties are names of sync shortcodes
    },
  },
  withConfig: (cfg, optionsCfg) => void // in case the config object is needed
                                        // `withConfig`, can be a function that
                                        // gets called with the `eleventyConfig`
                                        // object
};
```

That way, the consumer can simply iterate over the properties and add them using
the correct API calls. Further, there's an aggregator, `addins.js` which allows
the top-level `.eleventy.js` to not even need to know about the individial
implementation files.
