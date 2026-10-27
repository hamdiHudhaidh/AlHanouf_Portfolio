// All editable copy for the site.
// Published lines come from https://alhanoufalaswad.myportfolio.com.
// Newer lines come only from text printed on her files (the Meqaf binder page,
// the Q-Bix profile, the Tazo menu, and the Himmtk colour specs).
// If a year, role, or medium was not published, leave it out.
//
// CERAMICS items: { title, text?, year?, shape, model?, height?, color?, metalness?, roughness? }
//   shape is the clay thrown on the wheel: 2 bottle, 3 bowl, 4 tall vase.
//   model is a local OBJ shown only after the wheel has fully stopped.
// EXHIBITION items: { kind: 'painting' | 'sculpture', model?: 'tower' | 'pendant', title, image?, artist?, year?, medium?, dimensions?, description? }
// DESIGN items: { slug, title, category, text?, year?, label?, rightTitle?, rightText?, sheet?, swatches?, slots, source, links? }
//   category is a word copied from that project's title or text. It only groups
//   the binder: same category stays together, and only the first page of the
//   group gets a divider tab. Do not invent a word that is not in the project.
//   slots are the ten Meqaf-binder tiles, in order:
//   logo, three across, square, wide, then the four application tiles.
//   { kind: 'image' | 'video' | 'website', src, poster?, href? }
//   sheet is a brand colour printed on the project. Otherwise the page uses its category colour.
//   swatches are { hex, name? } and only include names that are printed.

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
const pics = (slug, n) => Array.from({ length: n }, (_, i) => `assets/projects/${slug}/${String(i + 1).padStart(2, '0')}.webp`);
const img = (path) => ({ kind: 'image', src: path });
const vid = (path, poster) => ({ kind: 'video', src: path, poster });
const site = (path, href) => ({ kind: 'website', src: path, href });

const peakId = 'assets/hanouf/design/peak identity';
const parkitId = 'assets/hanouf/design/parkit identity';
const meqafId = 'assets/hanouf/design/meqaf identity';
const tazoId = 'assets/hanouf/design/tazo burger identity';
const qbixId = 'assets/hanouf/design/Q-Bix identity';
const gameId = 'assets/hanouf/design/game identity design';

export const CERAMICS = [
  {
    title: 'Untitled',
    shape: 4,
    model: 'assets/hanouf/pottery/MODLE 5.1.obj',
    height: 1.32,
  },
  {
    title: 'Untitled',
    shape: 3,
    model: 'assets/hanouf/pottery/alhanouf1.obj',
    height: 0.72,
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
    artist: ARTIST.name,
  },
  {
    kind: 'sculpture',
    model: 'pendant',
    title: 'Untitled',
    artist: ARTIST.name,
  },
];

