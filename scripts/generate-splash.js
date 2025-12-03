/**
 * Splash Screen Generation Script for Deadblock
 * 
 * Generates splash screens for:
 * - Android (various densities)
 * - iOS (various device sizes)
 * 
 * Prerequisites:
 *   npm install sharp
 * 
 * Usage:
 *   1. Place your source splash as 'splash-source.png' (2732x2732 recommended) in project root
 *   2. Run: node scripts/generate-splash.js
 */

import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Background color matching your app theme
const BG_COLOR = { r: 2, g: 6, b: 23, alpha: 1 }; // #020617

// Source splash path
const SOURCE_SPLASH = path.join(projectRoot, 'splash-source.png');

// Splash screen configurations
const splashScreens = {
  // Android splash screens
  android: [
    { width: 480, height: 800, folder: 'drawable-mdpi', name: 'splash.png' },
    { width: 720, height: 1280, folder: 'drawable-hdpi', name: 'splash.png' },
    { width: 960, height: 1600, folder: 'drawable-xhdpi', name: 'splash.png' },
    { width: 1280, height: 1920, folder: 'drawable-xxhdpi', name: 'splash.png' },
    { width: 1920, height: 2560, folder: 'drawable-xxxhdpi', name: 'splash.png' },
    // Land versions
    { width: 800, height: 480, folder: 'drawable-land-mdpi', name: 'splash.png' },
    { width: 1280, height: 720, folder: 'drawable-land-hdpi', name: 'splash.png' },
    { width: 1600, height: 960, folder: 'drawable-land-xhdpi', name: 'splash.png' },
    { width: 1920, height: 1280, folder: 'drawable-land-xxhdpi', name: 'splash.png' },
    { width: 2560, height: 1920, folder: 'drawable-land-xxxhdpi', name: 'splash.png' },
  ],
  
  // iOS splash screens (LaunchImage)
  ios: [
    // iPhone
    { width: 640, height: 1136, name: 'Default-568h@2x~iphone.png' },
    { width: 750, height: 1334, name: 'Default-667h.png' },
    { width: 1242, height: 2208, name: 'Default-736h.png' },
    { width: 1125, height: 2436, name: 'Default-812h.png' },
    { width: 828, height: 1792, name: 'Default-896h~iphone.png' },
    { width: 1242, height: 2688, name: 'Default-896h@3x~iphone.png' },
    { width: 1170, height: 2532, name: 'Default-1170h.png' },
    { width: 1284, height: 2778, name: 'Default-1284h.png' },
    { width: 1179, height: 2556, name: 'Default-1179h.png' },
    { width: 1290, height: 2796, name: 'Default-1290h.png' },
    // iPad
    { width: 1536, height: 2048, name: 'Default-Portrait@2x~ipad.png' },
    { width: 2048, height: 2732, name: 'Default-Portrait@2x~ipadpro.png' },
    { width: 2048, height: 1536, name: 'Default-Landscape@2x~ipad.png' },
    { width: 2732, height: 2048, name: 'Default-Landscape@2x~ipadpro.png' },
  ]
};

// Create directory if it doesn't exist
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

// Generate a splash screen with centered logo
async function generateSplash(source, outputPath, width, height) {
  // Calculate logo size (40% of smaller dimension)
  const logoSize = Math.floor(Math.min(width, height) * 0.4);
  
  // Create background
  const background = sharp({
    create: {
      width: width,
      height: height,
      channels: 4,
      background: BG_COLOR
    }
  });
  
  // Resize logo
  const logo = await sharp(source)
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  
  // Composite logo on background (centered)
  await background
    .composite([{
      input: logo,
      gravity: 'center'
    }])
    .png()
    .toFile(outputPath);
  
  console.log(`Generated: ${outputPath} (${width}x${height})`);
}

// Generate a simple splash (solid color with text) if no source exists
async function generateSimpleSplash(outputPath, width, height, text = 'DEADBLOCK') {
  const fontSize = Math.floor(Math.min(width, height) * 0.08);
  
  const svg = `
    <svg width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="#020617"/>
      <text 
        x="50%" 
        y="50%" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold"
        fill="url(#gradient)"
        text-anchor="middle" 
        dominant-baseline="middle"
      >${text}</text>
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#ec4899"/>
          <stop offset="50%" style="stop-color:#fde047"/>
          <stop offset="100%" style="stop-color:#22d3ee"/>
        </linearGradient>
      </defs>
    </svg>
  `;
  
  await sharp(Buffer.from(svg))
    .png()
    .toFile(outputPath);
  
  console.log(`Generated (simple): ${outputPath} (${width}x${height})`);
}

// Main function
async function generateAllSplashScreens() {
  console.log('🎨 Deadblock Splash Screen Generator\n');
  
  const hasSource = fs.existsSync(SOURCE_SPLASH);
  
  if (!hasSource) {
    console.log(`⚠️  Source splash not found: ${SOURCE_SPLASH}`);
    console.log('   Generating simple text-based splash screens instead.\n');
  } else {
    console.log(`📁 Source: ${SOURCE_SPLASH}\n`);
  }
  
  // Generate Android splash screens
  console.log('🤖 Generating Android splash screens...');
  const androidResDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
  
  for (const splash of splashScreens.android) {
    const outputDir = path.join(androidResDir, splash.folder);
    ensureDir(outputDir);
    const outputPath = path.join(outputDir, splash.name);
    
    if (hasSource) {
      await generateSplash(SOURCE_SPLASH, outputPath, splash.width, splash.height);
    } else {
      await generateSimpleSplash(outputPath, splash.width, splash.height);
    }
  }
  
  // Generate iOS splash screens
  console.log('\n🍎 Generating iOS splash screens...');
  const iosSplashDir = path.join(projectRoot, 'ios', 'App', 'App', 'Assets.xcassets', 'Splash.imageset');
  ensureDir(iosSplashDir);
  
  for (const splash of splashScreens.ios) {
    const outputPath = path.join(iosSplashDir, splash.name);
    
    if (hasSource) {
      await generateSplash(SOURCE_SPLASH, outputPath, splash.width, splash.height);
    } else {
      await generateSimpleSplash(outputPath, splash.width, splash.height);
    }
  }
  
  // Generate iOS Contents.json for splash
  const splashContentsJson = {
    images: splashScreens.ios.map(splash => ({
      filename: splash.name,
      idiom: splash.name.includes('ipad') ? 'ipad' : 'iphone',
      scale: splash.name.includes('@3x') ? '3x' : splash.name.includes('@2x') ? '2x' : '1x'
    })),
    info: { author: 'xcode', version: 1 }
  };
  
  fs.writeFileSync(
    path.join(iosSplashDir, 'Contents.json'),
    JSON.stringify(splashContentsJson, null, 2)
  );
  
  console.log('\n✅ All splash screens generated successfully!');
}

generateAllSplashScreens().catch(console.error);
