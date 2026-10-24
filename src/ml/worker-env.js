// Essentia.js's web build looks for `window`; in a worker the global is `self`. Imported first by the worker.
self.window = self;
