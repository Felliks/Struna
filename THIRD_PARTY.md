# Third parties

Struna's own code is MIT (see LICENSE). These parts come from others and keep their own licences.

| what | where | licence |
| --- | --- | --- |
| [Planck.js](https://github.com/piqnt/planck.js) (2D physics) | `vendor/planck.min.js` | MIT (`vendor/planck.LICENSE.txt`) |
| [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) | `vendor/ml/ort/` | MIT (`vendor/ml/licenses/`) |
| [BeatNet](https://github.com/mjhydri/BeatNet) model and its JS port | `vendor/ml/beatnet/` | CC BY 4.0 / MIT (`vendor/ml/licenses/`) |
| [madmom](https://github.com/CPJKU/madmom) (the beat tracking's DBN) | `vendor/ml/beatnet/` | BSD 2-Clause (`vendor/ml/licenses/`) |
| [Basic Pitch](https://github.com/spotify/basic-pitch) | `vendor/ml/basic-pitch/` | Apache 2.0 (`vendor/ml/licenses/`) |
| [Spleeter](https://github.com/deezer/spleeter) (vocals) | `vendor/ml/spleeter/` | MIT (`vendor/ml/licenses/`) |
| [SwiftF0](https://github.com/lars76/swift-f0) (pitch) | `vendor/ml/swift-f0/` | MIT (`vendor/ml/licenses/`) |
| [Unbounded](https://fonts.google.com/specimen/Unbounded) and [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | `vendor/fonts/` | SIL Open Font License 1.1 |
| Motion capture from [Mixamo](https://www.mixamo.com) (Adobe), reduced to 2D joint positions | `data/clips.json` | Mixamo terms: for use in this game, not for redistribution on its own |

**Not included:** the optional neural mood models (`?ml`; non-commercial licence), and any songs. The built-in list
streams songs from [Audius](https://audius.co) under their artists' terms, each credited in the game; the analyses of
those songs in `data/known` and `data/heard` are measurements (beats, loudness, notes), not audio. Lyrics, where shown,
come from [LRCLIB](https://lrclib.net).
