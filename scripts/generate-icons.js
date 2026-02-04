const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '../frontend/public/icons/icon-svg-base.svg');
const OUTPUT_DIR = path.join(__dirname, '../frontend/public/icons');
const THEME_COLOR = '#7C3AED';

const standardSizes = [72, 96, 128, 144, 152, 192, 384, 512];
const maskableSizes = [192, 512];

async function generateIcons() {
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // 1. Generate Standard Icons (Transparent Background)
    console.log('Generating standard icons...');
    for (const size of standardSizes) {
        await sharp(SVG_PATH)
            .resize(size, size)
            .png()
            .toFile(path.join(OUTPUT_DIR, `icon-${size}.png`));
        console.log(`  Created icon-${size}.png`);
    }

    // 2. Generate Maskable Icons (Solid Background + Safe Zone)
    // Android Adaptive Icons require a safe zone. We'll use a solid background
    // and scale the icon slightly if needed (often 80% is good, but let's try 100% first with just background).
    // Actually, standard practice for maskable:
    // The icon should be centered on a solid background. The "main" content should be within the safe zone (circled 72px diameter on a 108x108 viewport -> radius 66%).
    // Let's create a solid background square, and composite the SVG on top, scaled down to 80% to ensure it fits in the circle mask.

    console.log('Generating maskable icons...');
    for (const size of maskableSizes) {
        // 80% scale for the icon itself to ensure it fits in the circular mask
        const iconSize = Math.floor(size * 0.8);
        const padding = Math.floor((size - iconSize) / 2);

        const iconBuffer = await sharp(SVG_PATH)
            .resize(iconSize, iconSize)
            .toBuffer();

        await sharp({
            create: {
                width: size,
                height: size,
                channels: 4,
                background: THEME_COLOR
            }
        })
            .composite([{ input: iconBuffer, top: padding, left: padding }])
            .png()
            .toFile(path.join(OUTPUT_DIR, `icon-maskable-${size}.png`));

        console.log(`  Created icon-maskable-${size}.png`);
    }

    console.log('Done!');
}

generateIcons().catch(err => {
    console.error('Error generating icons:', err);
    process.exit(1);
});
