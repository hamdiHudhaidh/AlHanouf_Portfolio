# Alhanouf Khalid

Portfolio for Alhanouf Khalid Alaswad, a visual artist and graphic designer. The line on the About scene is hers: “Hi, I'm Alhanouf a visual artist and graphic designer.”

The page has four scenes: About, Ceramics, Design, and Art. About is a still editorial layout. Design is a ring binder. Ceramics is a potter’s wheel. Art is a gallery wall. Her published site has graphic-design projects only. Ceramics and Art currently hold clearly marked sample pieces so those scenes can be tried. They are not her work. Delete the SAMPLE block in `js/projects.js` to empty the scenes, or replace that block with her pieces.

**This site:** https://hamdihudhaidh.github.io/AlHanouf_Portfolio/

**Original portfolio:** https://alhanoufalaswad.myportfolio.com

## Scenes

| Scene | Hash | What you see |
| --- | --- | --- |
| About | `#about` | Placeholder portrait, her welcome line, LinkedIn and WhatsApp |
| Ceramics | `#ceramics` | The wheel. Three sample vessels are thrown in clay. After the wheel stops, the clay fades into the project photo |
| Design | `#design` | A coloured ring binder on the same bone ground as the other scenes. 00 is the cover. Projects are grouped by category, and the first of each group has a divider tab |
| Art | `#art` | Gallery wall. 00 is the whole room. Three sample paintings in carved wood frames and one sample sculpture, each with a wall label |

`#exhibition` opens Art and the address bar becomes `#art`.

The current page name sits at the top centre. The previous page name sits at the bottom left, and the next page name at the bottom right. Art’s next page is About, and About’s previous page is Art. The counter and arrows stay at the bottom centre. They step through the items of the scene you are in. Arrow keys and a horizontal swipe do the same. Space is a shortcut for the next item.

On the binder, 00 is the closed cover: a paper page, her name, and the word Design, with a metal 3-ring spine on the left. The projects are grouped so that every project of one category sits together. Only the first project of a category has a divider tab, and the tab is labelled with that category. The projects that follow it are plain pages of the same section, with no tab of their own. 01 and onward follow that grouped order. The arrows, the counter, and a click on a tab open the binder in one shot. A tab opens the first project of its category. The page turns around the rings, and the camera eases to the spread. Every page of a category uses that category’s tab colour. The tab labels read left to right in one shared size. A two-word label wraps onto two lines, and the tab only sticks out a short way past the page. The binder sits on the same bone ground as the other scenes. The left page carries the project title and the cover picture. The right page carries her description, when she published one, and the rest of the project: the other stills, film strips, or the site. A category tab stays on the right while any project in that category is open, and moves to the left only after the whole category has been passed. On the cover, every tab is on the right. A phone frames both pages of an open spread. The closed cover stays a single page. A project she published as video plays those clips muted and looped only while that project is open, and shows a poster frame otherwise. The website project shows a scrolling capture of the URL she published, with a Visit site tag that opens that URL in a new tab. The light is soft, and the page has a slight tilt.

Art starts on 00, a zoomed-out view of the whole wall, with air above the frames. 01 and onward glide the camera in one shot to a piece. A press during that glide retargets it. Each painting hangs in a carved wood frame under a warm spotlight, with the picture set into the frame. The label is printed in the room, not on a card: the artist, then place and life years only when those were given, then the italic title with the year, then the medium, then a short description. Any of those lines is left off when the piece has no data for it. On a wide screen the painting’s label sits beside the work. On a tall screen it sits below the painting. The sculpture’s label sits beside the plinth, clear of the form.

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

**Design.** Each object in `DESIGN` is one project in the binder. `category` is a word copied from that project’s title or text. Projects that share a category are shown together, and only the first of them grows a divider tab labelled with that word. The first still is the cover picture on the left page of that project. `title`, `text`, and `year` are copied from her site; leave `text` or `year` out when she did not publish them. The title is set on the left page. `text` and `year` are set on the right page, and nowhere else. `images` is a list of stills under `assets/projects/<slug>/`. When `items` is set, those follow the cover on the right page: an `image` is another still, a `video` is a local mp4 with a poster frame (muted, looping, playing only while that project is open), and a `website` is a tall page. The website capture is a screenshot of the URL she published (`links`), saved as `assets/projects/website-design/page.webp`. The Visit site tag uses that same URL. `source` is the project page on the original portfolio.

**Ceramics.** The array already holds three sample vessels (bottle, bowl, tall vase) so the wheel can be tested. Replace them with her pieces, or set `CERAMICS` to `[]` to clear the samples. Each object looks like:

```js
{ title: '', text: '', year: '', images: ['assets/projects/example/01.webp'], shape: 2 }
```

`shape` picks the clay: `0` the word hello, `2` a bottle, `3` an open bowl, `4` a tall vase. Use the closest profile to the piece. Only include year or text when you have them. While the wheel is throwing, and until it has completely stopped, the piece stays clay. After it stops, the clay fades into the first image over about a second. A piece with no image stays clay.

**Art.** The `EXHIBITION` array holds three sample paintings and one sample sculpture. Replace them with her pieces, or set `EXHIBITION` to `[]` to clear the samples. Each object looks like:

```js
{ kind: 'painting', title: '', image: 'assets/projects/example/01.webp', artist: '', year: '', medium: '', dimensions: '', description: '' }
```

`kind` is `painting` (on the wall, in a wood frame) or `sculpture` (on a plinth). A sculpture with no `image` is drawn as a simple generated form. Omit any field she did not give. The wall label prints only the fields that are present. `place` and `life` are optional and are not invented.

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

The wheel, the binder, and the gallery need JavaScript, ES modules, import maps, and WebGL. A current Chrome, Edge, Firefox, or Safari is enough. Video in the binder needs a browser that can play a muted mp4.

## Credits and licences

- **three.js r169** — Copyright © 2010–2024 three.js authors. [MIT License](js/vendor/LICENSE-three.txt).
- **Inter** (weights 400, 500, and 800) — Copyright 2016 The Inter Project Authors. [SIL Open Font License 1.1](assets/fonts/LICENSE-Inter.txt).
- **Cormorant Garamond** (weight 500, roman and italic) — Copyright 2015 The Cormorant Project Authors. [SIL Open Font License 1.1](assets/fonts/LICENSE-Cormorant.txt).
- Project images and the words in `js/projects.js` are Alhanouf Khalid Alaswad’s, from [her portfolio](https://alhanoufalaswad.myportfolio.com).

## Deploy

GitHub Pages should use **Deploy from a branch**, branch `main`, folder `/ (root)`. A `.nojekyll` file is in the root so Jekyll does not rewrite the site. The Actions workflow was removed; it could not turn Pages on, and it failed on every push.
