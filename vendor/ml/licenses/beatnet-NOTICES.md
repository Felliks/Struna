# Upstream attribution

BeatNet by Mojtaba Heydari and collaborators (2021):
https://github.com/mjhydri/BeatNet . This port uses BeatNet 1.1.1's model 1.
The model and adapted forward pass in `scripts/export.py` retain Creative Commons
Attribution 4.0 International, reproduced in `licenses/BeatNet-CC-BY-4.0.txt`.
The ONNX export makes the recurrent state explicit; it does not change the
checkpoint weights. No training data is included. Distributing the model must
retain this attribution and its license.

The spectrogram, positive-difference preprocessing, DBN/HMM/Viterbi decoding and
beat correction reproduce madmom 0.16.1:
https://github.com/CPJKU/madmom/tree/v0.16.1 . Its source code is BSD-2-Clause,
reproduced in `licenses/madmom-BSD-2-Clause.txt`. The TypeScript decoder uses
checkpointed traceback to bound memory. `src/preprocessing.json` and `src/dbn.json`
contain deterministically constructed filterbanks, windows and state spaces;
none of madmom's pretrained models are distributed.

The TypeScript implementation and other original contributions use the MIT
license in `LICENSE`. Upstream materials retain the licenses above. ONNX Runtime
Web and fft.js retain their notices in their installed packages.
