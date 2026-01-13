const fs = require('fs');
const path = require('path');

// 源目录和目标目录
const srcDir = path.join(__dirname, 'src', 'i18n');
const destDir = path.join(__dirname, 'out', 'i18n');

// 创建目标目录
if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
}

// 复制所有JSON文件
const files = fs.readdirSync(srcDir);
files.forEach(file => {
    if (file.endsWith('.json')) {
        const srcFile = path.join(srcDir, file);
        const destFile = path.join(destDir, file);
        fs.copyFileSync(srcFile, destFile);
        console.log(`✅ 已复制 ${file} 到 out/i18n/`);
    }
});

console.log('✅ i18n 文件复制完成');
