# /lost_signal/ cryptic website

Open `index.html` in a browser. It is a fully static cryptic ARG-style website with:

- boot sequence
- animated glitch/noise/starfield effects
- fake file archive
- terminal commands
- hidden source-code clues
- persistent progress using localStorage
- five collectible keys
- decoder tools for binary, Caesar shift, and reversed text
- final phrase puzzle

## Main puzzle path

1. Open `audio_logs` to find LANTERN.
2. Recover system logs until STATIC appears.
3. Open `coordinates` to find HOLLOW.
4. Hover/click around `redacted_docs` or use the mirror for MIRROR.
5. Open `version_0` and click the oldest sentence for OBSERVER.
6. Enter the final phrase in Door 17: `the first visitor never left`.

## Useful console secret

Open the browser console and type:

```js
LOST_SIGNAL.keys()
LOST_SIGNAL.reset()
```
