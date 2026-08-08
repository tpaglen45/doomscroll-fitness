(function (root, factory) {
    const api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.AppCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    function safeJsonParse(raw, fallback, validator) {
        if (!raw) return fallback;
        try {
            const value = JSON.parse(raw);
            return !validator || validator(value) ? value : fallback;
        } catch (_) {
            return fallback;
        }
    }

    function parseCsvRow(line) {
        const values = [];
        let value = '';
        let quoted = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"' && quoted && line[i + 1] === '"') {
                value += '"';
                i++;
            } else if (char === '"') quoted = !quoted;
            else if (char === ',' && !quoted) {
                values.push(value);
                value = '';
            } else value += char;
        }
        values.push(value);
        return values;
    }

    function historyFromCsv(csv, program) {
        const sessions = new Map();
        csv.trim().split(/\r?\n/).slice(1).forEach(line => {
            if (!line.trim()) return;
            const [date, weekValue, day, name, exercise, setValue, weightValue, repsValue] = parseCsvRow(line);
            const week = Number(weekValue);
            const setNumber = Number(setValue);
            const weight = Number(weightValue);
            const reps = Number(repsValue);
            if (!date || !name || !exercise || ![week, setNumber, weight, reps].every(Number.isFinite)) return;
            const workout = program.find(item => item.week === week && item.name === name);
            const id = workout ? workout.id : `w${week}-${name.toLowerCase().replace(/\s+/g, '-')}`;
            const key = `${date}|${id}`;
            if (!sessions.has(key)) sessions.set(key, { date, id, type: id, name, week, day, sets: {} });
            const session = sessions.get(key);
            if (!session.sets[exercise]) session.sets[exercise] = [];
            session.sets[exercise].push({ setNumber, weight, reps });
        });
        return Array.from(sessions.values()).map(session => {
            Object.keys(session.sets).forEach(exercise => {
                session.sets[exercise].sort((a, b) => a.setNumber - b.setNumber);
                session.sets[exercise] = session.sets[exercise].map(({ weight, reps }) => ({ weight, reps }));
            });
            return session;
        });
    }

    function mergeHistory(current, bundled) {
        const result = current.slice();
        const keys = new Set(current.map(s => `${s.date}|${s.id || s.type || s.name}`));
        bundled.forEach(session => {
            const key = `${session.date}|${session.id || session.type || session.name}`;
            if (!keys.has(key)) {
                result.push(session);
                keys.add(key);
            }
        });
        return result.sort((a, b) => String(a.date).localeCompare(String(b.date)));
    }

    function getNextWorkout(program, history) {
        let furthest = -1;
        history.forEach(session => {
            const id = session.id || session.type;
            const index = program.findIndex(workout => workout.id === id);
            if (index > furthest) furthest = index;
        });
        return program[furthest + 1] || null;
    }

    function csvCell(value) {
        let text = String(value == null ? '' : value);
        if (/^[=+\-@]/.test(text)) text = `'${text}`;
        return `"${text.replace(/"/g, '""')}"`;
    }

    function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    }

    function escapeInlineSingleQuoted(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\r/g, '\\r')
            .replace(/\n/g, '\\n')
            .replace(/\u2028/g, '\\u2028')
            .replace(/\u2029/g, '\\u2029');
    }

    function dateToStr(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function convertWeight(weight, unit) {
        return unit === 'kg' ? Math.round(weight * 0.453592 * 4) / 4 : weight;
    }

    function storeWeight(weight, unit) {
        return unit === 'kg' ? Math.round(weight / 0.453592 * 4) / 4 : weight;
    }

    return { safeJsonParse, parseCsvRow, historyFromCsv, mergeHistory, getNextWorkout, csvCell, escapeHtml, escapeInlineSingleQuoted, dateToStr, convertWeight, storeWeight };
});
