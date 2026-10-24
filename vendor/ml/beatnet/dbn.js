import states from './dbn.data.js';
export function decodeDbn(scores, config = states) {
    if (!(scores instanceof Float32Array) || scores.length % 2 || !scores.every(Number.isFinite))
        throw new TypeError('Provide finite interleaved beat and downbeat probabilities.');
    for (let i = 0; i < scores.length; i += 2)
        if (scores[i] < 0 || scores[i + 1] < 0 || scores[i] + scores[i + 1] > 1.000001)
            throw new RangeError('Invalid beat probabilities.');
    let first = -1, last = 0;
    for (let i = 0; i < scores.length / 2; i++) {
        if (Math.max(scores[2 * i], scores[2 * i + 1]) >= config.threshold) {
            if (first < 0)
                first = i;
            last = i + 1;
        }
    }
    if (first < 0)
        return { beats: [], downbeats: [], workingBytes: 0 };
    const frames = last - first;
    const densities = new Float64Array(frames * 3);
    for (let t = 0; t < frames; t++) {
        const beat = scores[2 * (first + t)], downbeat = scores[2 * (first + t) + 1];
        densities[3 * t] = Math.log((1 - beat - downbeat) / (config.observationLambda - 1));
        densities[3 * t + 1] = Math.log(beat);
        densities[3 * t + 2] = Math.log(downbeat);
    }
    const block = 500;
    let winner;
    const advance = (hmm, previous, next, t, trace, offset = 0) => {
        for (let state = 0; state < next.length; state++) {
            let best = -Infinity, predecessor = 0;
            for (let p = hmm.pointers[state]; p < hmm.pointers[state + 1]; p++) {
                const candidate = previous[hmm.states[p]] + hmm.logTransitions[p];
                if (candidate > best) {
                    best = candidate;
                    predecessor = hmm.states[p];
                }
            }
            next[state] = best + densities[t * 3 + hmm.observations[state]];
            if (trace)
                trace[offset + state] = predecessor;
        }
    };
    let workingBytes = densities.byteLength;
    for (const hmm of config.hmms) {
        let previous = Float64Array.from(hmm.initial), next = new Float64Array(previous.length);
        const checkpoints = [];
        for (let t = 0; t < frames; t++) {
            if (t % block === 0)
                checkpoints.push(previous.slice());
            advance(hmm, previous, next, t);
            [previous, next] = [next, previous];
        }
        let state = 0;
        for (let s = 1; s < previous.length; s++)
            if (previous[s] > previous[state])
                state = s;
        if (!winner || previous[state] > winner.score)
            winner = { hmm, score: previous[state], state, checkpoints };
        workingBytes = Math.max(workingBytes, densities.byteLength + previous.byteLength * (checkpoints.length + 2));
    }
    if (!winner || !Number.isFinite(winner.score))
        return { beats: [], downbeats: [], workingBytes };
    // Checkpoint/recompute traceback bounds memory instead of storing frames × states for a long video.
    const { hmm, checkpoints } = winner;
    const path = new Uint32Array(frames);
    const states = hmm.initial.length;
    const trace = new Uint32Array(block * states);
    workingBytes += trace.byteLength + path.byteLength;
    let state = winner.state;
    for (let chunk = checkpoints.length - 1; chunk >= 0; chunk--) {
        const start = chunk * block, stop = Math.min(frames, start + block);
        let previous = checkpoints[chunk].slice(), next = new Float64Array(states);
        for (let t = start; t < stop; t++) {
            advance(hmm, previous, next, t, trace, (t - start) * states);
            [previous, next] = [next, previous];
        }
        for (let t = stop - 1; t >= start; t--) {
            path[t] = state;
            state = trace[(t - start) * states + state];
        }
    }
    const beats = [], downbeats = [];
    for (let t = 0; t < frames;) {
        if (hmm.observations[path[t]] < 1) {
            t++;
            continue;
        }
        const start = t;
        while (t < frames && hmm.observations[path[t]] >= 1)
            t++;
        let peak = start, value = -Infinity;
        for (let p = start; p < t; p++) {
            const candidate = Math.max(scores[(first + p) * 2], scores[(first + p) * 2 + 1]);
            if (candidate > value) {
                value = candidate;
                peak = p;
            }
        }
        const time = (first + peak) / 50;
        beats.push(time);
        if (Math.floor(hmm.positions[path[peak]]) === 0)
            downbeats.push(time);
    }
    return { beats, downbeats, workingBytes };
}
