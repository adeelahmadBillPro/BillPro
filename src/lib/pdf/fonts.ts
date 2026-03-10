import { Font } from "@react-pdf/renderer";

let fontsRegistered = false;

export function registerFonts() {
  if (fontsRegistered) return;
  fontsRegistered = true;

  // Noto Nastaliq Urdu for Urdu text
  Font.register({
    family: "NotoNastaliq",
    src: "https://fonts.gstatic.com/s/notonastaliqurdu/v20/LhWNMUPbN-oZdNFcBy1-DJYsEoTq5pudQ9L940pGPkB3Qt_-DK2f2cC8.ttf",
  });

  // Noto Sans for English text (clean, professional)
  Font.register({
    family: "NotoSans",
    fonts: [
      {
        src: "https://fonts.gstatic.com/s/notosans/v36/o-0IIpQlx3QUlC5A4PNr5TRA.ttf",
        fontWeight: 400,
      },
      {
        src: "https://fonts.gstatic.com/s/notosans/v36/o-0NIpQlx3QUlC5A4PNjXhFlY9aA5Wl6PQ.ttf",
        fontWeight: 600,
      },
      {
        src: "https://fonts.gstatic.com/s/notosans/v36/o-0NIpQlx3QUlC5A4PNjThFnY9aA5Wl6PQ.ttf",
        fontWeight: 700,
      },
    ],
  });
}
