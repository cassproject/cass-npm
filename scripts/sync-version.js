const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const yuidocJsonPath = path.join(__dirname, '..', 'yuidoc.json');

if (!fs.existsSync(packageJsonPath)) {
    console.error(`Error: package.json not found at ${packageJsonPath}`);
    process.exit(1);
}

if (!fs.existsSync(yuidocJsonPath)) {
    console.error(`Error: yuidoc.json not found at ${yuidocJsonPath}`);
    process.exit(1);
}

try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const yuidocJson = JSON.parse(fs.readFileSync(yuidocJsonPath, 'utf8'));

    if (yuidocJson.version === packageJson.version) {
        console.log(`Versions are already in sync (${packageJson.version}).`);
    } else {
        const oldVersion = yuidocJson.version;
        yuidocJson.version = packageJson.version;

        // Ensure yuidoc.json has the same indentation (4 spaces) and ends with a newline
        fs.writeFileSync(yuidocJsonPath, JSON.stringify(yuidocJson, null, 4) + '\n');
        console.log(`Updated yuidoc.json version from ${oldVersion} to ${packageJson.version}`);
    }
} catch (error) {
    console.error('Error synchronizing versions:', error.message);
    process.exit(1);
}