export const DESIGN = [
  {
    slug: 'peak-identity',
    title: 'peak identity',
    category: 'identity',
    year: '2024',
    text: 'creating identity for an events management company .',
    images: pics('peak-identity', 6),
    slots: [
      img(`${peakId}/identity/75d44dde-a65d-4a51-9430-09600184421b_rw_3840.jpg`),
      img(`${peakId}/identity/a8ad9a85-05d8-4a0c-8dec-14222a88c456_rw_1200.jpg`),
      img(`${peakId}/identity/b9d6ccf2-92ac-4211-bf6e-fd5ffefdbbde_rw_1920.jpg`),
      img(`${peakId}/identity/fbf310b7-0c39-453e-b19f-31be0cd00672_rw_1920.jpg`),
      ...pics('peak-identity', 6).map(img),
    ],
    source: src('peak-identity'),
  },
  {
    slug: 'parkit-idintity',
    title: 'parkit idintity',
    category: 'identity',
    year: '2024',
    images: pics('parkit-idintity', 7),
    slots: [
      img(`${parkitId}/25a5f240-0f5f-44fd-91a9-ccb163519b04_rw_1920.jpg`),
      img(`${parkitId}/a41737af-a293-4a84-a21d-4b0ff1f4f231_rw_1920.jpg`),
      img(`${parkitId}/b5659f81-dee8-4578-8b57-08ac91d12c7a_rw_1920.jpg`),
      img(`${parkitId}/c2d80d6f-586d-4da8-aacc-4b7a7f953f5d_rw_1920.jpg`),
      img(`${parkitId}/cad3ee39-3110-4ee6-9475-826c11ed1da9_rw_1920.jpg`),
      img(`${parkitId}/e94acb9a-ba6b-4d0e-9a21-74f62ba50f5e_rw_1920.jpg`),
      img(`${parkitId}/Dark Isometric Business Cards.jpg`),
      img(`${parkitId}/video/Free_iPad_Mockup_1.jpg`),
      img(`${parkitId}/website/Macbook_Air_M2_Mockup_2.jpg`),
      vid(`${parkitId}/website/REC-14460108133838 2.mp4`, `${parkitId}/website/rec-poster.jpg`),
    ],
    source: src('parkit-idintity'),
  },
  {
    slug: 'brand-idintity',
    title: 'brand idintity',
    category: 'identity',
    year: '2024',
    text: 'branding for Jwana skin care',
    images: pics('brand-idintity', 1),
    slots: [
      img('assets/hanouf/design/jwana/jwana skin care.jpg'),
      img(pics('brand-idintity', 1)[0]),
    ],
    source: src('brand-idintity'),
  },
  {
    slug: 'meqaf',
    title: 'Meqaf',
    category: 'identity',
    label: 'Brand identity',
    year: '2026',
    text: 'Meqaf is a Saudi-female brand that aims to turn memories into mementos.',
    rightTitle: 'Palette & Applications',
    rightText: 'The core colors of the Meqaf identity and how they carry across packaging and keepsakes.',
    sheet: '#D2A245',
    swatches: [
      { name: 'Cream', hex: '#F7E5D1' },
      { name: 'Slate', hex: '#7396A2' },
      { name: 'Gold', hex: '#D2A245' },
      { name: 'Burgundy', hex: '#90222C' },
      { name: 'Ink', hex: '#000000' },
      { name: 'White', hex: '#FFFFFF' },
    ],
    slots: [
      img(`${meqafId}/pattren-03.jpg`),
      img(`${meqafId}/red-paper-texture.jpg`),
      img(`${meqafId}/pattren-04.jpg`),
      img(`${meqafId}/sticker_sheet_mockup_v3.jpg`),
      img(`${meqafId}/Free_Square_Business_Card_Mockup_2.jpg`),
      img(`${meqafId}/Free_Tabloid_Falyer_Mockup_2.jpg`),
      img(`${meqafId}/Square_Sticker_Mockup_1.jpg`),
      img(`${meqafId}/Box_Mockup_1.jpg`),
      img(`${meqafId}/Box_Mockup_2.jpg`),
      img(`${meqafId}/Fridge_Magnet_Mockup_1.jpg`),
    ],
  },
  {
    slug: 'profile-design',
    title: 'profile design',
    category: 'profile',
    year: '2024',
    text: 'profile Peak-events operation management company',
    images: pics('profile-design', 1),
    slots: [
      img(`${peakId}/company profile/profile peak mockup.jpg`),
      img(pics('profile-design', 1)[0]),
    ],
    source: src('profile-design'),
  },
  {
    slug: 'q-bix',
    title: 'Q-Bix',
    category: 'profile',
    label: 'Profile',
    text: 'Q-Bix International: Extraordinary Events. Powerful Marketing.',
    rightText: 'Q-Bix International is a full-service event and marketing agency based in Riyadh, offering bespoke solutions to businesses across diverse sectors.',
    slots: [
      img(`${qbixId}/P4JQ5M1.jpg`),
      ...[1, 2, 3, 4, 5, 8, 12, 18, 24].map((n) => img(`${qbixId}/Q-Bix Profile EN 1_pages/page-${String(n).padStart(2, '0')}.jpg`)),
    ],
  },
  {
    slug: 'video-editing',
    title: 'video editing',
    category: 'video',
    year: '2024',
    images: pics('video-editing', 1),
    slots: [
      img(`${peakId}/videos/Free_iPad_Mockup_1.jpg`),
      img(pics('video-editing', 1)[0]),
      vid(`${peakId}/videos/'24 part 1 No.8.mp4`, `${peakId}/videos/part1-poster.jpg`),
      vid(`${peakId}/videos/saudi national day 6.mp4`, `${peakId}/videos/national-poster.jpg`),
      ...[1, 2, 3, 4].map((n) => vid(`assets/projects/video-editing/v${n}.mp4`, `assets/projects/video-editing/v${n}.webp`)),
    ],
    source: src('video-editing'),
  },
  {
    slug: 'cube-design',
    title: 'cube design',
    category: 'cube',
    year: '2024',
    images: pics('cube-design', 3),
    slots: pics('cube-design', 3).map(img),
    source: src('cube-design'),
  },
  {
    slug: 'playing-card-design',
    title: 'playing card design',
    category: 'playing card',
    year: '2024',
    images: pics('playing-card-design', 3),
    slots: pics('playing-card-design', 3).map(img),
    source: src('playing-card-design'),
  },
  {
    slug: 'social-media-posts',
    title: 'Other Designs',
    category: 'Other Designs',
    year: '2024',
    images: pics('social-media-posts', 3),
    slots: [
      img(`${peakId}/posts and designs/22بطاقات الموظفين.png`),
      img(`${peakId}/posts and designs/42182868-e87b-437b-a6dc-88f191b42714_rw_1920.jpg`),
      img(`${peakId}/posts and designs/Saxon .jpg`),
      img(`${peakId}/posts and designs/Screenshot 1445-08-25 at 9.34.02 PM.jpg`),
      img(`${peakId}/posts and designs/بوست اكمال سنة للموظفين.jpg`),
      ...pics('social-media-posts', 3).map(img),
      vid('assets/projects/social-media-posts/v1.mp4', 'assets/projects/social-media-posts/v1.webp'),
    ],
    source: src('social-media-posts'),
  },
  {
    slug: 'website-design',
    title: 'website design',
    category: 'website',
    year: '2024',
    text: 'website for peak company',
    images: pics('website-design', 1),
    slots: [
      img(`${peakId}/website/Macbook_Air_M2_Mockup_2.jpg`),
      img(pics('website-design', 1)[0]),
      null,
      null,
      null,
      null,
      site('assets/projects/website-design/page.webp', 'http://peak.sa.com/index-ar.html'),
      vid(`${peakId}/website/REC-14460110221301 2.mp4`, `${peakId}/website/rec-poster.jpg`),
    ],
    source: src('website-design'),
    links: [{ label: 'http://peak.sa.com/index-ar.html', href: 'http://peak.sa.com/index-ar.html' }],
  },
  {
    slug: 'vest-design',
    title: 'vest design',
    category: 'vest',
    year: '2024',
    images: pics('vest-design', 6),
    slots: [
      ...[
        '0740740b-9da8-47bc-9b66-f2f5fa2c476c_rw_1200.jpg',
        '20ebd103-fd33-48b7-9722-b2f42bb853c2_rw_1200.jpg',
        '61a203d5-81b0-4a12-8200-9efb6920671c_rw_1200.jpg',
        '6c693fc4-36ad-4bf4-a38b-a1301ef188c0_rw_1200.jpg',
        '7678e828-16e5-44ab-b888-2caf4d1ad209_rw_1200.jpg',
        'cf530ea1-a502-4dae-967a-2716748287bc_rw_1200.jpg',
      ].map((name) => img(`assets/hanouf/design/vest design/${name}`)),
      ...pics('vest-design', 4).map(img),
    ],
    source: src('vest-design'),
  },
  {
    slug: 'tazo-burger',
    title: 'TAZO BURGER',
    category: 'TAZO BURGER',
    text: 'قرمشة تسمعها .. وطعم تعيشه',
    rightText: 'جديدنا في رمضان',
    slots: [
      img(`${tazoId}/WhatsApp Image 1447-03-27 at 12.30.46 (1).jpg`),
      img(`${tazoId}/New Menu Tazo Burger_pages/page-1.jpg`),
      img(`${tazoId}/New Menu Tazo Burger_pages/page-2.jpg`),
      img(`${tazoId}/New Menu Tazo Burger_pages/page-3.jpg`),
      img(`${tazoId}/new ramadhan special_pages/page-1.jpg`),
      img(`${tazoId}/new ramadhan special_pages/page-2.jpg`),
      img(`${tazoId}/social media/0-03.jpg`),
      img(`${tazoId}/social media/0-06.jpg`),
      img(`${tazoId}/social media/احسان.jpg`),
    ],
  },
  {
    slug: 'himmtk',
    title: 'Himmtk',
    category: 'Himmtk',
    sheet: '#FCE161',
    swatches: [
      { hex: '#FCE161' },
      { hex: '#FDF0AE' },
      { hex: '#9B7FEA' },
      { hex: '#192354' },
      { hex: '#FFFFFF' },
      { hex: '#000000' },
    ],
    slots: [
      img('assets/hanouf/design/himmtk identity/همتك_pages/page-1.jpg'),
    ],
  },
  {
    slug: 'tabaqat',
    title: 'Tabaqat',
    category: 'Tabaqat',
    slots: [
      img(`${gameId}/App icon.png`),
      img(`${gameId}/UI 2.png`),
      img(`${gameId}/UI-04.png`),
      img(`${gameId}/level 1 tabagat.png`),
      img(`${gameId}/Screenshot 1447-11-18 at 2.24.37 PM.jpg`),
      img(`${gameId}/هوية طبقات_pages/page-1.jpg`),
      vid(`${gameId}/Final Comp 2.mp4`, `${gameId}/final-poster.jpg`),
    ],
  },
  {
    slug: 'al-kees-show',
    title: 'Al Kees Show',
    category: 'Al Kees Show',
    slots: [
      img('assets/hanouf/design/alkees show identity/kees (1).png'),
    ],
  },
];

export const SCENES = [
  { id: 'about', hash: '#about', label: 'About' },
  { id: 'ceramics', hash: '#ceramics', label: 'Ceramics' },
  { id: 'design', hash: '#design', label: 'Design' },
  { id: 'art', hash: '#art', label: 'Art' },
];
