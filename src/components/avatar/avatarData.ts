export interface AvatarFace {
  eyes: string;       // SVG path for eyes
  mouth: string;      // SVG path for mouth
  eyebrows?: string;  // Optional SVG path for eyebrows
}

export interface AvatarVariant {
  id: string;
  gradient: [string, string];
  face: AvatarFace;
}

// 8 unique face expressions
const faces: AvatarFace[] = [
  // 1: Happy smile, round eyes
  {
    eyes: 'M 35 42 A 2.5 2.5 0 1 1 35.01 42 M 65 42 A 2.5 2.5 0 1 1 65.01 42',
    mouth: 'M 38 58 Q 50 70 62 58',
  },
  // 2: Closed happy eyes, open smile
  {
    eyes: 'M 30 42 Q 35 38 40 42 M 60 42 Q 65 38 70 42',
    mouth: 'M 38 56 Q 50 68 62 56',
  },
  // 3: Round eyes, small smile
  {
    eyes: 'M 35 42 A 2.5 2.5 0 1 1 35.01 42 M 65 42 A 2.5 2.5 0 1 1 65.01 42',
    mouth: 'M 42 60 Q 50 66 58 60',
    eyebrows: 'M 29 35 Q 35 31 41 34 M 59 34 Q 65 31 71 35',
  },
  // 4: Comma eyes, side smile
  {
    eyes: 'M 36 40 Q 34 44 36 44 M 66 40 Q 64 44 66 44',
    mouth: 'M 40 58 Q 52 66 62 60',
  },
  // 5: Dot eyes, flat smile, wavy brows
  {
    eyes: 'M 35 43 A 2 2 0 1 1 35.01 43 M 65 43 A 2 2 0 1 1 65.01 43',
    mouth: 'M 40 60 Q 50 64 60 60',
    eyebrows: 'M 28 36 Q 32 32 38 34 Q 35 32 42 35 M 58 35 Q 65 32 68 34 Q 65 32 72 36',
  },
  // 6: Wink + tongue out
  {
    eyes: 'M 30 42 Q 35 38 40 42 M 65 42 A 2.5 2.5 0 1 1 65.01 42',
    mouth: 'M 38 58 Q 50 68 62 58 M 48 64 Q 50 70 52 64',
  },
  // 7: Sleepy/content - lines + gentle curve
  {
    eyes: 'M 30 43 L 40 43 M 60 43 L 70 43',
    mouth: 'M 42 59 Q 50 64 58 59',
  },
  // 8: Surprised - open eyes, O mouth
  {
    eyes: 'M 35 42 A 3 3 0 1 1 35.01 42 M 65 42 A 3 3 0 1 1 65.01 42',
    mouth: 'M 46 60 A 4 4 0 1 1 54 60 A 4 4 0 1 1 46 60',
    eyebrows: 'M 29 34 Q 35 30 41 33 M 59 33 Q 65 30 71 34',
  },
];

// 12 gradient palettes
const palettes: [string, string][] = [
  ['#FF9A56', '#FF6B6B'], // Laranja → Coral
  ['#FF8A9B', '#FFCBA4'], // Rosa → Pêssego
  ['#B8A9E8', '#7BA7E8'], // Lilás → Azul
  ['#5B9AE8', '#56D4E8'], // Azul → Ciano
  ['#56C596', '#A8E86B'], // Verde → Limão
  ['#FFD56B', '#E8B830'], // Amarelo → Dourado
  ['#3DC1C3', '#7AEAB8'], // Turquesa → Menta
  ['#E85B5B', '#5B7AE8'], // Vermelho → Azul
  ['#F07AAE', '#9B6BFF'], // Rosa → Violeta
  ['#56D4E8', '#56C596'], // Ciano → Verde
  ['#C4A8F0', '#F0A8C4'], // Lavanda → Rosa
  ['#5B7AE8', '#3D3DC1'], // Azul → Índigo
];

// Generate 24 avatars: 12 palettes × cycle through 8 faces (take 2 per palette)
export const AVATAR_VARIANTS: AvatarVariant[] = palettes.flatMap((gradient, i) => [
  {
    id: `avatar-${i * 2 + 1}`,
    gradient,
    face: faces[i % faces.length],
  },
  {
    id: `avatar-${i * 2 + 2}`,
    gradient,
    face: faces[(i + 4) % faces.length],
  },
]);

export const getAvatarById = (id: string): AvatarVariant | undefined =>
  AVATAR_VARIANTS.find((v) => v.id === id);

export const getAvatarForName = (name: string): AvatarVariant => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_VARIANTS.length;
  return AVATAR_VARIANTS[index];
};
