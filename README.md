# osply-site

Custom scripts for [osply.co](https://osply.co), served through jsDelivr.

| File | Loaded on | Type |
| --- | --- | --- |
| `dist/core.min.js` | every page | classic, `defer` |
| `dist/home.min.js` | Home | ES module |
| `dist/about.min.js` | About | ES module |
| `dist/work.min.js` | Work case pages | classic, `defer` |

Sources live in `src/`. Build with [Bun](https://bun.sh):

```sh
npm run build
```

Release by tagging (`vX.Y.Z`) and pointing Webflow to the tag:

```
https://cdn.jsdelivr.net/gh/iOstap/osply-site@vX.Y.Z/dist/core.min.js
```

`backup/` holds the original inline Webflow custom code.
