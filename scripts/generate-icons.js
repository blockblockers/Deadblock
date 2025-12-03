/**
 * Icon Generation Script for Deadblock
 * 
 * Generates all required icon sizes for:
 * - PWA (manifest.json)
 * - Android (Capacitor)
 * - iOS (Capacitor)
 * 
 * Prerequisites:
 *   npm install sharp
 * 
 * Usage:
 *   1. Place your source icon as 'icon-source.png' (1024x1024 recommended) in project root
 *   2. Run: node scripts/generate-icons.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Source icon path
const SOURCE_ICON = path.join(projectRoot, 'icon-source.png');

// Icon configurations
const icons = {
  // PWA icons (public/icons/)
  pwa: [
    { size: 72, name: 'icon-72.png' },
    { size: 96, name: 'icon-96.png' },
    { size: 128, name: 'icon-128.png' },
    { size: 144, name: 'icon-144.png' },
    { size: 152, name: 'icon-152.png' },
    { size: 192, name: 'icon-192.png' },
    { size: 384, name: 'icon-384.png' },
    { size: 512, name: 'icon-512.png' },
    // Maskable icons (with padding for safe area)
    { size: 192, name: 'icon-maskable-192.png', maskable: true },
    { size: 512, name: 'icon-maskable-512.png', maskable: true },
  ],
  
  // Android icons (android/app/src/main/res/)
  android: [
    { size: 48, folder: 'mipmap-mdpi', name: 'ic_launcher.png' },
    { size: 72, folder: 'mipmap-hdpi', name: 'ic_launcher.png' },
    { size: 96, folder: 'mipmap-xhdpi', name: 'ic_launcher.png' },
    { size: 144, folder: 'mipmap-xxhdpi', name: 'ic_launcher.png' },
    { size: 192, folder: 'mipmap-xxxhdpi', name: 'ic_launcher.png' },
    // Round icons
    { size: 48, folder: 'mipmap-mdpi', name: 'ic_launcher_round.png', round: true },
    { size: 72, folder: 'mipmap-hdpi', name: 'ic_launcher_round.png', round: true },
    { size: 96, folder: 'mipmap-xhdpi', name: 'ic_launcher_round.png', round: true },
    { size: 144, folder: 'mipmap-xxhdpi', name: 'ic_launcher_round.png', round: true },
    { size: 192, folder: 'mipmap-xxxhdpi', name: 'ic_launcher_round.png', round: true },
    // Foreground (for adaptive icons)
    { size: 108, folder: 'mipmap-mdpi', name: 'ic_launcher_foreground.png', foreground: true },
    { size: 162, folder: 'mipmap-hdpi', name: 'ic_launcher_foreground.png', foreground: true },
    { size: 216, folder: 'mipmap-xhdpi', name: 'ic_launcher_foreground.png', foreground: true },
    { size: 324, folder: 'mipmap-xxhdpi', name: 'ic_launcher_foreground.png', foreground: true },
    { size: 432, folder: 'mipmap-xxxhdpi', name: 'ic_launcher_foreground.png', foreground: true },
  ],
  
  // iOS icons (ios/App/App/Assets.xcassets/AppIcon.appiconset/)
  ios: [
    { size: 20, name: 'AppIcon-20x20@1x.png' },
    { size: 40, name: 'AppIcon-20x20@2x.png' },
    { size: 60, name: 'AppIcon-20x20@3x.png' },
    { size: 29, name: 'AppIcon-29x29@1x.png' },
    { size: 58, name: 'AppIcon-29x29@2x.png' },
    { size: 87, name: 'AppIcon-29x29@3x.png' },
    { size: 40, name: 'AppIcon-40x40@1x.png' },
    { size: 80, name: 'AppIcon-40x40@2x.png' },
    { size: 120, name: 'AppIcon-40x40@3x.png' },
    { size: 60, name: 'AppIcon-60x60@1x.png' },
    { size: 120, name: 'AppIcon-60x60@2x.png' },
    { size: 180, name: 'AppIcon-60x60@3x.png' },
    { size: 76, name: 'AppIcon-76x76@1x.png' },
    { size: 152, name: 'AppIcon-76x76@2x.png' },
    { size: 167, name: 'AppIcon-83.5x83.5@2x.png' },
    { size: 1024, name: 'AppIcon-512@2x.png' },
  ]
};

// Create directory if it doesn't exist
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Generate a single icon
async function generateIcon(source, outputPath, size, options = {}) {
  let image = sharp(source);
  
  if (options.maskable) {
    // Maskable icons need padding (icon should be ~80% of total size)
    const iconSize = Math.floor(size * 0.8);
    const padding = Math.floor((size - iconSize) / 2);
    
    image = image
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 2, g: 6, b: 23, alpha: 1 } })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 2, g: 6, b: 23, alpha: 1 } // #020617
      });
  } else if (options.foreground) {
    // Foreground for adaptive icons (centered with transparent background)
    const iconSize = Math.floor(size * 0.6);
    const padding = Math.floor((size - iconSize) / 2);
    
    image = image
      .resize(iconSize, iconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({
        top: padding,
        bottom: padding,
        left: padding,
        right: padding,
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      });
  } else if (options.round) {
    // Round icons (circular mask)
    const roundedCorners = Buffer.from(
      `<svg><circle cx="${size/2}" cy="${size/2}" r="${size/2}"/></svg>`
    );
    
    image = image
      .resize(size, size, { fit: 'cover' })
      .composite([{
        input: roundedCorners,
        blend: 'dest-in'
      }]);
  } else {
    image = image.resize(size, size, { fit: 'contain', background: { r: 2, g: 6, b: 23, alpha: 1 } });
  }
  
  await image.png().toFile(outputPath);
  console.log(`Generated: ${outputPath} (${size}x${size})`);
}

// Main function
async function generateAllIcons() {
  console.log('🎨 Deadblock Icon Generator\n');
  
  // Check if source icon exists
  if (!fs.existsSync(SOURCE_ICON)) {
    console.error(`❌ Source icon not found: ${SOURCE_ICON}`);
    console.log('\nPlease create a 1024x1024 PNG icon named "icon-source.png" in the project root.');
    console.log('\nYou can use this placeholder command to create a temporary icon:');
    console.log('  Or use an online tool like https://www.canva.com or https://www.figma.com\n');
    process.exit(1);
  }
  
  console.log(`📁 Source: ${SOURCE_ICON}\n`);
  
  // Generate PWA icons
  console.log('📱 Generating PWA icons...');
  const pwaDir = path.join(projectRoot, 'public', 'icons');
  ensureDir(pwaDir);
  
  for (const icon of icons.pwa) {
    const outputPath = path.join(pwaDir, icon.name);
    await generateIcon(SOURCE_ICON, outputPath, icon.size, { maskable: icon.maskable });
  }
  
  // Generate Android icons
  console.log('\n🤖 Generating Android icons...');
  const androidResDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
  
  for (const icon of icons.android) {
    const outputDir = path.join(androidResDir, icon.folder);
    ensureDir(outputDir);
    const outputPath = path.join(outputDir, icon.name);
    await generateIcon(SOURCE_ICON, outputPath, icon.size, { 
      round: icon.round, 
      foreground: icon.foreground 
    });
  }
  
  // Generate iOS icons
  console.log('\n🍎 Generating iOS icons...');
  const iosIconDir = path.join(projectRoot, 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset');
  ensureDir(iosIconDir);
  
  for (const icon of icons.ios) {
    const outputPath = path.join(iosIconDir, icon.name);
    await generateIcon(SOURCE_ICON, outputPath, icon.size);
  }
  
  // Generate iOS Contents.json
  const contentsJson = {
    images: icons.ios.map(icon => ({
      filename: icon.name,
      idiom: 'universal',
      platform: 'ios',
      size: `${Math.round(icon.size / (icon.name.includes('@3x') ? 3 : icon.name.includes('@2x') ? 2 : 1))}x${Math.round(icon.size / (icon.name.includes('@3x') ? 3 : icon.name.includes('@2x') ? 2 : 1))}`,
      scale: icon.name.includes('@3x') ? '3x' : icon.name.includes('@2x') ? '2x' : '1x'
    })),
    info: { author: 'xcode', version: 1 }
  };
  
  fs.writeFileSync(
    path.join(iosIconDir, 'Contents.json'),
    JSON.stringify(contentsJson, null, 2)
  );
  console.log(`Generated: ${path.join(iosIconDir, 'Contents.json')}`);
  
  console.log('\n✅ All icons generated successfully!');
  console.log('\nNext steps:');
  console.log('  1. Run: npm run build');
  console.log('  2. Run: npx cap sync');
  console.log('  3. Run: npx cap open android  (or ios)');
}

generateAllIcons().catch(console.error);
