import type { MonsterId } from '../types';

// Konfiguration for rigtige GLB-dyremodeller i public/models/.
// targetHeight bruges til auto-skalering, så modellen får den rigtige størrelse
// uanset dens oprindelige skala. faceForward roterer modellen så den vender mod
// spilleren (+Z). clips mapper vores tilstande til klip-navne i den animerede model.
export interface MonsterModelConfig {
  file: string;
  targetHeight: number;
  faceForward: number; // radianer
  animated: boolean;
  clips: { idle?: string; walk?: string; run?: string; attack?: string; death?: string };
}

export const MODEL_CONFIG: Partial<Record<MonsterId, MonsterModelConfig>> = {
  ulv: {
    file: 'ulv.glb',
    targetHeight: 1.7,
    faceForward: 0,
    animated: true,
    clips: { idle: 'Idle', walk: 'Walk', run: 'Gallop', attack: 'Attack', death: 'Death' },
  },
  raev: {
    file: 'raev.glb',
    targetHeight: 1.0,
    faceForward: 0,
    animated: true,
    clips: { idle: 'Idle', walk: 'Walk', run: 'Gallop', attack: 'Attack', death: 'Death' },
  },
  hjort: {
    file: 'hjort.glb',
    targetHeight: 1.9,
    faceForward: 0,
    animated: true,
    clips: { idle: 'Idle', walk: 'Walk', run: 'Gallop', attack: 'Attack_Headbutt', death: 'Death' },
  },
  tyr: {
    file: 'tyr.glb',
    targetHeight: 1.9,
    faceForward: 0,
    animated: true,
    clips: { idle: 'Idle', walk: 'Walk', run: 'Gallop', attack: 'Attack_Headbutt', death: 'Death' },
  },
  vildsvin: {
    file: 'vildsvin.glb',
    targetHeight: 1.6,
    faceForward: 0,
    animated: false,
    clips: {},
  },
  bjorn: {
    file: 'bjorn.glb',
    targetHeight: 2.3,
    faceForward: 0,
    animated: false,
    clips: {},
  },
};
