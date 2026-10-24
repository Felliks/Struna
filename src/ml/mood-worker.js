// The neural mood, off the main thread: Essentia.js turns 16 kHz mono audio into MusiCNN's mel patches (3 s each) and
// four TensorFlow.js classifiers say how happy, sad, aggressive and relaxed each patch sounds; the answer is their
// average over the song. Libraries from jsdelivr (pinned), models from game/models (tools/ml-models.mjs).
import './worker-env.js';
import * as tf from 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.fesm.min.js';
import { EssentiaWASM } from 'https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia-wasm.es.js';
import { EssentiaTFInputExtractor, TensorflowMusiCNN } from 'https://cdn.jsdelivr.net/npm/essentia.js@0.1.3/dist/essentia.js-model.es.js';

const MOODS = ['happy', 'sad', 'aggressive', 'relaxed'];

self.onmessage = async ({ data: { audio, base } }) => {
  try {
    const features = new EssentiaTFInputExtractor(EssentiaWASM, 'musicnn').computeFrameWise(audio, 256),
      out = {};
    for (const mood of MOODS) {
      const model = new TensorflowMusiCNN(tf, `${base}/${mood}/model.json`);
      await model.initialize();
      // (each patch: [the mood, not the mood]; a song is the mean of its patches)
      const patches = await model.predict(features, true);
      out[mood] = patches.reduce((s, p) => s + p[0], 0) / patches.length;
      model.dispose?.();
    }
    self.postMessage({ mood: out });
  } catch (e) {
    self.postMessage({ error: String(e?.message ?? e) });
  }
};
