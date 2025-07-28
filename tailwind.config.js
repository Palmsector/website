/** @type {import('tailwindcss').Config} */
export default {
  content: ["./views/**/*.{ejs,js}", "./views/partials/**/*.ejs"],
  theme: {
    screens: {
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      "2xl": "1400px",
    },
    extend: {
      colors: {
        primaryGreen: "#145A32",
        accentGreen: "#28A745",
        darkGreen: "#0B3D02",
        otherGreen: "#1F6306",
        white: "#FFFFFF",
        offWhite: "#F8F9FA",
        textColor: "#E5E7EB",
        lightBlack: "#121212",
        deepBlack: "#080808",
      }
    },
  },
  plugins: [],
}

