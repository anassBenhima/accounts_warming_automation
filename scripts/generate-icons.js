const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

// Fire icon SVG with red background
const createFireIcon = (size) => `
<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <!-- Red background -->
  <rect width="${size}" height="${size}" fill="#DC2626" rx="${size * 0.15}"/>

  <!-- Fire icon (flame shape) -->
  <g transform="translate(${size * 0.5}, ${size * 0.5})">
    <!-- Main flame -->
    <path
      d="M 0,-${size * 0.35}
         C -${size * 0.1},-${size * 0.25} -${size * 0.15},-${size * 0.1} -${size * 0.15},${size * 0.05}
         C -${size * 0.15},${size * 0.15} -${size * 0.1},${size * 0.25} 0,${size * 0.3}
         C ${size * 0.1},${size * 0.25} ${size * 0.15},${size * 0.15} ${size * 0.15},${size * 0.05}
         C ${size * 0.15},-${size * 0.1} ${size * 0.1},-${size * 0.25} 0,-${size * 0.35} Z"
      fill="#FEF3C7"
    />

    <!-- Inner flame (orange) -->
    <path
      d="M 0,-${size * 0.25}
         C -${size * 0.07},-${size * 0.18} -${size * 0.1},-${size * 0.08} -${size * 0.1},${size * 0.02}
         C -${size * 0.1},${size * 0.1} -${size * 0.07},${size * 0.18} 0,${size * 0.22}
         C ${size * 0.07},${size * 0.18} ${size * 0.1},${size * 0.1} ${size * 0.1},${size * 0.02}
         C ${size * 0.1},-${size * 0.08} ${size * 0.07},-${size * 0.18} 0,-${size * 0.25} Z"
      fill="#FDE68A"
    />

    <!-- Core flame (yellow-white) -->
    <path
      d="M 0,-${size * 0.15}
         C -${size * 0.04},-${size * 0.11} -${size * 0.06},-${size * 0.05} -${size * 0.06},0
         C -${size * 0.06},${size * 0.06} -${size * 0.04},${size * 0.11} 0,${size * 0.13}
         C ${size * 0.04},${size * 0.11} ${size * 0.06},${size * 0.06} ${size * 0.06},0
         C ${size * 0.06},-${size * 0.05} ${size * 0.04},-${size * 0.11} 0,-${size * 0.15} Z"
      fill="#FFFBEB"
    />
  </g>
</svg>
`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const iconsDir = path.join(__dirname, '..', 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

async function generateIcons() {
  console.log('Generating Warming app icons...\n');

  for (const size of sizes) {
    const svg = createFireIcon(size);
    const outputPath = path.join(iconsDir, `icon-${size}x${size}.png`);

    try {
      await sharp(Buffer.from(svg))
        .resize(size, size)
        .png({ quality: 100, compressionLevel: 9 })
        .toFile(outputPath);

      console.log(`✓ Generated ${size}x${size} icon`);
    } catch (error) {
      console.error(`✗ Error generating ${size}x${size} icon:`, error.message);
    }
  }

  console.log('\n✓ All icons generated successfully!');
  console.log(`Icons saved to: ${iconsDir}`);
}

generateIcons().catch(console.error);
