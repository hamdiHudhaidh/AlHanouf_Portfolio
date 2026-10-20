// All editable copy for the site.
// Text is taken from https://alhanoufalaswad.myportfolio.com — do not add facts that are not on that site.
// If a year, role, or medium was not published, leave it out.
//
// CERAMICS items: { title, text?, year?, images: [path], shape }
//   shape 0 = the word hello, 2 = bottle, 3 = open bowl, 4 = tall vase. Use the closest lathe profile.
// EXHIBITION items: { kind: 'painting' | 'sculpture', title, image?, artist?, year?, medium?, dimensions?, description? }
// DESIGN items: { slug, title, text?, year?, images: [path], items?, source, links?: [{label, href}] }
//   items hang on the drying line when a project is not only stills:
//   { kind: 'image' | 'video' | 'website', src, poster?, href? }
//   video files are local copies of the clips on her project page. poster is a frame from that clip.
//   a website src is a capture of the URL she published, hung as a scrolling page.

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

// ---------------------------------------------------------------------------
// SAMPLE PIECES — not Alhanouf's work.
// Her site publishes no ceramics, paintings, or sculptures, so these stand-ins
// let both scenes be tried. Every title carries "Sample". Every label says
// "Sample piece — replace with AlHanouf's work".
//
// To remove them: delete this whole SAMPLE block and set
//   export const CERAMICS = [];
//   export const EXHIBITION = [];
// To replace them: delete the block and put her real pieces in those arrays.
// Do not leave a sample in the list next to a real piece, and do not name her
// as the artist of a sample.
// ---------------------------------------------------------------------------
const SAMPLE = "Sample piece — replace with AlHanouf's work";

export const CERAMICS = [
  {
    title: 'Sample bottle',
    eyebrow: 'Sample',
    text: SAMPLE,
    images: ['assets/samples/vessel-bottle.webp'],
    shape: 2,
  },
  {
    title: 'Sample bowl',
    eyebrow: 'Sample',
    text: SAMPLE,
    images: ['assets/samples/vessel-bowl.webp'],
    shape: 3,
  },
  {
    title: 'Sample tall vase',
    eyebrow: 'Sample',
    text: SAMPLE,
    images: ['assets/samples/vessel-vase.webp'],
    shape: 4,
  },
];

export const EXHIBITION = [
  {
    kind: 'painting',
    title: 'Sample field',
    image: 'assets/samples/painting-field.webp',
    artist: 'Sample',
    description: SAMPLE,
  },
  {
    kind: 'painting',
    title: 'Sample arc',
    image: 'assets/samples/painting-arc.webp',
    artist: 'Sample',
    description: SAMPLE,
  },
  {
    kind: 'painting',
    title: 'Sample grain',
    image: 'assets/samples/painting-grain.webp',
    artist: 'Sample',
    description: SAMPLE,
  },
  {
    kind: 'sculpture',
    title: 'Sample form',
    artist: 'Sample',
    description: SAMPLE,
  },
];

const src = (slug) => `https://alhanoufalaswad.myportfolio.com/${slug}`;
const pics = (slug, n) => Array.from({ length: n }, (_, i) => `assets/projects/${slug}/${String(i + 1).padStart(2, '0')}.webp`);

export const DESIGN = [
  {
    slug: 'peak-identity',
    title: 'peak identity',
    year: '2024',
    text: 'creating identity for an events management company .',
    images: pics('peak-identity', 6),
    source: src('peak-identity'),
  },
  {
    slug: 'parkit-idintity',
    title: 'parkit idintity',
    year: '2024',
    images: pics('parkit-idintity', 7),
    source: src('parkit-idintity'),
  },
  {
    slug: 'brand-idintity',
    title: 'brand idintity',
    year: '2024',
    text: 'branding for Jwana skin care',
    images: pics('brand-idintity', 1),
    source: src('brand-idintity'),
  },
  {
    slug: 'profile-design',
    title: 'profile design',
    year: '2024',
    text: 'profile Peak-events operation management company',
    images: pics('profile-design', 1),
    source: src('profile-design'),
  },
  {
    slug: 'video-editing',
    title: 'video editing',
    year: '2024',
    images: pics('video-editing', 1),
    items: [1, 2, 3, 4].map((n) => ({
      kind: 'video',
      src: `assets/projects/video-editing/v${n}.mp4`,
      poster: `assets/projects/video-editing/v${n}.webp`,
    })),
    source: src('video-editing'),
  },
  {
    slug: 'cube-design',
    title: 'cube design',
    year: '2024',
    images: pics('cube-design', 3),
    source: src('cube-design'),
  },
  {
    slug: 'playing-card-design',
    title: 'playing card design',
    year: '2024',
    images: pics('playing-card-design', 3),
    source: src('playing-card-design'),
  },
  {
    slug: 'social-media-posts',
    title: 'Other Designs',
    year: '2024',
    images: pics('social-media-posts', 3),
    items: [
      ...pics('social-media-posts', 3).map((path) => ({ kind: 'image', src: path })),
      {
        kind: 'video',
        src: 'assets/projects/social-media-posts/v1.mp4',
        poster: 'assets/projects/social-media-posts/v1.webp',
      },
    ],
    source: src('social-media-posts'),
  },
  {
    slug: 'website-design',
    title: 'website design',
    year: '2024',
    text: 'website for peak company',
    images: pics('website-design', 1),
    items: [
      {
        kind: 'website',
        src: 'assets/projects/website-design/page.webp',
        href: 'http://peak.sa.com/index-ar.html',
      },
      {
        kind: 'video',
        src: 'assets/projects/website-design/v1.mp4',
        poster: 'assets/projects/website-design/v1.webp',
      },
    ],
    source: src('website-design'),
    links: [{ label: 'http://peak.sa.com/index-ar.html', href: 'http://peak.sa.com/index-ar.html' }],
  },
  {
    slug: 'vest-design',
    title: 'vest design',
    year: '2024',
    images: pics('vest-design', 6),
    source: src('vest-design'),
  },
];

export const SCENES = [
  { id: 'about', hash: '#about', label: 'About' },
  { id: 'ceramics', hash: '#ceramics', label: 'Ceramics' },
  { id: 'design', hash: '#design', label: 'Design' },
  { id: 'art', hash: '#art', label: 'Art' },
];
