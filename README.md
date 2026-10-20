# Alhanouf Khalid

Portfolio for Alhanouf Khalid Alaswad, a visual artist and graphic designer. The line on the About scene is hers: “Hi, I'm Alhanouf a visual artist and graphic designer.”

The page has four scenes: About, Ceramics, Design, and Art. About is a still editorial layout. Design is one off-white wall with twine lines. Ceramics is a potter’s wheel. Art is a gallery wall. Her published site has graphic-design projects only. Ceramics and Art currently hold clearly marked sample pieces so those scenes can be tried. They are not her work. Delete the SAMPLE block in `js/projects.js` to empty the scenes, or replace that block with her pieces.

**This site:** https://hamdihudhaidh.github.io/AlHanouf_Portfolio/

**Original portfolio:** https://alhanoufalaswad.myportfolio.com

## Scenes

| Scene | Hash | What you see |
| --- | --- | --- |
| About | `#about` | Placeholder portrait, her welcome line, LinkedIn and WhatsApp |
| Ceramics | `#ceramics` | The wheel. Three sample vessels spin, morph, and open with a splatter |
| Design | `#design` | One off-white wall. 00 is the covers; each later number zooms into one project |
| Art | `#art` | Gallery wall. 00 is the whole room. Three sample paintings and one sample sculpture, each with a museum label in the room |

`#exhibition` opens Art and the address bar becomes `#art`.

The current page name sits at the top left. The previous page name sits at the bottom left, and the next page name at the bottom right. Art’s next page is About, and About’s previous page is Art. The counter and arrows stay at the bottom centre. They step through the items of the scene you are in. Arrow keys and a horizontal swipe do the same. Space is a shortcut for the next item.

On the drying line, 00 is the whole wall of covers, seen from a little further back and slightly to one side. Two jute strings run across a matte plaster wall, each with a gentle sag, a knot, and a metal screw-eye at either end. Five projects share a row, hung close together. Each hangs one cover from a wooden clothes peg on a short length of twine, and the drops differ, so the row is irregular. Behind each cover, one jute line of the same thickness carries the rest of that project, pegged side by side: the other stills, film strips, the site page, and a tracing-paper tag. At 00 that line sits close behind its cover, small enough that the cover hides it. 01 and onward are her projects, in the order they appear in `DESIGN`. The camera moves closer. The back line eases forward and larger into the open side of the frame, and the cover stays whole on the other side with a gap between them. The cover and those pieces turn to face the camera, then ease back and turn away when the view leaves them. Moving from one project to the next fades the pieces out and in while they turn. Once the camera arrives, the frame holds only that project. 00 brings the whole wall back. A press during the move retargets it from the current pose. Her year, title, description, and any URL she published are on the tracing-paper tag. Stills are mixed prints: a white-bordered photo, a curled sheet, a small burnt-edge print, a cyanotype card, a kraft folder, or a collage of several of her photos. A project she published as video hangs its extra clips as film strips: they play muted and looped only while that project is in frame, and show a poster frame otherwise. The website project hangs as a tall paper page, a scrolling capture of the URL she published, with a Visit site slip that opens that URL in a new tab. Warm daylight comes through a window from the left, laying a soft pane pattern and contact shadows across the plaster.

Art starts on 00, a zoomed-out view of the whole wall, with air above the frames. 01 and onward glide the camera in one shot to a piece. A press during that glide retargets it. The description is a museum label in the 3D room: beside the piece on a wide screen, and below it on a tall one.

About has a single view, so the arrows stay hidden. They also stay hidden on Ceramics or Art if that list is emptied.

If the browser asks for reduced motion, the drying line cuts to the chosen project instead of orbiting, the sheets do not swing, the back line snaps into its closer size, the cover and the pieces behind it snap to face the camera, the fade is instant, and the website page does not scroll. The gallery cuts instead of gliding, the wheel cuts, and the grain overlay holds still.

## Folder structure

```
index.html
css/style.css
js/main.js            scenes, hash routing, arrows
js/ceramics.js        potter’s wheel
js/design.js          print studio, drying lines, paper tags
js/exhibition.js      Art gallery, camera glide, museum labels
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

**About.** `ARTIST` holds her name, the welcome line, the portrait path, and the links. The page shows LinkedIn and WhatsApp only. The portrait on the site is a placeholder drawing. Replace `assets/img/portrait.svg` with a photograph and update `portrait` and `portraitNote`. There is no portrait on the original portfolio.

**Design.** Each object in `DESIGN` is one project on the wall. The first still is the cover on the front string. `title`, `text`, and `year` are copied from her site; leave `text` or `year` out when she did not publish them. They are drawn on the tracing-paper tag behind that cover, and nowhere else. `images` is a list of stills under `assets/projects/<slug>/`. When `items` is set, those hang on that project's back line, after the cover: an `image` is a print with a white border, a `video` is a local mp4 with a poster frame (muted, looping, playing only while that project is selected), and a `website` is a tall page. The website capture is a screenshot of the URL she published (`links`), saved as `assets/projects/website-design/page.webp`. The Visit site tag uses that same URL. `source` is the project page on the original portfolio.

**Ceramics.** The array already holds three sample vessels (bottle, bowl, tall vase) so the wheel can be tested. Replace them with her pieces, or set `CERAMICS` to `[]` to clear the samples. Each object looks like:

```js
{ title: '', text: '', year: '', images: ['assets/projects/example/01.webp'], shape: 2 }
```

`shape` picks the clay: `0` the word hello, `2` a bottle, `3` an open bowl, `4` a tall vase. Use the closest profile to the piece. Only include year or text when you have them. The photos open through the splatter after the wheel turns.

**Art.** The `EXHIBITION` array holds three sample paintings and one sample sculpture. Replace them with her pieces, or set `EXHIBITION` to `[]` to clear the samples. Each object looks like:

```js
{ kind: 'painting', title: '', image: 'assets/projects/example/01.webp', artist: '', year: '', medium: '', dimensions: '', description: '' }
```

`kind` is `painting` (on the wall) or `sculpture` (on a plinth). A sculpture with no `image` is drawn as a simple generated form. Omit any field she did not give. The museum label in the room prints only the fields that are present.

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

The wheel, the print studio, and the gallery need JavaScript, ES modules, import maps, and WebGL. A current Chrome, Edge, Firefox, or Safari is enough. Video on the drying line needs a browser that can play a muted mp4.

## Credits and licences

- **three.js r169** — Copyright © 2010–2024 three.js authors. [MIT License](js/vendor/LICENSE-three.txt).
- **Inter** (weights 400, 500, and 800) — Copyright 2016 The Inter Project Authors. [SIL Open Font License 1.1](assets/fonts/LICENSE-Inter.txt).
- **Cormorant Garamond** (weight 500, roman and italic) — Copyright 2015 The Cormorant Project Authors. [SIL Open Font License 1.1](assets/fonts/LICENSE-Cormorant.txt).
- Project images and the words in `js/projects.js` are Alhanouf Khalid Alaswad’s, from [her portfolio](https://alhanoufalaswad.myportfolio.com).

## Deploy

GitHub Pages should use **Deploy from a branch**, branch `main`, folder `/ (root)`. A `.nojekyll` file is in the root so Jekyll does not rewrite the site. The Actions workflow was removed; it could not turn Pages on, and it failed on every push.
