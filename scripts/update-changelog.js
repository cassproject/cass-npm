const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');

if (!fs.existsSync(packageJsonPath)) {
    console.error('Error: package.json not found');
    process.exit(1);
}

if (!fs.existsSync(changelogPath)) {
    console.error('Error: CHANGELOG.md not found');
    process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

let lastTag;
try {
    lastTag = execSync('git describe --tags --abbrev=0', { stdio: ['pipe', 'pipe', 'ignore'] }).toString().trim();
} catch (e) {
    console.log('No tags found, starting from first commit.');
}

const logCmd = lastTag ? `git log ${lastTag}..HEAD --oneline --no-merges` : `git log --oneline --no-merges`;
let logs = [];
try {
    const rawLogs = execSync(logCmd).toString().trim();
    if (rawLogs) {
        logs = rawLogs.split('\n');
    }
} catch (e) {
    console.error('Error fetching git logs:', e.message);
    process.exit(1);
}

const formattedLogs = logs.map(line => {
    // Matches "hash (optional decorations) commit message"
    const match = line.match(/^[a-f0-9]+\s+(.*)$/i);
    if (!match) return null;
    let msg = match[1];
    // Remove git decorations like (HEAD -> ..., origin/...)
    msg = msg.replace(/^\(.*\)\s+/, '');
    return `* ${msg}`;
}).filter(Boolean);

if (formattedLogs.length === 0) {
    console.log('No new commits to add to changelog.');
    process.exit(0);
}

let changelog = fs.readFileSync(changelogPath, 'utf8');
const versionHeader = `## ${version}`;
const newSectionContent = formattedLogs.join('\n');

if (changelog.includes(versionHeader)) {
    // Update existing section for this version
    const lines = changelog.split('\n');
    let startLine = -1;
    let nextHeaderLine = -1;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === versionHeader) {
            startLine = i;
            // Find start of next version section
            for (let j = i + 1; j < lines.length; j++) {
                if (lines[j].startsWith('## ')) {
                    nextHeaderLine = j;
                    break;
                }
            }
            break;
        }
    }

    if (startLine !== -1) {
        const replacement = [versionHeader, ...formattedLogs];
        const deleteCount = nextHeaderLine !== -1 ? nextHeaderLine - startLine : lines.length - startLine;
        lines.splice(startLine, deleteCount, ...replacement);
        changelog = lines.join('\n');
    }
} else {
    // Insert new section at the top (after preamble)
    const lines = changelog.split('\n');
    let insertIndex = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('## ')) {
            insertIndex = i;
            break;
        }
    }

    if (insertIndex !== -1) {
        lines.splice(insertIndex, 0, versionHeader, ...formattedLogs, '');
        changelog = lines.join('\n');
    } else {
        // No version headers found yet
        changelog = changelog.trim() + '\n\n' + versionHeader + '\n' + newSectionContent + '\n';
    }
}

fs.writeFileSync(changelogPath, changelog.trim() + '\n');
console.log(`Updated CHANGELOG.md for version ${version}`);
