// Globale spilkonstanter for Animal Hunt.

export const ARENA_HALF = 45; // halv-bredde af arenaen → spilleflade ca. 90x90
export const WALL_HEIGHT = 6;

export const PLAYER_HEIGHT = 1.7; // øjenhøjde
export const PLAYER_RADIUS = 0.5;
export const PLAYER_SPEED = 7.0; // enheder/sekund
export const PLAYER_SPRINT = 11.0;
export const PLAYER_MAX_HEALTH = 100;
export const MOUSE_SENSITIVITY = 1.0;
export const JUMP_SPEED = 6.5; // start-fart opad ved hop
export const GRAVITY = 22; // tyngdekraft (enheder/sek²)

// Sigte/zoom (højre museknap)
export const BASE_FOV = 75;
export const AIM_FOV = 48; // lavere = mere zoom
export const AIM_SENS_FACTOR = 0.55; // langsommere kig når man sigter
export const AIM_SPREAD_FACTOR = 0.45; // strammere spredning når man sigter

// Mønter / pickups
export const COIN_VACUUM_RADIUS = 10; // afstand hvor mønter suges mod spiller
export const COIN_COLLECT_RADIUS = 2.0;
export const COIN_VACUUM_SPEED = 20;

// Bølger
export const FIRST_WAVE_DELAY = 1.5; // sek. før første bølge starter
