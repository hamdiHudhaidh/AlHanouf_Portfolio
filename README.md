# Alhanouf Khalid

Portfolio for Alhanouf Khalid Alaswad, a visual artist and graphic designer. The line on the About scene is hers: “Hi, I'm Alhanouf a visual artist and graphic designer.”

The page has four scenes. About is a still editorial layout. Graphic Design is a moodboard: every published image from her projects, arranged together on one sheet. Ceramics is a potter’s wheel. Exhibition is a gallery wall. Her published site has graphic-design projects only. Ceramics and Exhibition currently hold clearly marked sample pieces so those scenes can be tried. They are not her work. Delete the SAMPLE block in `js/projects.js` to empty the scenes, or replace that block with her pieces.

**This site:** https://hamdihudhaidh.github.io/AlHanouf_Portfolio/

**Original portfolio:** https://alhanoufalaswad.myportfolio.com

## Scenes

| Scene | Hash | What you see |
| --- | --- | --- |
| About | `#about` | Placeholder portrait, her welcome line, links |
| Ceramics | `#ceramics` | The wheel. Three sample vessels spin, morph, and open with a splatter |
| Graphic Design | `#design` | A moodboard. 00 is the whole sheet; each later number glides to one project |
| Exhibition | `#exhibition` | Gallery wall. Three sample paintings and one sample sculpture, each with a museum label |

The scene links sit at the bottom right: About, Ceramics, Graphic Design, Exhibition. The active one carries a clay dot. On a narrow screen they fold into a button with the current scene’s name.

The counter and arrows sit at the bottom centre. They step through the items of the scene you are in. Arrow keys and a horizontal swipe do the same. Space is a shortcut for the next item. On the moodboard, 00 is the whole sheet. 01 and onward are her projects, in the order they appear in `DESIGN`. The camera glides in one shot from the sheet to the work, and from one work to the next. The move eases through the space. Another press while that glide is still going retargets it from wherever the camera is. Exhibition glides the same way between works. About has a single view, so the arrows stay hidden. They also stay hidden on Ceramics or Exhibition if that list is emptied.

If the browser asks for reduced motion, the moodboard and the gallery cut to the piece instead of gliding, the wheel cuts, and the grain overlay holds still.

## Folder structure

```
index.html
css/style.css
js/main.js            scenes, hash routing, arrows
js/ceramics.js        potter’s wheel
js/design.js          moodboard, leader labels, camera glide
js/exhibition.js      gallery wall and labels
js/clay.js            clay shapes for the wheel
js/projects.js        all editable text and image lists
js/vendor/            three.js r169, vendored
assets/fonts/         Cormorant Garamond and Inter
assets/img/           favicon and the portrait placeholder
assets/projects/      her work, one folder per project
assets/samples/       sample vessels and paintings, not her work
```

Paths are relative, so the site works from a local server or under `/AlHanouf_Portfolio/` on GitHub Pages.

## Edit the content

Everything you would change is in `js/projects.js`.

**About.** `ARTIST` holds her name, the welcome line, the portrait path, and the links. The portrait on the site is a placeholder drawing. Replace `assets/img/portrait.svg` with a photograph and update `portrait` and `portraitNote`. There is no portrait on the original portfolio.

**Graphic design.** Each object in `DESIGN` is one work on the moodboard. Every file in `images` is placed on the sheet. `title`, `text`, and `year` are copied from her site; leave `text` or `year` out when she did not publish them. `images` is a list of paths under `assets/projects/<slug>/`. `source` is the project page on the original portfolio. `links` is optional, used when she published a URL inside the project. The side panel prints only the fields that are present, plus the project’s other photos.

**Ceramics.** The array already holds three sample vessels (bottle, bowl, tall vase) so the wheel can be tested. Replace them with her pieces, or set `CERAMICS` to `[]` to clear the samples. Each object looks like:

```js
{ title: '', text: '', year: '', images: ['assets/projects/example/01.webp'], shape: 2 }
```

`shape` picks the clay: `0` the word hello, `2` a bottle, `3` an open bowl, `4` a tall vase. Use the closest profile to the piece. Only include year or text when you have them. The photos open through the splatter after the wheel turns.

**Exhibition.** The array holds three sample paintings and one sample sculpture. Replace them with her pieces, or set `EXHIBITION` to `[]` to clear the samples. Each object looks like:

```js
{ kind: 'painting', title: '', image: 'assets/projects/example/01.webp', artist: '', year: '', medium: '', dimensions: '', description: '' }
```

`kind` is `painting` (on the wall) or `sculpture` (on a plinth). A sculpture with no `image` is drawn as a simple generated form. Omit any field she did not give. The museum card prints only the fields that are present.

## Run locally

Opening `index.html` with `file://` will not work. The page loads JavaScript as modules, and browsers block that from a file URL.

```bash
python3 -m http.server
```

Then open http://localhost:8000.

## Tech

- **three.js r169**, self-hosted at `js/vendor/three.module.js`, loaded with an import map. No CDN.
- **RoomEnvironment** (`js/vendor/addons/RoomEnvironment.js`) for the lighting.
- The clay in `js/clay.js` is a ray-marched form, so one lump can be reshaped into the next piece.
- **Cormorant Garamond** and **Inter** are self-hosted WOFF2 files in `assets/fonts/`.
- Each 3D scene is created the first time it is opened, and it is not drawn while another scene is showing.
- The WebGL canvas is sized from its layout box at the display’s pixel ratio, up through 2, on load, after fonts, on each scene change, and whenever the canvas or the pixel ratio changes. A 1920×1080 screen at a higher ratio steps down so the buffer stays near that size.

## Browser

The wheel, the moodboard, and the gallery need JavaScript, ES modules, import maps, and WebGL. A current Chrome, Edge, Firefox, or Safari is enough.

## Credits and licences

- **three.js r169** — Copyright © 2010–2024 three.js authors. [MIT License](js/vendor/LICENSE-three.txt).
- **Inter** (weights 400, 500, and 800) — Copyright 2016 The Inter Project Authors. [SIL Open Font License 1.1](assets/fonts/LICENSE-Inter.txt).
- **Cormorant Garamond** (weight 500, roman and italic) — Copyright 2015 The Cormorant Project Authors. [SIL Open Font License 1.1](assets/fonts/LICENSE-Cormorant.txt).
- Project images and the words in `js/projects.js` are Alhanouf Khalid Alaswad’s, from [her portfolio](https://alhanoufalaswad.myportfolio.com).

## Deploy

GitHub Pages should use **Deploy from a branch**, branch `main`, folder `/ (root)`. A `.nojekyll` file is in the root so Jekyll does not rewrite the site. The Actions workflow was removed; it could not turn Pages on, and it failed on every push.
