const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Core = require('../app-core.js');

const program = [
    { id: 'w1-upper-1', week: 1, name: 'Upper 1' },
    { id: 'w1-lower-1', week: 1, name: 'Lower 1' },
    { id: 'w1-upper-2', week: 1, name: 'Upper 2' }
];

test('safe JSON parsing recovers from malformed and wrong-shaped storage', () => {
    assert.deepEqual(Core.safeJsonParse('{bad', [], Array.isArray), []);
    assert.deepEqual(Core.safeJsonParse('{}', [], Array.isArray), []);
    assert.deepEqual(Core.safeJsonParse('[1]', [], Array.isArray), [1]);
});

test('bundled CSV imports every set into 19 sessions', () => {
    const csv = fs.readFileSync(path.join(__dirname, '..', 'josh-program-2026-08-08.csv'), 'utf8');
    const fullProgram = Array.from({ length: 9 }, (_, index) => ({ id: `placeholder-${index}`, week: index + 1, name: 'Placeholder' }));
    const history = Core.historyFromCsv(csv, fullProgram);
    const setCount = history.reduce((total, session) => total + Object.values(session.sets).reduce((sum, sets) => sum + sets.length, 0), 0);
    assert.equal(history.length, 19);
    assert.equal(setCount, 251);
});

test('history merge deduplicates by workout and date while preserving current data', () => {
    const current = [{ date: '2026-01-01', id: 'w1-upper-1', sets: { Press: [{ weight: 99, reps: 1 }] } }];
    const bundled = [
        { date: '2026-01-01', id: 'w1-upper-1', sets: { Press: [{ weight: 10, reps: 10 }] } },
        { date: '2026-01-02', id: 'w1-lower-1', sets: {} }
    ];
    const merged = Core.mergeHistory(current, bundled);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].sets.Press[0].weight, 99);
});

test('progression follows furthest completed ID, not number of records', () => {
    const history = [
        { id: 'w1-upper-1' },
        { id: 'w1-upper-1' },
        { id: 'w1-lower-1' }
    ];
    assert.equal(Core.getNextWorkout(program, history).id, 'w1-upper-2');
    assert.equal(Core.getNextWorkout(program, [...history, { id: 'w1-upper-2' }]), null);
});

test('CSV export escapes quotes and neutralizes spreadsheet formulas', () => {
    assert.equal(Core.csvCell('Farmer "Carry"'), '"Farmer ""Carry"""');
    assert.equal(Core.csvCell('=2+2'), '"\'=2+2"');
});

test('HTML escaping neutralizes stored markup', () => {
    assert.equal(Core.escapeHtml('<img src=x onerror="bad">'), '&lt;img src=x onerror=&quot;bad&quot;&gt;');
    assert.equal(Core.escapeInlineSingleQuoted("x&apos;);alert(1)//"), "x&amp;apos;);alert(1)//");
    assert.equal(Core.escapeInlineSingleQuoted("line\nbreak"), 'line\\nbreak');
});

test('local date formatting and unit conversions round-trip predictably', () => {
    assert.equal(Core.dateToStr(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
    assert.equal(Core.convertWeight(100, 'kg'), 45.25);
    assert.ok(Math.abs(Core.storeWeight(Core.convertWeight(100, 'kg'), 'kg') - 100) <= 0.25);
});
