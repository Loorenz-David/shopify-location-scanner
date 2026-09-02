import { Font } from "@react-pdf/renderer";

// The PDF cannot consume the Google-Fonts CSS the screens use (context/pdf-library.md):
// react-pdf embeds subsetted TTFs, so the same families ship as static assets. Sources
// are resolved against this module's URL, which Vite rewrites to the built asset in the
// browser. There is no italic face on disk and react-pdf synthesizes none, so none is
// registered (P6 recorded the same gap for "Any value" on screen).
const fontSource = (file: string): string =>
  new URL(`../../../../assets/fonts/${file}`, import.meta.url).href;

export const STOCK_PDF_SANS = "Poppins";
export const STOCK_PDF_MONO = "IBM Plex Mono";

Font.register({
  family: STOCK_PDF_SANS,
  fonts: [
    { src: fontSource("Poppins-Regular.ttf"), fontWeight: 400 },
    { src: fontSource("Poppins-Medium.ttf"), fontWeight: 500 },
    { src: fontSource("Poppins-SemiBold.ttf"), fontWeight: 600 },
    { src: fontSource("Poppins-Bold.ttf"), fontWeight: 700 },
  ],
});

Font.register({
  family: STOCK_PDF_MONO,
  fonts: [
    { src: fontSource("IBMPlexMono-Regular.ttf"), fontWeight: 400 },
    { src: fontSource("IBMPlexMono-Medium.ttf"), fontWeight: 500 },
  ],
});

// Table cells hold category names and codes; a hyphenated "Side-boards" is worse than
// a wrapped one.
Font.registerHyphenationCallback((word) => [word]);
