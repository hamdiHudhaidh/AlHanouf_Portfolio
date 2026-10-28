// Original path -> smaller siblings, best first.
// WebP is requested first when it cleared the quality bar: it decodes faster
// than AVIF here. AVIF is the next fallback. The original is last.
export const MODERN = new Map([
  ["assets/hanouf/design/meqaf identity/Box_Mockup_1.jpg", ["assets/hanouf/design/meqaf identity/Box_Mockup_1.webp","assets/hanouf/design/meqaf identity/Box_Mockup_1.avif"]],
  ["assets/hanouf/design/meqaf identity/Box_Mockup_2.jpg", ["assets/hanouf/design/meqaf identity/Box_Mockup_2.webp","assets/hanouf/design/meqaf identity/Box_Mockup_2.avif"]],
  ["assets/hanouf/design/meqaf identity/Free_Square_Business_Card_Mockup_2.jpg", ["assets/hanouf/design/meqaf identity/Free_Square_Business_Card_Mockup_2.webp","assets/hanouf/design/meqaf identity/Free_Square_Business_Card_Mockup_2.avif"]],
  ["assets/hanouf/design/meqaf identity/Free_Tabloid_Falyer_Mockup_2.jpg", ["assets/hanouf/design/meqaf identity/Free_Tabloid_Falyer_Mockup_2.webp","assets/hanouf/design/meqaf identity/Free_Tabloid_Falyer_Mockup_2.avif"]],
  ["assets/hanouf/design/meqaf identity/Fridge_Magnet_Mockup_1.jpg", ["assets/hanouf/design/meqaf identity/Fridge_Magnet_Mockup_1.webp","assets/hanouf/design/meqaf identity/Fridge_Magnet_Mockup_1.avif"]],
  ["assets/hanouf/design/meqaf identity/Square_Sticker_Mockup_1.jpg", ["assets/hanouf/design/meqaf identity/Square_Sticker_Mockup_1.webp","assets/hanouf/design/meqaf identity/Square_Sticker_Mockup_1.avif"]],
  ["assets/hanouf/design/meqaf identity/pattren-03.jpg", ["assets/hanouf/design/meqaf identity/pattren-03.webp","assets/hanouf/design/meqaf identity/pattren-03.avif"]],
  ["assets/hanouf/design/meqaf identity/pattren-04.jpg", ["assets/hanouf/design/meqaf identity/pattren-04.webp","assets/hanouf/design/meqaf identity/pattren-04.avif"]],
  ["assets/hanouf/design/meqaf identity/red-paper-texture.jpg", ["assets/hanouf/design/meqaf identity/red-paper-texture.avif"]],
  ["assets/hanouf/design/meqaf identity/sticker_sheet_mockup_v3.jpg", ["assets/hanouf/design/meqaf identity/sticker_sheet_mockup_v3.webp","assets/hanouf/design/meqaf identity/sticker_sheet_mockup_v3.avif"]],
  ["assets/hanouf/design/peak identity/company profile/profile peak mockup.jpg", ["assets/hanouf/design/peak identity/company profile/profile peak mockup.webp","assets/hanouf/design/peak identity/company profile/profile peak mockup.avif"]],
  ["assets/hanouf/design/peak identity/identity/75d44dde-a65d-4a51-9430-09600184421b_rw_3840.jpg", ["assets/hanouf/design/peak identity/identity/75d44dde-a65d-4a51-9430-09600184421b_rw_3840.webp","assets/hanouf/design/peak identity/identity/75d44dde-a65d-4a51-9430-09600184421b_rw_3840.avif"]],
  ["assets/hanouf/design/peak identity/identity/a8ad9a85-05d8-4a0c-8dec-14222a88c456_rw_1200.jpg", ["assets/hanouf/design/peak identity/identity/a8ad9a85-05d8-4a0c-8dec-14222a88c456_rw_1200.webp","assets/hanouf/design/peak identity/identity/a8ad9a85-05d8-4a0c-8dec-14222a88c456_rw_1200.avif"]],
  ["assets/hanouf/design/peak identity/identity/b9d6ccf2-92ac-4211-bf6e-fd5ffefdbbde_rw_1920.jpg", ["assets/hanouf/design/peak identity/identity/b9d6ccf2-92ac-4211-bf6e-fd5ffefdbbde_rw_1920.webp","assets/hanouf/design/peak identity/identity/b9d6ccf2-92ac-4211-bf6e-fd5ffefdbbde_rw_1920.avif"]],
  ["assets/hanouf/design/peak identity/identity/fbf310b7-0c39-453e-b19f-31be0cd00672_rw_1920.jpg", ["assets/hanouf/design/peak identity/identity/fbf310b7-0c39-453e-b19f-31be0cd00672_rw_1920.webp","assets/hanouf/design/peak identity/identity/fbf310b7-0c39-453e-b19f-31be0cd00672_rw_1920.avif"]],
  ["assets/hanouf/design/peak identity/posts and designs/22بطاقات الموظفين.png", ["assets/hanouf/design/peak identity/posts and designs/22بطاقات الموظفين.webp","assets/hanouf/design/peak identity/posts and designs/22بطاقات الموظفين.avif"]],
  ["assets/hanouf/design/peak identity/posts and designs/42182868-e87b-437b-a6dc-88f191b42714_rw_1920.jpg", ["assets/hanouf/design/peak identity/posts and designs/42182868-e87b-437b-a6dc-88f191b42714_rw_1920.webp","assets/hanouf/design/peak identity/posts and designs/42182868-e87b-437b-a6dc-88f191b42714_rw_1920.avif"]],
  ["assets/hanouf/design/peak identity/posts and designs/Saxon .jpg", ["assets/hanouf/design/peak identity/posts and designs/Saxon .webp","assets/hanouf/design/peak identity/posts and designs/Saxon .avif"]],
  ["assets/hanouf/design/peak identity/posts and designs/Screenshot 1445-08-25 at 9.34.02 PM.jpg", ["assets/hanouf/design/peak identity/posts and designs/Screenshot 1445-08-25 at 9.34.02 PM.webp","assets/hanouf/design/peak identity/posts and designs/Screenshot 1445-08-25 at 9.34.02 PM.avif"]],
  ["assets/hanouf/design/peak identity/posts and designs/بوست اكمال سنة للموظفين.jpg", ["assets/hanouf/design/peak identity/posts and designs/بوست اكمال سنة للموظفين.webp","assets/hanouf/design/peak identity/posts and designs/بوست اكمال سنة للموظفين.avif"]],
  ["assets/hanouf/design/peak identity/videos/Free_iPad_Mockup_1.jpg", ["assets/hanouf/design/peak identity/videos/Free_iPad_Mockup_1.webp","assets/hanouf/design/peak identity/videos/Free_iPad_Mockup_1.avif"]],
  ["assets/hanouf/design/peak identity/videos/national-poster.jpg", ["assets/hanouf/design/peak identity/videos/national-poster.webp","assets/hanouf/design/peak identity/videos/national-poster.avif"]],
  ["assets/hanouf/design/peak identity/videos/part1-poster.jpg", ["assets/hanouf/design/peak identity/videos/part1-poster.webp","assets/hanouf/design/peak identity/videos/part1-poster.avif"]],
  ["assets/hanouf/design/peak identity/website/Macbook_Air_M2_Mockup_2.jpg", ["assets/hanouf/design/peak identity/website/Macbook_Air_M2_Mockup_2.webp","assets/hanouf/design/peak identity/website/Macbook_Air_M2_Mockup_2.avif"]],
  ["assets/hanouf/design/peak identity/website/rec-poster.jpg", ["assets/hanouf/design/peak identity/website/rec-poster.webp","assets/hanouf/design/peak identity/website/rec-poster.avif"]],
  ["assets/hanouf/pottery/textures/clay-stoneware-color.jpg", ["assets/hanouf/pottery/textures/clay-stoneware-color.webp","assets/hanouf/pottery/textures/clay-stoneware-color.avif"]],
  ["assets/hanouf/pottery/textures/clay-terracotta-color.jpg", ["assets/hanouf/pottery/textures/clay-terracotta-color.webp","assets/hanouf/pottery/textures/clay-terracotta-color.avif"]]
]);
