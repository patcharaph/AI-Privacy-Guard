const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputSvg = path.join(__dirname, '../public/icons/icon-svg-base.svg');
const outputDir = path.join(__dirname, '../public/icons');

async function generateIcons() {
  console.log('Generating icons from SVG...');
  
  // Ensure output directory exists
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    
    try {
      await sharp(inputSvg)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      
      console.log(`✓ Generated icon-${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to generate icon-${size}.png:`, error.message);
    }
  }

  // Generate maskable icons (same as regular for this design)
  for (const size of [192, 512]) {
    const inputPath = path.join(outputDir, `icon-${size}.png`);
    const outputPath = path.join(outputDir, `icon-maskable-${size}.png`);
    
    try {
      await sharp(inputPath)
        .toFile(outputPath);
      
      console.log(`✓ Generated icon-maskable-${size}.png`);
    } catch (error) {
      console.error(`✗ Failed to generate icon-maskable-${size}.png:`, error.message);
    }
  }

  console.log('\nDone! Icons generated in public/icons/');
}

generateIcons().catch(console.error);
