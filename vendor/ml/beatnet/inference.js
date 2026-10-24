import * as ort from '../ort/ort.wasm.min.mjs';
/** Carry recurrent state across 500-frame windows and reset it for each recording. */
export async function inferBeatNet(session, frames, input, onProgress, signal) {
    if (!Number.isSafeInteger(frames) || frames < 1)
        throw new RangeError('Provide a positive frame count.');
    signal?.throwIfAborted();
    let hidden = new ort.Tensor('float32', new Float32Array(300), [2, 1, 150]);
    let cell = new ort.Tensor('float32', new Float32Array(300), [2, 1, 150]);
    const scores = new Float32Array(frames * 2);
    try {
        for (let first = 0; first < frames; first += 500) {
            const count = Math.min(500, frames - first);
            signal?.throwIfAborted();
            onProgress?.('BeatNet inference', first, frames);
            const values = await input(first, count);
            signal?.throwIfAborted();
            if (!(values instanceof Float32Array) || values.length !== count * 272 || !values.every(Number.isFinite)) {
                throw new TypeError('Invalid BeatNet feature window.');
            }
            const features = new ort.Tensor('float32', values, [1, count, 272]);
            let result;
            try {
                result = await session.run({ features, hidden, cell });
                signal?.throwIfAborted();
                const probabilities = result.probabilities;
                if (!probabilities || !(probabilities.data instanceof Float32Array) ||
                    probabilities.dims.join(',') !== `1,${count},3` || !probabilities.data.every(Number.isFinite)) {
                    throw new TypeError('Invalid BeatNet probability output.');
                }
                for (const state of [result.hiddenOut, result.cellOut]) {
                    if (!state || !(state.data instanceof Float32Array) || state.dims.join(',') !== '2,1,150' ||
                        !state.data.every(Number.isFinite))
                        throw new TypeError('Invalid BeatNet recurrent state.');
                }
                for (let i = 0; i < count; i++) {
                    const beat = probabilities.data[i * 3], downbeat = probabilities.data[i * 3 + 1], other = probabilities.data[i * 3 + 2];
                    if (beat < 0 || downbeat < 0 || other < 0 || Math.abs(beat + downbeat + other - 1) > .000001) {
                        throw new RangeError('Invalid BeatNet probabilities.');
                    }
                    scores[(first + i) * 2] = beat;
                    scores[(first + i) * 2 + 1] = downbeat;
                }
                hidden.dispose();
                cell.dispose();
                hidden = result.hiddenOut;
                cell = result.cellOut;
            }
            finally {
                features.dispose();
                for (const tensor of new Set(Object.values(result ?? {}))) {
                    if (tensor !== hidden && tensor !== cell)
                        tensor.dispose();
                }
            }
        }
    }
    finally {
        hidden.dispose();
        cell.dispose();
    }
    return scores;
}
