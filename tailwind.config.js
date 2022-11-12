module.exports = {
  content: ["./src/**/*.html"],
  theme: {
    fontFamily: {
      sans: ["'Open Sans'", 'sans-serif'],
      serif: ["Rokkitt", 'serif'],
    },
    container: {
      center: true,
    },
    // extend: {
    //   colors: {},
    // },
  },
  // variants: {},
  plugins: [require("@tailwindcss/typography")],
};
