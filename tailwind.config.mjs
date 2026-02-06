import { join } from 'path';

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    join(__dirname, 'src/**/*.{js,ts,jsx,tsx,mdx}'),
    join(__dirname, 'components/**/*.{js,ts,jsx,tsx,mdx}'),
    join(__dirname, 'app/**/*.{js,ts,jsx,tsx,mdx}'),
  ],
  theme: {
    extend: {
      fontFamily: {
        grandhotel: ["'Grandhotel'", "cursive"]
      },
    },
  },
  plugins: [],
};
