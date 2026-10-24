import * as ort from '../ort/ort.wasm.min.mjs';
import { extractFeatures, HOP_SIZE, SAMPLE_RATE } from './dsp.js';
import { decodeDbn } from './dbn.js';
import { inferBeatNet } from './inference.js';
export { extractFeatures, HOP_SIZE, SAMPLE_RATE } from './dsp.js';
export { decodeDbn } from './dbn.js';
export { inferBeatNet } from './inference.js';
/** Load a reusable offline tracker using ONNX Runtime Web's WASM provider. */
export async function createBeatNet(options) {
    if (!options?.modelUrl)
        throw new TypeError('Provide a BeatNet ONNX model URL.');
    if (options.wasmPaths !== undefined)
        ort.env.wasm.wasmPaths = options.wasmPaths;
    ort.env.wasm.numThreads = 1;
    const session = await ort.InferenceSession.create(options.modelUrl, {
        executionProviders: ['wasm'], graphOptimizationLevel: 'all',
    });
    let busy = false, disposed = false;
    return {
        async analyze(audio, { onProgress, signal } = {}) {
            if (disposed)
                throw new Error('This tracker has been disposed.');
            if (busy)
                throw new Error('This tracker is already analyzing audio.');
            signal?.throwIfAborted();
            const source = audio instanceof Float32Array
                ? { sampleCount: audio.length, read: async (first, count) => audio.subarray(first, first + count) } : audio;
            if (!source || !Number.isSafeInteger(source.sampleCount) || source.sampleCount < 1 || typeof source.read !== 'function') {
                throw new TypeError('Provide nonempty mono audio at 22,050 Hz.');
            }
            busy = true;
            try {
                const frames = Math.ceil(source.sampleCount / HOP_SIZE);
                const scores = await inferBeatNet(session, frames, async (first, count) => {
                    signal?.throwIfAborted();
                    const begin = Math.max(0, (first - 1) * HOP_SIZE - 1411);
                    const end = Math.min(source.sampleCount, (first + count) * HOP_SIZE + 1411);
                    const pcm = await source.read(begin, end - begin);
                    signal?.throwIfAborted();
                    if (!(pcm instanceof Float32Array) || pcm.length !== end - begin)
                        throw new TypeError('Invalid audio window.');
                    return extractFeatures(pcm, first, count, source.sampleCount, begin);
                }, onProgress, signal);
                signal?.throwIfAborted();
                onProgress?.('Decoding beats');
                const result = decodeDbn(scores);
                signal?.throwIfAborted();
                const beatConfidence = [], downbeatConfidence = [];
                for (let i = 0; i < frames; i++) {
                    beatConfidence[i] = Math.min(1, scores[2 * i] + scores[2 * i + 1]);
                    downbeatConfidence[i] = scores[2 * i + 1];
                }
                const duration = source.sampleCount / SAMPLE_RATE;
                return { beats: result.beats.filter(time => time < duration), downbeats: result.downbeats.filter(time => time < duration),
                    beatConfidence, downbeatConfidence };
            }
            finally {
                busy = false;
            }
        },
        async dispose() {
            if (busy)
                throw new Error('Wait for analysis to finish before disposing this tracker.');
            if (!disposed) {
                disposed = true;
                await session.release();
            }
        },
    };
}
