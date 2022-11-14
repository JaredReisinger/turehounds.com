module.exports = {
  content: ['./src/**/*.{html,njk,js}'],
  theme: {
    fontFamily: {
      sans: ["'Open Sans'", 'sans-serif'],
      serif: ['Rokkitt', 'serif'],
    },
    container: {
      center: true,
    },
    // extend: {
    //   colors: {},
    // },
  },
  // variants: {},
  plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')],
};
