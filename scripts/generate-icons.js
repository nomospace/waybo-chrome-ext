const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '..', 'icons', 'logo.svg');
const sizes = [16, 48, 128];

async function generateIcons() {
  const svg = fs.readFileSync(svgPath);
  
  for (const size of sizes) {
    const outputPath = path.join(__dirname, '..', 'icons', `icon${size}.png`);
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✅ 生成: ${outputPath}`);
  }
  
  console.log('\n🎉 所有图标生成完成！');
}

generateIcons().catch(console.error);