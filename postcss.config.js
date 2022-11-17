// console.log("POSTCSS CONFIG...", process.env.NODE_ENV);

const config = {
  // plugins: {
  //   // should these be requires?
  //   tailwindcss: {},
  //   autoprefixer: {},
  //   ...(process.env.NODE_ENV === 'production' ? { cssnano: {} } : {}),
  // },

  // plugins: [
  //   require('tailwindcss/nesting'),
  //   require('tailwindcss'),
  //   // require('postcss-nested'),
  //   require('autoprefixer'),
  //   ...(process.env.NODE_ENV === 'production' ? [require('cssnano')] : []),
  // ],

  plugins: {
    'tailwindcss/nesting': {},
    'tailwindcss': {},
    'autoprefixer': {},
    ...(process.env.NODE_ENV === 'production' ? { 'cssnano': {} } : {}),
  },
};

// console.log("POSTCSS CONFIG:", config);

module.exports = config;
