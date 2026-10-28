# Alhanouf Khalid

Portfolio for Alhanouf Khalid Alaswad, a visual artist and graphic designer. The line on the About scene is hers: “Hi, I'm Alhanouf a visual artist and graphic designer.”

The page has four scenes: About, Ceramics, Design, and Art. About is a still editorial layout. Design is an open cream folder. Ceramics is a potter’s wheel. Art is a gallery wall. Design shows Peak Identity and MEQAF Identity from `assets/hanouf/design/`. Ceramics shows her two pottery models. Art shows three photographs in wood frames: Black print, Girl print, and the wood sculpture Layers. A line is printed only when it comes from her site or from text on the work itself.

**This site:** https://hamdihudhaidh.github.io/AlHanouf_Portfolio/

**Original portfolio:** https://alhanoufalaswad.myportfolio.com

## Scenes

| Scene | Hash | What you see |
| --- | --- | --- |
| About | `#about` | Placeholder portrait, her welcome line, LinkedIn and WhatsApp |
| Ceramics | `#ceramics` | The wheel. Two of her models, thrown large. The spinning clay is that model’s own silhouette. After the wheel has fully stopped, the finished colour fades in. Two clay textures sit beside the wheel |
| Design | `#design` | An open cream hard-cover folder, no rings. Peak Identity and MEQAF Identity, two spreads each. A tall rounded side tab carries the project name |
| Art | `#art` | Gallery wall. 00 is the whole room. Three photographs in wood frames: Black print, Girl print, and Layers, each with a wall label |

`#exhibition` opens Art and the address bar becomes `#art`.

The current page name sits at the top centre. The previous page name sits at the bottom left, and the next page name at the bottom right. Art’s next page is About, and About’s previous page is Art. The counter and arrows stay at the bottom centre. They step through the items of the scene you are in. Arrow keys and a horizontal swipe do the same. Space is a shortcut for the next item.

The folder opens on Peak Identity. Each project is two spreads, so the counter runs 01 to 04: Peak, Peak, MEQAF, MEQAF. Each page is Hamdi’s template photograph, so the folder, the tabs, the type, and the pictures match that spread. The right-hand page curls to the next spread. The laptop and the two iPad mockups play their clips inside the device screen, muted and looping, only while that screen is showing. A phone frames both pages.

Art starts on 00, a zoomed-out view of the whole wall, with air above the frames. 01 and onward glide the camera in one shot to a piece. A press during that glide retargets it. Each photograph hangs in a carved wood frame under a warm spotlight, with the picture set into the frame. The two prints use the print frame. Layers is a tall side view, so its frame is tall and narrow. The label is printed in the room, not on a card: the artist, then place and life years only when those were given, then the italic title with the year, then the medium, then the description. Any of those lines is left off when the piece has no data for it. None of these three has a year. On a wide screen the label sits beside the work. On a tall screen it sits below the frame.

About has a single view, so the arrows stay hidden. They also stay hidden on Ceramics or Art if that list is emptied.

If the browser asks for reduced motion, the folder cuts to the chosen spread instead of turning the page, and the camera cuts. The gallery cuts instead of gliding, the wheel cuts, and the grain overlay holds still.

## Folder structure

```
index.html
css/style.css
js/main.js            scenes, hash routing, arrows
js/ceramics.js        potter’s wheel
js/design.js          cream folder, page turns, side tabs
js/exhibition.js      Art gallery, camera glide, museum labels
js/clay.js            earlier wheel shader, not used by the current throw
js/projects.js        all editable text and image lists
js/vendor/            three.js r169, vendored
assets/fonts/         Cormorant Garamond and Inter
assets/img/           favicon and the portrait placeholder
assets/projects/      published design stills and clips
assets/hanouf/        her art, pottery models, and later design files
```

Paths are relative, so the site works from a local server or under `/AlHanouf_Portfolio/` on GitHub Pages.

## Edit the content

Everything you would change is in `js/projects.js`.

**About.** `ARTIST` holds her name, the welcome line, the portrait path, and the links. The page shows LinkedIn and WhatsApp only. The portrait on the site is a placeholder drawing. Replace `assets/img/portrait.svg` with a photograph and update `portrait` and `portraitNote`. There is no portrait on the original portfolio.

