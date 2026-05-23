// Delte typer på tværs af spillet.

export type GameState = 'menu' | 'playing' | 'shop' | 'paused' | 'gameover';

// En cylindrisk forhindring (træ/sten) på XZ-planet til kollision.
export interface Obstacle {
  x: number;
  z: number;
  r: number;
}

export type WeaponId =
  | 'pistol'
  | 'maskinpistol'
  | 'haglgevaer'
  | 'snigskytte'
  | 'riffel'
  | 'flammekaster'
  | 'granatkaster'
  | 'raketkaster'
  | 'minigun';
export type SoundKind = WeaponId;

export interface WeaponStats {
  id: WeaponId;
  navn: string; // dansk visningsnavn
  beskrivelse: string;
  pris: number; // 0 = startvåben (ejes fra start)
  skade: number; // skade pr. projektil/hit
  skudPerSekund: number; // skudtakt
  magasin: number; // skud pr. magasin
  genladetid: number; // sekunder
  spredning: number; // radianer (0 = præcis)
  automatisk: boolean; // true = skyd ved at holde museknappen nede
  projektilerPerSkud: number; // 1 normalt, >1 for haglgevær
  raekkevidde: number; // max distance i enheder
  rekyl: number; // viewmodel/kamera kick
  uendeligAmmo: boolean; // pistol løber aldrig tør for reserve
  maxReserve: number; // max reserve-ammunition
  ammoPris: number; // pris for at fylde reserve op i shoppen
  splash: number; // område-skade radius (0 = ingen)
  effekt?: 'tracer' | 'flamme'; // visuel skud-effekt (default: tracer)
  lyd: SoundKind;
  farve: number; // viewmodel-farve
}

export type MonsterId = 'ulv' | 'raev' | 'vildsvin' | 'hjort' | 'tyr' | 'bjorn';

export interface MonsterStats {
  id: MonsterId;
  navn: string;
  helbred: number;
  fart: number; // enheder/sekund
  skade: number; // skade pr. angreb
  angrebInterval: number; // sekunder mellem angreb
  angrebRaekkevidde: number;
  moenter: number; // belønning ved drab
  skala: number; // visuel skalering
  pelsFarve: number; // primær kropsfarve
  detaljeFarve: number; // snude/poter/horn
}
