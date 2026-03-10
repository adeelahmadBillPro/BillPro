/**
 * Generate PNG icons from SVG for PWA / Play Store
 *
 * Usage:
 *   npm install sharp --save-dev
 *   node scripts/generate-icons.js
 */

const fs = require("fs");
const path = require("path");

async function generateIcons() {
  let sharp;
  try {
    sharp = require("sharp");
  } catch {
    console.log("⚠ 'sharp' not found. Installing...");
    require("child_process").execSync("npm install sharp --save-dev", { stdio: "inherit" });
    sharp = require("sharp");
  }

  const svgPath = path.join(__dirname, "../public/icons/icon-512.svg");
  const svgBuffer = fs.readFileSync(svgPath);
  const outputDir = path.join(__dirname, "../public/icons");

  const sizes = [48, 72, 96, 128, 144, 192, 384, 512];

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`  ✓ icon-${size}.png`);
  }

  // Maskable icons (80% safe area, 10% padding each side, emerald bg)
  for (const size of [192, 512]) {
    const innerSize = Math.round(size * 0.8);
    const padding = Math.round(size * 0.1);

    await sharp(svgBuffer)
      .resize(innerSize, innerSize)
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 5, g: 150, b: 105, alpha: 1 }
      })
      .png()
      .toFile(path.join(outputDir, `icon-${size}-maskable.png`));
    console.log(`  ✓ icon-${size}-maskable.png`);
  }

  console.log("\n✅ All icons generated in public/icons/");
  console.log("Sizes: " + sizes.join(", ") + " + maskable (192, 512)");
}

generateIcons().catch(console.error);
