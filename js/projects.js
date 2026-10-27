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
    tab: 'Peak Identity',
    tabColor: '#E0612A',
    peekRight: { label: 'MEQAF Identity', color: '#9D0F28', opens: 'MEQAF' },
    year: '2024',
    source: src('peak-identity'),
    spreads: [
      {
        left: {
          kind: 'copy',
          title: 'Peak',
          kicker: 'Brand Identity',
          year: '2024',
          lead: 'Peak Events Operation Management',
          body: [
            'The visual identity is built around an arrow icon that points to the top, symbolizing the ultimate goal of reaching the highest point. The system combines strength and simple creativity through a direct and meaningful design language.',
            'The color palette carries clear intentions: orange represents creativity, black embodies strength, and white stands for honesty. These core colors are softly supported by yellow, green, and blue, which bring elements of opportunity, safety, and trust to the complete identity system.',
          ],
        },
        right: {
          kind: 'peak-1',
          board: `${peak}/identity/peake mockup.jpg`,
          saxon: `${peak}/posts and designs/Saxon .jpg`,
          cardLeft: `${peak}/posts and designs/card-left.jpg`,
          cardRight: `${peak}/posts and designs/card-right.jpg`,
          yearPost: `${peak}/posts and designs/بوست اكمال سنة للموظفين.jpg`,
          staff: `${peak}/posts and designs/22بطاقات الموظفين.png`,
        },
      },
      {
        left: {
          kind: 'peak-2-left',
          title: 'Peak',
          kicker: 'Brand Identity',
          year: '2024',
          badges: `${peak}/identity/75d44dde-a65d-4a51-9430-09600184421b_rw_3840.png`,
          folder: `${peak}/identity/b9d6ccf2-92ac-4211-bf6e-fd5ffefdbbde_rw_1920.jpg`,
          laptop: `${peak}/website/website mockup template.png`,
          video: { src: `${peak}/website/website.mp4`, poster: `${peak}/website/website mockup template.png` },
          swatches: [
            { name: 'Creativity', hex: '#DC6529' },
            { name: 'Strength', hex: '#000000' },
            { name: 'Honesty', hex: '#FFFFFF' },
            { name: 'Stability', hex: '#9EC77D' },
            { name: 'Trust', hex: '#89B3D5' },
            { name: 'Opportunity', hex: '#F2BA47' },
          ],
        },
        right: {
          kind: 'peak-2-right',
          ipadLeft: `${peak}/videos/'24 part 1 No.1.png`,
          videoLeft: { src: `${peak}/videos/'24 part 1 No.1.mp4`, poster: `${peak}/videos/'24 part 1 No.1.png` },
          ipadRight: `${peak}/videos/saudi national day 2.png`,
          videoRight: { src: `${peak}/videos/saudi national day 2.mp4`, poster: `${peak}/videos/saudi national day 2.png` },
          profile: `${peak}/company profile/profile peak mockup.jpg`,
        },
      },
    ],
  },
  {
    slug: 'meqaf-identity',
    title: 'MEQAF',
    tab: 'MEQAF Identity',
    tabColor: '#9D0F28',
    peekBelow: { color: '#E0612A', opens: 'Peak' },
    year: '2026',
    spreads: [
      {
        left: {
          kind: 'copy',
          title: 'MEQAF',
          kicker: 'Brand Identity',
          year: '2026',
          body: [
            '«MEQAF» is a Saudi brand founded by a female creator to turn favorite memories into beautiful keepsakes, starting with custom magnetic frames. The visual identity reflects the founder\'s warm and lively personality, making the brand feel friendly, accessible, and full of joy.',
            'The main design goal was to combine a sense of nostalgia with a fresh, modern energy. The solution features a playful, square-faced character with changing expressions that bring packaging, labels, and sticker sheets to life. Paired with a warm yellow and deep burgundy color palette, the identity creates a memorable unboxing experience that makes saving special moments feel like a celebration.',
          ],
        },
        right: {
          kind: 'meqaf-1',
          paper: `${meqaf}/red-paper-texture.jpg`,
          sticker: `${meqaf}/Square_Sticker_Mockup_1.jpg`,
          boxOpen: `${meqaf}/Box_Mockup_1.jpg`,
          boxClosed: `${meqaf}/Box_Mockup_2.jpg`,
          logo: `${meqaf}/logo-yellow.jpg`,
          magnet: `${meqaf}/Fridge_Magnet_Mockup_1.jpg`,
          swatches: [
            { name: 'Ruby Red', hex: '#9D0F28' },
            { name: 'Yellow', hex: '#DBA02B' },
            { name: 'Blue', hex: '#6997A4' },
            { name: 'Cream', hex: '#FBE4CE' },
          ],
        },
      },
      {
        left: {
          kind: 'meqaf-2-left',
          title: 'MEQAF',
          kicker: 'Brand Identity',
          year: '2026',
          post: `${meqaf}/meqaf posts-01.jpg`,
          patternRed: `${meqaf}/pattren-04.png`,
          patternCream: `${meqaf}/pattren-03.png`,
          magnets: `${meqaf}/meqaf posts-03.jpg`,
        },
        right: {
          kind: 'meqaf-2-right',
          card: `${meqaf}/Free_Square_Business_Card_Mockup_2.jpg`,
          flyer: `${meqaf}/Free_Tabloid_Falyer_Mockup_2.jpg`,
          logo: `${meqaf}/logo-red.jpg`,
          post: `${meqaf}/meqaf posts-01.jpg`,
          sheet: `${meqaf}/sticker_sheet_mockup_v3.jpg`,
        },
      },
    ],
  },
];

function attachSlots(project) {
  const slots = [];
  const seen = new Set();
  const addImage = (path) => {
    if (!path || seen.has(path) || /\.mp4$/i.test(path)) return;
    seen.add(path);
    slots.push(img(path));
  };
  const walk = (value) => {
    if (!value) return;
    if (typeof value === 'string') {
      if (value.startsWith('assets/')) addImage(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (typeof value === 'object') {
      if (typeof value.src === 'string' && /\.mp4$/i.test(value.src)) {
        addImage(value.poster);
        const key = `v:${value.src}`;
        if (!seen.has(key)) {
          seen.add(key);
          slots.push(vid(value.src, value.poster));
        }
      }
      Object.values(value).forEach(walk);
    }
  };
  walk(project.spreads);
  project.slots = slots;
}

DESIGN.forEach(attachSlots);

export const SCENES = [
  { id: 'about', hash: '#about', label: 'About' },
  { id: 'ceramics', hash: '#ceramics', label: 'Ceramics' },
  { id: 'design', hash: '#design', label: 'Design' },
  { id: 'art', hash: '#art', label: 'Art' },
];
