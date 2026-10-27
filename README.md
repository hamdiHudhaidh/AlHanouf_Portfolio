# Alhanouf Khalid

Portfolio for Alhanouf Khalid Alaswad, a visual artist and graphic designer. The line on the About scene is hers: “Hi, I'm Alhanouf a visual artist and graphic designer.”

The page has four scenes: About, Ceramics, Design, and Art. About is a still editorial layout. Design is a ring binder. Ceramics is a potter’s wheel. Art is a gallery wall. Design uses her published projects plus the work in `assets/hanouf/`. Ceramics shows her two pottery models. Art shows four photographs in wood frames: two prints, the block tower, and the silver pendant. A line is printed only when it comes from her site or from text on the work itself.

**This site:** https://hamdihudhaidh.github.io/AlHanouf_Portfolio/

**Original portfolio:** https://alhanoufalaswad.myportfolio.com

## Scenes

| Scene | Hash | What you see |
| --- | --- | --- |
| About | `#about` | Placeholder portrait, her welcome line, LinkedIn and WhatsApp |
| Ceramics | `#ceramics` | The wheel. Two of her models, thrown large. The spinning clay is that model’s own silhouette. After the wheel has fully stopped, the finished colour fades in. Two clay textures sit beside the wheel |
| Design | `#design` | A ring binder on the same bone ground as the other scenes. 00 is the cover. Projects are grouped by category, and the first of each group has a divider tab. Every page is the cover white. Only the tab is coloured |
| Art | `#art` | Gallery wall. 00 is the whole room. Four photographs in wood frames: two prints, the block tower, and the silver pendant, each with a wall label |

`#exhibition` opens Art and the address bar becomes `#art`.

The current page name sits at the top centre. The previous page name sits at the bottom left, and the next page name at the bottom right. Art’s next page is About, and About’s previous page is Art. The counter and arrows stay at the bottom centre. They step through the items of the scene you are in. Arrow keys and a horizontal swipe do the same. Space is a shortcut for the next item.

On the binder, 00 is the closed cover: a paper page, her name, and the word Design, with a metal 3-ring spine on the left. The projects are grouped so that every project of one category sits together. Only the first project of a category has a divider tab, and the tab is labelled with that category. The projects that follow it are plain pages of the same section, with no tab of their own. 01 and onward follow that grouped order. The arrows, the counter, and a click on a tab open the binder in one shot. A tab opens the first project of its category. The page turns around the rings, and the camera eases to the spread. The divider tab uses that category’s colour. The tab labels read left to right in one shared size. A two-word label wraps onto two lines, and the tab only sticks out a short way past the page. The binder sits on the same bone ground as the other scenes. Every page, including the projects, uses the same white as the cover. Only the index tab is coloured, and the type on that spread uses the tab’s colour. Each project fills both pages with its own images, videos and text. A project with two pictures uses one large picture on each page. A video keeps its own aspect ratio. Swatches are drawn only where she printed colours. A spaced-caps running header and a thin rule sit at the top and bottom of each page. A project she published as video plays those clips muted and looped only while that project is open, and shows a poster frame otherwise. The website project keeps a Visit site tag that opens the URL she published. A category tab stays on the right while any project in that category is open, and moves to the left only after the whole category has been passed. On the cover, every tab is on the right. A phone frames both pages of an open spread. The closed cover stays a single page. The light is soft, and the page has a slight tilt.

Art starts on 00, a zoomed-out view of the whole wall, with air above the frames. 01 and onward glide the camera in one shot to a piece. A press during that glide retargets it. Each photograph hangs in a carved wood frame under a warm spotlight, with the picture set into the frame. The tower frame is tall, matching that photograph. The other three use the print frame. The label is printed in the room, not on a card: the artist, then place and life years only when those were given, then the italic title with the year, then the medium, then a short description. Any of those lines is left off when the piece has no data for it. On a wide screen the label sits beside the work. On a tall screen it sits below the frame.

About has a single view, so the arrows stay hidden. They also stay hidden on Ceramics or Art if that list is emptied.

If the browser asks for reduced motion, the binder cuts to the chosen project instead of turning the page, the camera cuts, and the website page does not scroll. The gallery cuts instead of gliding, the wheel cuts, and the grain overlay holds still.

## Folder structure

```
index.html
css/style.css
js/main.js            scenes, hash routing, arrows
js/ceramics.js        potter’s wheel
js/design.js          ring binder, page turns, index tabs
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

**Design.** Each object in `DESIGN` is one project in the binder. `category` is a word copied from that project’s title or text. Projects that share a category are shown together, and only the first of them grows a divider tab labelled with that word. `slots` are that project’s images and videos, in reading order. The spread lays them out to fill both pages. A `video` is a local mp4 with a poster frame, drawn at its own aspect ratio. A `website` slot is the capture of the URL she published. `swatches` are printed colours, with a name only when the work prints one. `title`, `text`, and `year` are copied from her site or from text on the piece. Leave them out when she did not publish them.

**Ceramics.** Each object is one piece on the wheel. `model` is an OBJ. The throw morphs the previous piece’s silhouette into this one, in clay. After the wheel has completely stopped, the finished colour, metalness and roughness fade in. Two CC0 clay textures (terracotta and grey stoneware) are on each piece; the pair of dots beside the wheel switches them. The two pieces have no published title, so the label is Untitled.

**Art.** Each object looks like:

```js
{ kind: 'painting', title: '', image: 'assets/projects/example/01.webp', artist: '', year: '', medium: '', dimensions: '', description: '' }
```

`kind` is `painting` or `sculpture`. Either one hangs in a wood frame when `image` is set. The tower photograph is a crop of her studio screenshot with the phone chrome removed, and it uses a taller frame so the stack is not stretched. The pendant photograph uses the same frame as the prints. `model` `tower` and `pendant` are kept so a later 3D scan can replace the photograph; the builders are not placed in the room while an image is set. Omit any field she did not give. The wall label prints only the fields that are present. `place` and `life` are optional and are not invented.

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

The wheel, the binder, and the gallery need JavaScript, ES modules, import maps, and WebGL. A current Chrome, Edge, Firefox, or Safari is enough. Video in the binder needs a browser that can play a muted mp4.

## Credits and licences

- **three.js r169** — Copyright © 2010–2024 three.js authors. [MIT License](js/vendor/LICENSE-three.txt).
- **meshoptimizer** — Copyright © 2016–2026 Arseny Kapoulkine. [MIT License](js/vendor/LICENSE-meshoptimizer.txt). The decoder is `js/vendor/meshopt_decoder.mjs`.
- **Inter** (weights 400, 500, and 800) — Copyright 2016 The Inter Project Authors. [SIL Open Font License 1.1](assets/fonts/LICENSE-Inter.txt).
- **Cormorant Garamond** (weight 500, roman and italic) — Copyright 2015 The Cormorant Project Authors. [SIL Open Font License 1.1](assets/fonts/LICENSE-Cormorant.txt).
- Project images and the words in `js/projects.js` are Alhanouf Khalid Alaswad’s, from [her portfolio](https://alhanoufalaswad.myportfolio.com).

## Deploy

GitHub Pages should use **Deploy from a branch**, branch `main`, folder `/ (root)`. A `.nojekyll` file is in the root so Jekyll does not rewrite the site. The Actions workflow was removed; it could not turn Pages on, and it failed on every push.
