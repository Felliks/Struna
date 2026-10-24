import preprocessing from './preprocessing.data.js';
import FFT from './fft.js';
// madmom uses a 1411-sample FFT, so use Bluestein's algorithm around fft.js.
// Power-of-two transforms use fft.js directly.
export function magnitudeTransform(size) {
    const powerOfTwo = (size & (size - 1)) === 0;
    const n = powerOfTwo ? size : 2 ** Math.ceil(Math.log2(2 * size - 1));
    const fft = new FFT(n);
    const input = new Float64Array(n * 2);
    const output = new Float64Array(n * 2);
    const kernel = new Float64Array(n * 2);
    const spectrum = new Float64Array(n * 2);
    const chirp = new Float64Array(size * 2);
    if (!powerOfTwo) {
        for (let i = 0; i < size; i++) {
            const angle = Math.PI * ((i * i) % (2 * size)) / size;
            chirp[2 * i] = Math.cos(angle);
            chirp[2 * i + 1] = Math.sin(angle);
            kernel[2 * i] = chirp[2 * i];
            kernel[2 * i + 1] = chirp[2 * i + 1];
            if (i) {
                kernel[2 * (n - i)] = chirp[2 * i];
                kernel[2 * (n - i) + 1] = chirp[2 * i + 1];
            }
        }
        fft.transform(spectrum, kernel);
    }
    return (samples, result) => {
        if (powerOfTwo) {
            fft.realTransform(output, samples);
            fft.completeSpectrum(output);
        }
        else {
            input.fill(0);
            for (let i = 0; i < size; i++) {
                input[2 * i] = samples[i] * chirp[2 * i];
                input[2 * i + 1] = -samples[i] * chirp[2 * i + 1];
            }
            fft.transform(output, input);
            for (let i = 0; i < n; i++) {
                const real = output[2 * i], imag = output[2 * i + 1];
                input[2 * i] = real * spectrum[2 * i] - imag * spectrum[2 * i + 1];
                input[2 * i + 1] = real * spectrum[2 * i + 1] + imag * spectrum[2 * i];
            }
            fft.inverseTransform(output, input);
        }
        // Audio FFT coefficients are far below Float64 overflow/underflow.
        // Avoid hypot's general-purpose scaling for every spectral bin.
        for (let i = 0; i < result.length; i++) {
            const real = output[2 * i], imaginary = output[2 * i + 1];
            result[i] = Math.sqrt(real * real + imaginary * imaginary);
        }
    };
}
export const SAMPLE_RATE = 22050;
export const HOP_SIZE = 441;
const frameSize = 1411, fftSize = 1411, bins = 705, bands = 136;
const window = Float32Array.from(preprocessing.window);
const sparse = preprocessing.filters;
const lag = 1;
export function extractFeatures(pcm, first = 0, count, totalSamples = pcm.length, pcmOffset = 0) {
    if (!(pcm instanceof Float32Array) || !pcm.length || !pcm.every(Number.isFinite))
        throw new TypeError('Provide finite mono PCM samples.');
    const totalFrames = Math.ceil(totalSamples / HOP_SIZE);
    const requested = count ?? totalFrames - first;
    if (![first, requested, totalSamples, pcmOffset].every(Number.isSafeInteger) || first < 0 || requested < 1 || totalSamples < 1 || pcmOffset < 0 || first + requested > totalFrames || pcmOffset + pcm.length > totalSamples)
        throw new RangeError('Invalid audio window bounds.');
    const requiredBegin = Math.max(0, (first - lag) * HOP_SIZE - Math.floor(frameSize / 2));
    const requiredEnd = Math.min(totalSamples, (first + requested - 1) * HOP_SIZE + Math.ceil(frameSize / 2));
    if (pcmOffset > requiredBegin || pcmOffset + pcm.length < requiredEnd)
        throw new RangeError('Audio window is missing FFT or difference context.');
    const end = first + requested;
    const begin = Math.max(0, first - lag);
    const frames = end - begin;
    const base = new Float32Array(frames * bands);
    const transform = magnitudeTransform(fftSize);
    const samples = new Float64Array(fftSize);
    const magnitude = new Float32Array(bins);
    for (let frame = 0; frame < frames; frame++) {
        samples.fill(0);
        for (let i = 0; i < frameSize; i++) {
            let index = (frame + begin) * 441 - Math.floor(frameSize / 2) + i;
            samples[i] = (pcm[index - pcmOffset] ?? 0) * window[i];
        }
        transform(samples, magnitude);
        for (let band = 0; band < bands; band++) {
            let value = 0;
            for (const [bin, weight] of sparse[band])
                value += magnitude[bin] * weight;
            base[frame * bands + band] = Math.log10(1 + value);
        }
    }
    const output = new Float32Array((end - first) * bands * 2);
    for (let frame = first - begin; frame < frames; frame++) {
        const outFrame = frame - (first - begin);
        output.set(base.subarray(frame * bands, (frame + 1) * bands), outFrame * bands * 2);
        for (let band = 0; band < bands; band++) {
            output[outFrame * bands * 2 + bands + band] = frame + begin < lag ? 0 : Math.max(0, base[frame * bands + band] - base[(frame - lag) * bands + band]);
        }
    }
    return output;
}
