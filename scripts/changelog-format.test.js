const chai = require('chai');
const { execSync } = require('child_process');
const { formatLogLine } = require('./changelog-format.js');

const assert = chai.assert;

// The formatting scripts/update-changelog.js used before formatLogLine was split out.
function original(line) {
    const match = line.match(/^[a-f0-9]+\s+(.*)$/i);
    if (!match) return null;
    let msg = match[1];
    msg = msg.replace(/^\(.*\)\s+/, '');
    return `* ${msg}`;
}

describe('changelog formatLogLine', () => {
    const samples = [
        '359226a0 Release 5.0.21',
        '7754208e chore: Upgrade node-forge to 1.4.2, including the browser worker copy',
        'abc123 (HEAD -> 5.0, tag: 5.0.21, origin/5.0) fix: something',
        'abc123 (a) b (c) d',
        'ABC123   spaced   out  ',
        'abc123 ',
        'abc123  \t ',
        'abc123',
        'abc123 x\r',
        'abc123 \r',
        'abc123\tTabbed message',
        'not-a-hash message',
        '',
        ' leading space',
        'abc123 (unclosed decoration',
        'abc123 ()',
        'abc123 () ',
        'abc123 (x) nbsp',
        'abc123 ' + ' '.repeat(5000) + 'x\r',
    ];

    it('formats lines the same way as before', () => {
        for (const line of samples)
            assert.strictEqual(formatLogLine(line), original(line), JSON.stringify(line));
    });

    it('formats this repository\'s history the same way as before', function () {
        let lines;
        try {
            lines = execSync('git log --oneline --no-merges -n 2000', { cwd: __dirname, stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n');
        } catch (e) {
            this.skip();
        }
        for (const line of lines)
            assert.strictEqual(formatLogLine(line), original(line), JSON.stringify(line));
    });

    it('stays fast on long runs of whitespace', () => {
        const start = Date.now();
        formatLogLine('abc123 ' + ' '.repeat(50000) + 'x\r');
        assert.isBelow(Date.now() - start, 100);
    });
});
