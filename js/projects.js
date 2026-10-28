// All editable copy for the site.
// Published lines come from https://alhanoufalaswad.myportfolio.com.
// Newer lines come only from text printed on her files.
// If a year, role, or medium was not published, leave it out.
//
// CERAMICS items: { title, text?, year?, model?, height?, color?, metalness?, roughness? }
//   model is a local OBJ. The wheel throws that model's own silhouette in clay,
//   then the finished colour fades in after the wheel has fully stopped.
// EXHIBITION items: { kind: 'painting' | 'sculpture', model?: 'tower' | 'pendant', title, image?, artist?, year?, medium?, dimensions?, description? }
//   An image hangs in the wood frame. model is unused while an image is set,
//   and stays so a later scan can replace the photograph.
// DESIGN is two folder projects, Peak Identity and MEQAF Identity.
//   Each has two spreads. Copy is the text printed on Hamdi's template spreads.
//   swatches use the names printed on those spreads. slots are filled from the
//   spread files so the loader can prefetch posters and stills.

export const ARTIST = {
  mark: 'Alhanouf Khalid',
  name: 'Alhanouf Khalid Alaswad',
  welcome: "Hi, I'm Alhanouf a visual artist and graphic designer",
  portrait: 'assets/img/portrait.svg',
  portraitNote: 'Portrait placeholder — replace assets/img/portrait.svg',
  source: 'https://alhanoufalaswad.myportfolio.com',
  links: [
    { label: 'LinkedIn', href: 'http://www.linkedin.com/in/alhanouf-a-b86a332a6' },
    { label: 'WhatsApp', href: 'https://wa.me/966537411985' },
  ],
};

const src = (slug) => `https://alhanoufalaswad.myportfolio.com/${slug}`;
const img = (path) => ({ kind: 'image', src: path });
const vid = (path, poster) => ({ kind: 'video', src: path, poster });

const peak = 'assets/hanouf/design/peak identity';
const meqaf = 'assets/hanouf/design/meqaf identity/idintity';

export const CERAMICS = [
  {
    title: 'Untitled',
    model: 'assets/hanouf/pottery/MODLE 5.1.obj',
    height: 2.45,
  },
  {
    title: 'Untitled',
    model: 'assets/hanouf/pottery/alhanouf1.obj',
    height: 1.85,
    color: '#2c2c2c',
    metalness: 0.5,
    roughness: 0.5,
  },
];

export const EXHIBITION = [
  {
    kind: 'painting',
    title: 'Untitled',
    image: 'assets/hanouf/art/painting/IMG_9926.jpg',
    artist: ARTIST.name,
  },
  {
    kind: 'painting',
    title: 'Untitled',
    image: 'assets/hanouf/art/painting/IMG_9928.jpg',
    artist: ARTIST.name,
  },
  {
    kind: 'sculpture',
    model: 'tower',
    title: 'Untitled',
    image: 'assets/hanouf/art/sculpture/tower.jpg',
    artist: ARTIST.name,
  },
  {
    kind: 'sculpture',
    model: 'pendant',
    title: 'Untitled',
    image: 'assets/hanouf/art/necklace jewelry/IMG_3956.jpg',
    artist: ARTIST.name,
  },
];

export const DESIGN = [
  {
    slug: 'peak-identity',
    title: 'Peak',
    year: '2024',
    source: src('peak-identity'),
    spreads: [
      {
        left: 'assets/hanouf/design/pages/peak-1-left.jpg',
        right: 'assets/hanouf/design/pages/peak-1-right.jpg',
      },
      {
        left: 'assets/hanouf/design/pages/peak-2-left.jpg',
        right: 'assets/hanouf/design/pages/peak-2-right.jpg',
        screens: [
          {
            side: 'left',
            src: `${peak}/website/website.mp4`,
            rect: { x: 0.248, y: 0.530, w: 0.372, h: 0.275 },
          },
          {
            side: 'right',
            src: `${peak}/videos/'24 part 1 No.1.mp4`,
            rect: { x: 0.131, y: 0.127, w: 0.220, h: 0.261 },
          },
          {
            side: 'right',
            src: `${peak}/videos/saudi national day 2.mp4`,
            rect: { x: 0.531, y: 0.127, w: 0.220, h: 0.261 },
          },
        ],
      },
    ],
  },
  {
    slug: 'meqaf-identity',
    title: 'MEQAF',
    year: '2026',
    spreads: [
      {
        left: 'assets/hanouf/design/pages/meqaf-1-left.jpg',
        right: 'assets/hanouf/design/pages/meqaf-1-right.jpg',
      },
      {
        left: 'assets/hanouf/design/pages/meqaf-2-left.jpg',
        right: 'assets/hanouf/design/pages/meqaf-2-right.jpg',
      },
    ],
  },
];

function attachSlots(project) {
  const slots = [];
  const seen = new Set();
  const add = (item) => {
    const key = `${item.kind}:${item.src}`;
    if (seen.has(key)) return;
    seen.add(key);
    slots.push(item);
  };
  (project.spreads || []).forEach((spread) => {
    if (spread.left) add(img(spread.left));
    if (spread.right) add(img(spread.right));
    (spread.screens || []).forEach((screen) => {
      add(vid(screen.src, screen.side === 'left' ? spread.left : spread.right));
    });
  });
  project.slots = slots;
}

DESIGN.forEach(attachSlots);

export const SCENES = [
  { id: 'about', hash: '#about', label: 'About' },
  { id: 'ceramics', hash: '#ceramics', label: 'Ceramics' },
  { id: 'design', hash: '#design', label: 'Design' },
  { id: 'art', hash: '#art', label: 'Art' },
];
