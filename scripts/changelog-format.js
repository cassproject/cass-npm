// Turns a "git log --oneline" line ("hash (optional decorations) commit message")
// into a changelog bullet, or null when the line has no commit hash.
function formatLogLine(line) {
    // (\S.*)? rather than (.*): whitespace and the message cannot overlap, so a
    // long run of spaces cannot cause backtracking.
    const match = line.match(/^[a-f0-9]+\s+(\S.*)?$/i);
    if (!match) return null;
    let msg = match[1] ?? '';
    // Remove git decorations like (HEAD -> ..., origin/...)
    msg = msg.replace(/^\(.*\)\s+/, '');
    return `* ${msg}`;
}

module.exports = { formatLogLine };
