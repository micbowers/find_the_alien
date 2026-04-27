// 39 hand-illustrated aliens with their attributes.
// Each alien object: { num, name, color, eyes, heads, horns, antennae, tail,
// stripes, spots, smile, fangs, bodyShape, img }
// IMPORTANT: eyes and horns are TOTAL counts across all heads (already
// totaled — no multiplication needed). This matches what kids literally
// count on the screen.

export const EMBEDDED_ALIENS = [
  { num: 1, name: "Zorp", color: "purple", eyes: 6, heads: 2, horns: 4, antennae: false, tail: false, stripes: false, spots: true,  smile: true,  fangs: false, bodyShape: "round",  img: "/aliens/01_Zorp.png" },
  { num: 2, name: "Blix", color: "orange", eyes: 2, heads: 1, horns: 0, antennae: true,  tail: true,  stripes: true,  spots: false, smile: true,  fangs: false, bodyShape: "round",  img: "/aliens/02_Blix.png" },
  { num: 3, name: "Grom", color: "teal",   eyes: 2, heads: 2, horns: 2, antennae: false, tail: true,  stripes: true,  spots: false, smile: true,  fangs: true,  bodyShape: "tall",   img: "/aliens/03_Grom.png" },
  { num: 4, name: "Kex",  color: "purple", eyes: 1, heads: 1, horns: 1, antennae: true,  tail: false, stripes: false, spots: true,  smile: true,  fangs: false, bodyShape: "square", img: "/aliens/04_Kex.png" },
  { num: 5, name: "Voob", color: "teal",   eyes: 6, heads: 2, horns: 2, antennae: true,  tail: false, stripes: false, spots: false, smile: true,  fangs: true,  bodyShape: "tall",   img: "/aliens/05_Voob.png" },
  { num: 6, name: "Nix",  color: "orange", eyes: 2, heads: 1, horns: 0, antennae: true,  tail: true,  stripes: true,  spots: true,  smile: true,  fangs: false, bodyShape: "round",  img: "/aliens/06_Nix.png" },
  { num: 7, name: "Plim", color: "purple", eyes: 1, heads: 1, horns: 2, antennae: false, tail: false, stripes: true,  spots: true,  smile: false, fangs: false, bodyShape: "square", img: "/aliens/07_Plim.png" },
  { num: 8, name: "Zorb", color: "orange", eyes: 4, heads: 2, horns: 0, antennae: false, tail: true,  stripes: false, spots: false, smile: true,  fangs: false, bodyShape: "tall",   img: "/aliens/08_Zorb.png" },
  { num: 9, name: "Trax", color: "teal",   eyes: 2, heads: 1, horns: 1, antennae: false, tail: true,  stripes: true,  spots: false, smile: true,  fangs: true,  bodyShape: "round",  img: "/aliens/09_Trax.png" },
  { num: 10, name: "Flop",   color: "orange", eyes: 6, heads: 2, horns: 2, antennae: true,  tail: false, stripes: true,  spots: true,  smile: true,  fangs: false, bodyShape: "tall",   img: "/aliens/10_Flop.png" },
  { num: 11, name: "Glub",   color: "purple", eyes: 4, heads: 2, horns: 0, antennae: false, tail: false, stripes: false, spots: false, smile: true,  fangs: true,  bodyShape: "tall",   img: "/aliens/11_Glub.png" },
  { num: 12, name: "Spin",   color: "teal",   eyes: 1, heads: 1, horns: 2, antennae: true,  tail: true,  stripes: true,  spots: true,  smile: false, fangs: false, bodyShape: "square", img: "/aliens/12_Spin.png" },
  { num: 13, name: "Kip",    color: "teal",   eyes: 3, heads: 1, horns: 0, antennae: false, tail: true,  stripes: true,  spots: false, smile: true,  fangs: false, bodyShape: "round",  img: "/aliens/13_Kip.png" },
  { num: 14, name: "Rex",    color: "orange", eyes: 2, heads: 2, horns: 2, antennae: true,  tail: false, stripes: true,  spots: true,  smile: false, fangs: false, bodyShape: "tall",   img: "/aliens/14_Rex.png" },
  { num: 15, name: "Wobb",   color: "purple", eyes: 4, heads: 2, horns: 1, antennae: false, tail: false, stripes: false, spots: true,  smile: true,  fangs: true,  bodyShape: "tall",   img: "/aliens/15_Wobb.png" },
  { num: 16, name: "Pilt",   color: "purple", eyes: 2, heads: 1, horns: 1, antennae: true,  tail: true,  stripes: true,  spots: false, smile: true,  fangs: false, bodyShape: "square", img: "/aliens/16_Pilt.png" },
  { num: 17, name: "Moxy",   color: "teal",   eyes: 1, heads: 1, horns: 0, antennae: true,  tail: false, stripes: true,  spots: true,  smile: true,  fangs: false, bodyShape: "tall",   img: "/aliens/17_Moxy.png" },
  { num: 18, name: "Dax",    color: "orange", eyes: 4, heads: 2, horns: 4, antennae: false, tail: true,  stripes: false, spots: true,  smile: true,  fangs: true,  bodyShape: "round",  img: "/aliens/18_Dax.png" },
  { num: 19, name: "Trig",   color: "teal",   eyes: 2, heads: 1, horns: 0, antennae: false, tail: true,  stripes: false, spots: false, smile: true,  fangs: false, bodyShape: "round",  img: "/aliens/19_Trig.png" },
  { num: 20, name: "Quex",   color: "purple", eyes: 6, heads: 2, horns: 2, antennae: true,  tail: false, stripes: true,  spots: false, smile: true,  fangs: true,  bodyShape: "tall",   img: "/aliens/20_quex.png" },
  { num: 21, name: "Zeep",   color: "orange", eyes: 2, heads: 2, horns: 3, antennae: false, tail: true,  stripes: false, spots: false, smile: false, fangs: true,  bodyShape: "round",  img: "/aliens/21_zeep.png" },
  { num: 22, name: "Vex",    color: "purple", eyes: 1, heads: 1, horns: 2, antennae: true,  tail: false, stripes: true,  spots: true,  smile: true,  fangs: false, bodyShape: "square", img: "/aliens/22_vex.png" },
  { num: 23, name: "Thom",   color: "orange", eyes: 3, heads: 1, horns: 0, antennae: true,  tail: true,  stripes: false, spots: false, smile: true,  fangs: true,  bodyShape: "round",  img: "/aliens/23_thom.png" },
  { num: 24, name: "Gaz",    color: "teal",   eyes: 4, heads: 2, horns: 0, antennae: false, tail: false, stripes: true,  spots: true,  smile: false, fangs: false, bodyShape: "tall",   img: "/aliens/24_gaz.png" },
  { num: 25, name: "Lurb",   color: "orange", eyes: 1, heads: 1, horns: 1, antennae: false, tail: false, stripes: true,  spots: false, smile: true,  fangs: false, bodyShape: "tall",   img: "/aliens/25_lurb.png" },
  { num: 26, name: "Snix",   color: "purple", eyes: 4, heads: 2, horns: 2, antennae: true,  tail: true,  stripes: false, spots: true,  smile: true,  fangs: true,  bodyShape: "round",  img: "/aliens/26_snix.png" },
  { num: 27, name: "Broz",   color: "teal",   eyes: 3, heads: 1, horns: 2, antennae: true,  tail: true,  stripes: true,  spots: false, smile: true,  fangs: false, bodyShape: "round",  img: "/aliens/27_broz.png" },
  { num: 28, name: "Fip",    color: "teal",   eyes: 2, heads: 2, horns: 2, antennae: false, tail: false, stripes: false, spots: true,  smile: true,  fangs: false, bodyShape: "square", img: "/aliens/28_fip.png" },
  { num: 29, name: "Klax",   color: "orange", eyes: 3, heads: 1, horns: 0, antennae: false, tail: true,  stripes: false, spots: true,  smile: false, fangs: false, bodyShape: "tall",   img: "/aliens/29_klax.png" },
  { num: 31, name: "Zim",    color: "orange", eyes: 2, heads: 1, horns: 1, antennae: false, tail: true,  stripes: false, spots: true,  smile: true,  fangs: false, bodyShape: "round",  img: "/aliens/31_zim.png" },
  { num: 32, name: "Plonk",  color: "purple", eyes: 2, heads: 1, horns: 0, antennae: true,  tail: false, stripes: false, spots: true,  smile: true,  fangs: true,  bodyShape: "round",  img: "/aliens/32_Plonk.png" },
  { num: 33, name: "Grix",   color: "teal",   eyes: 2, heads: 2, horns: 2, antennae: true,  tail: false, stripes: false, spots: true,  smile: true,  fangs: true,  bodyShape: "tall",   img: "/aliens/33_Grix.png" },
  { num: 34, name: "Blort",  color: "orange", eyes: 2, heads: 1, horns: 2, antennae: false, tail: true,  stripes: false, spots: true,  smile: true,  fangs: false, bodyShape: "round",  img: "/aliens/34_Blort.png" },
  { num: 35, name: "Gorp",   color: "orange", eyes: 2, heads: 2, horns: 3, antennae: false, tail: true,  stripes: false, spots: false, smile: true,  fangs: false, bodyShape: "round",  img: "/aliens/35_Gorp.png" },
  { num: 36, name: "Mibble", color: "orange", eyes: 2, heads: 1, horns: 2, antennae: false, tail: false, stripes: false, spots: true,  smile: true,  fangs: false, bodyShape: "tall",   img: "/aliens/36_Mibble.png" },
  { num: 37, name: "Plorp",  color: "teal",   eyes: 6, heads: 2, horns: 0, antennae: true,  tail: true,  stripes: true,  spots: true,  smile: true,  fangs: true,  bodyShape: "round",  img: "/aliens/37_Plorp.png" },
  { num: 38, name: "Umbo",   color: "purple", eyes: 2, heads: 1, horns: 1, antennae: false, tail: false, stripes: true,  spots: true,  smile: false, fangs: false, bodyShape: "tall",   img: "/aliens/38_Umbo.png" },
  { num: 39, name: "Vurn",   color: "purple", eyes: 1, heads: 1, horns: 2, antennae: false, tail: false, stripes: true,  spots: true,  smile: false, fangs: false, bodyShape: "tall",   img: "/aliens/39_Vurn.png" },
  { num: 48, name: "Zok",    color: "orange", eyes: 2, heads: 1, horns: 2, antennae: true,  tail: false, stripes: false, spots: true,  smile: true,  fangs: true,  bodyShape: "round",  img: "/aliens/48_zok.png" },
];

export function getAlienImageUrl(name) {
  const src = EMBEDDED_ALIENS.find(a => a.name === name);
  return src ? src.img : null;
}

export function renderAlienHTML(attrs) {
  if (!attrs) return '';
  const url = getAlienImageUrl(attrs.name);
  if (!url) {
    return `<div style="padding:20px;text-align:center;color:#888;font-size:11px;">${attrs.name || '?'}</div>`;
  }
  return `<img src="${url}" alt="${attrs.name || ''}" style="width:100%;height:100%;object-fit:contain;display:block;" draggable="false" loading="lazy">`;
}

export function generateAlienPool() {
  return EMBEDDED_ALIENS.map(a => {
    const { img, ...rest } = a;
    return rest;
  });
}

export function sampleAliens(pool, count = 24) {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, count);
}