**Design.** `DESIGN` holds Peak Identity and MEQAF Identity. Each project has two `spreads`. The words, years, and swatch names are the ones printed on the template spreads in `assets/hanouf/design/`. A video plays inside the device mockup named beside it. `slots` lists those files for the loader.

**Ceramics.** Each object is one piece on the wheel. `model` is an OBJ. The throw morphs the previous piece’s silhouette into this one, in clay. After the wheel has completely stopped, the finished colour, metalness and roughness fade in. Two CC0 clay textures (terracotta and grey stoneware) are on each piece; the pair of dots beside the wheel switches them. The two pieces have no published title, so the label is Untitled.

**Art.** Each object looks like:

```js
{ kind: 'painting', title: '', image: 'assets/projects/example/01.webp', artist: '', year: '', medium: '', dimensions: '', description: '' }
```

`kind` is `painting` or `sculpture`. Either one hangs in a wood frame when `image` is set. The three pieces are Black print, Girl print, and Layers. Their titles, media, and descriptions are copied from `assets/hanouf/art/ART.md`. Layers is the transparent side-view photograph, set on paper inside the frame. `cutout` keeps that transparency. Omit any field she did not give, including the year. The wall label prints only the fields that are present. `place` and `life` are optional and are not invented.

## Run locally

Opening `index.html` with `file://` will not work. The page loads JavaScript as modules, and browsers block that from a file URL.

```bash
python3 -m http.server
```

Then open http://localhost:8000.

## Tech

- **three.js r169**, self-hosted at `js/vendor/three.module.js`, loaded with an import map. No CDN.
- **RoomEnvironment** (`js/vendor/addons/RoomEnvironment.js`) for the lighting. One capture is reused per blur amount.
- The wheel builds a clay shell from each pottery model and morphs one shell into the next. The finished material fades in only after the wheel stops. The models load a lossless meshopt `.mesh` beside the OBJ. The clay maps are CC0 textures from ambientCG, noted in `assets/hanouf/pottery/textures/LICENSE.txt`.
- Photographs load a sibling `.avif` or `.webp` when `js/modern-map.js` lists one. The original file is the fallback. Roughness and normal maps stay JPEG.
- **Cormorant Garamond** and **Inter** are self-hosted WOFF2 files in `assets/fonts/`.
- Each 3D scene is created the first time it is opened, and it is not drawn while another scene is showing.
- The WebGL canvas is sized from its layout box at the display’s pixel ratio, up through 2, on load, after fonts, on each scene change, and whenever the canvas or the pixel ratio changes. A 1920×1080 screen at a higher ratio steps down so the buffer stays near that size.

## Browser

The wheel, the folder, and the gallery need JavaScript, ES modules, import maps, and WebGL. A current Chrome, Edge, Firefox, or Safari is enough. Video in the folder needs a browser that can play a muted mp4.

## Credits and licences

- **three.js r169** — Copyright © 2010–2024 three.js authors. [MIT License](js/vendor/LICENSE-three.txt).
- **meshoptimizer** — Copyright © 2016–2026 Arseny Kapoulkine. [MIT License](js/vendor/LICENSE-meshoptimizer.txt). The decoder is `js/vendor/meshopt_decoder.mjs`.
- **Inter** (weights 400, 500, and 800) — Copyright 2016 The Inter Project Authors. [SIL Open Font License 1.1](assets/fonts/LICENSE-Inter.txt).
- **Cormorant Garamond** (weight 500, roman and italic) — Copyright 2015 The Cormorant Project Authors. [SIL Open Font License 1.1](assets/fonts/LICENSE-Cormorant.txt).
- **Noto Naskh Arabic** — Copyright 2010, 2012–2020 Google Inc. and Google LLC. [SIL Open Font License 1.1](assets/fonts/LICENSE-NotoNaskh.txt). It draws the Arabic in the Layers title.
- Project images and the words in `js/projects.js` are Alhanouf Khalid Alaswad’s, from [her portfolio](https://alhanoufalaswad.myportfolio.com).

## Deploy

GitHub Pages should use **Deploy from a branch**, branch `main`, folder `/ (root)`. A `.nojekyll` file is in the root so Jekyll does not rewrite the site. The Actions workflow was removed; it could not turn Pages on, and it failed on every push.
