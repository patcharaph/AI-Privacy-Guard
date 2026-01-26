# Icon Generation Guide

## วิธีสร้างไอคอนจาก SVG

ใช้ไฟล์ `icon-svg-base.svg` เป็นต้นแบบแล้ว export เป็น PNG ขนาดต่างๆ

### ขนาดที่ต้องการ

| ไฟล์ | ขนาด | ใช้สำหรับ |
|------|------|----------|
| icon-72.png | 72x72 | Android legacy |
| icon-96.png | 96x96 | Android legacy |
| icon-128.png | 128x128 | Chrome Web Store |
| icon-144.png | 144x144 | iOS/Android |
| icon-152.png | 152x152 | iOS |
| icon-192.png | 192x192 | PWA (required) |
| icon-384.png | 384x384 | PWA |
| icon-512.png | 512x512 | PWA/Play Store (required) |
| icon-maskable-192.png | 192x192 | Android Adaptive |
| icon-maskable-512.png | 512x512 | Android Adaptive |

### วิธีที่ 1: ใช้ Online Tool

1. ไปที่ https://realfavicongenerator.net
2. อัพโหลด `icon-svg-base.svg`
3. ดาวน์โหลด icon pack

### วิธีที่ 2: ใช้ npm script (แนะนำ)

```bash
# ติดตั้ง sharp (ถ้ายังไม่มี)
npm install sharp --save-dev

# รัน script สร้าง icons
npm run generate-icons
```

Script จะสร้างไฟล์ทั้งหมดใน `public/icons/` โดยอัตโนมัติ

### วิธีที่ 3: ใช้ ImageMagick (Command Line)

> ⚠️ ต้องติดตั้ง ImageMagick ก่อน และต้องใช้ Admin rights

```bash
# Install ImageMagick first (ต้องรัน terminal ด้วย Admin)
# Windows: choco install imagemagick
# Mac: brew install imagemagick

# Generate all sizes
magick icon-svg-base.svg -resize 72x72 icon-72.png
magick icon-svg-base.svg -resize 96x96 icon-96.png
magick icon-svg-base.svg -resize 128x128 icon-128.png
magick icon-svg-base.svg -resize 144x144 icon-144.png
magick icon-svg-base.svg -resize 152x152 icon-152.png
magick icon-svg-base.svg -resize 192x192 icon-192.png
magick icon-svg-base.svg -resize 384x384 icon-384.png
magick icon-svg-base.svg -resize 512x512 icon-512.png

# Maskable icons (same as regular for now)
cp icon-192.png icon-maskable-192.png
cp icon-512.png icon-maskable-512.png
```

### วิธีที่ 4: ใช้ Sharp (Node.js) - Custom Script

```javascript
const sharp = require('sharp');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

sizes.forEach(size => {
  sharp('icon-svg-base.svg')
    .resize(size, size)
    .png()
    .toFile(`icon-${size}.png`);
});
```

### วิธีที่ 5: ใช้ Figma/Canva

1. Import SVG เข้า Figma
2. Export เป็น PNG ขนาดต่างๆ

## Maskable Icons

สำหรับ Android Adaptive Icons ควรมี safe zone 80% ตรงกลาง
ไอคอนปัจจุบันออกแบบให้ใช้ได้ทั้ง regular และ maskable
