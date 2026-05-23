import type { SoundKind } from '../types';

// Procedural lyd via WebAudio – ingen lyd-filer nødvendige, virker offline.
// Signalkæde: lyde → bus → (tør) master  +  bus → reverb → (våd) master
//             master → kompressor → højttalere
export class AudioManager {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private bus: GainNode | null = null;
  private _muted = false;
  private volume = 0.4;

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctor();
      this.ctx = ctx;

      // Kompressor for at lime lyde sammen og undgå klipning
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 24;
      comp.ratio.value = 4;
      comp.attack.value = 0.003;
      comp.release.value = 0.25;
      comp.connect(ctx.destination);

      this.master = ctx.createGain();
      this.master.gain.value = this._muted ? 0 : this.volume;
      this.master.connect(comp);

      // Bus: alle lyde sendes hertil (tør + våd)
      this.bus = ctx.createGain();
      this.bus.connect(this.master);

      // Reverb-send
      const reverb = ctx.createConvolver();
      reverb.buffer = this.makeReverbIR(ctx, 1.1, 3.0);
      const wet = ctx.createGain();
      wet.gain.value = 0.16;
      this.bus.connect(reverb);
      reverb.connect(wet);
      wet.connect(this.master);
    } catch {
      this.ctx = null;
    }
    return this.ctx;
  }

  private makeReverbIR(ctx: AudioContext, seconds: number, decay: number): AudioBuffer {
    const rate = ctx.sampleRate;
    const len = Math.max(1, Math.floor(rate * seconds));
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  /** Skal kaldes efter en bruger-gestus (klik), ellers blokerer browseren lyd. */
  resume(): void {
    const c = this.ensure();
    if (c && c.state === 'suspended') void c.resume();
  }

  get muted(): boolean {
    return this._muted;
  }

  toggleMute(): boolean {
    this._muted = !this._muted;
    if (this.master) this.master.gain.value = this._muted ? 0 : this.volume;
    return this._muted;
  }

  // ---- byggeklodser ----

  private rand(base: number, pct: number): number {
    return base * (1 + (Math.random() * 2 - 1) * pct);
  }

  /** Tonal komponent med frekvens-glid og hurtig attack + eksponentiel decay. */
  private tone(freqStart: number, freqEnd: number, dur: number, type: OscillatorType, gain: number, delay = 0): void {
    const c = this.ctx;
    if (!c || !this.bus) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.bus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Filtreret støj-burst. filterFreq kan glide til filterEnd for et naturligt decay. */
  private noise(
    dur: number,
    gain: number,
    filterFreq: number,
    filterType: BiquadFilterType,
    delay = 0,
    filterEnd?: number,
  ): void {
    const c = this.ctx;
    if (!c || !this.bus) return;
    const t0 = c.currentTime + delay;
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(filterFreq, t0);
    if (filterEnd !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(40, filterEnd), t0 + dur);
    filter.Q.value = 0.8;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(g).connect(this.bus);
    src.start(t0);
    src.stop(t0 + dur + 0.02);
  }

  /** Lagdelt skud: knald-transient + krop + støj-hale + sub-bas. */
  private gun(opts: {
    body: number;
    tailDur: number;
    tailFilter: number;
    sub: number;
    gain: number;
    bright?: number;
  }): void {
    const p = this.rand(1, 0.06); // lille pitch-variation pr. skud
    // Knald (kort, lys transient)
    this.noise(0.025, 0.5 * opts.gain, (opts.bright ?? 4000) * p, 'highpass');
    // Krop (toneligt "smæk")
    this.tone(opts.body * p, opts.body * 0.25, 0.06, 'square', 0.22 * opts.gain);
    // Hale (filtreret støj med decay)
    this.noise(opts.tailDur, 0.55 * opts.gain, opts.tailFilter * p, 'lowpass', 0.004, opts.tailFilter * 0.4);
    // Sub-bas punch
    this.tone(opts.sub * p, opts.sub * 0.4, 0.09, 'sine', 0.5 * opts.gain);
  }

  // ---- skud-lyde ----

  shoot(kind: SoundKind): void {
    switch (kind) {
      case 'pistol':
        this.gun({ body: 720, tailDur: 0.12, tailFilter: 1900, sub: 150, gain: 0.85, bright: 4200 });
        break;
      case 'maskinpistol':
        this.gun({ body: 820, tailDur: 0.08, tailFilter: 2400, sub: 140, gain: 0.6, bright: 5000 });
        break;
      case 'haglgevaer':
        this.gun({ body: 320, tailDur: 0.26, tailFilter: 1500, sub: 90, gain: 1.0, bright: 3000 });
        break;
      case 'snigskytte':
        this.gun({ body: 600, tailDur: 0.4, tailFilter: 2200, sub: 70, gain: 1.0, bright: 5500 });
        this.tone(110, 40, 0.45, 'sine', 0.4, 0.01); // ekstra dyb rumlen
        break;
      case 'riffel':
        this.gun({ body: 560, tailDur: 0.1, tailFilter: 2200, sub: 120, gain: 0.8, bright: 5000 });
        break;
      case 'minigun':
        this.gun({ body: 480, tailDur: 0.07, tailFilter: 1700, sub: 110, gain: 0.7, bright: 3800 });
        break;
      case 'flammekaster':
        // Brusende ild: filtreret støj med lidt knitren
        this.noise(0.16, 0.28, 1100, 'lowpass', 0, 600);
        this.noise(0.05, 0.12, 3500, 'highpass');
        this.tone(80, 60, 0.14, 'sawtooth', 0.05);
        break;
      case 'granatkaster':
        // Hul "thunk"-affyring
        this.noise(0.09, 0.4, 800, 'lowpass', 0, 300);
        this.tone(280, 80, 0.12, 'square', 0.28);
        this.tone(120, 60, 0.14, 'sine', 0.3);
        break;
      case 'raketkaster':
        this.noise(0.32, 0.45, 1000, 'lowpass', 0, 400);
        this.tone(180, 620, 0.3, 'sawtooth', 0.22); // stigende whoosh
        this.tone(90, 50, 0.3, 'sine', 0.3);
        break;
    }
  }

  explosion(): void {
    this.noise(0.5, 0.9, 1600, 'lowpass', 0, 200); // stort knald med filter-sweep
    this.noise(0.18, 0.5, 5000, 'highpass'); // skarp crack
    this.tone(160, 32, 0.55, 'sawtooth', 0.4); // krop
    this.tone(70, 28, 0.7, 'sine', 0.45, 0.02); // dyb rumlen
  }

  hit(): void {
    // Kødfuldt "thwack"
    this.noise(0.04, 0.3, 5000, 'highpass');
    this.tone(380, 160, 0.05, 'square', 0.18);
  }

  monsterDeath(): void {
    const p = this.rand(1, 0.12);
    this.tone(340 * p, 70, 0.45, 'sawtooth', 0.32); // brøl ned
    this.tone(170 * p, 50, 0.4, 'square', 0.14, 0.02);
    this.noise(0.28, 0.32, 1200, 'lowpass', 0.03, 500);
  }

  playerHurt(): void {
    this.tone(180, 70, 0.28, 'square', 0.32);
    this.tone(90, 45, 0.3, 'sine', 0.3);
    this.noise(0.12, 0.32, 900, 'lowpass');
  }

  coin(): void {
    this.tone(880, 880, 0.06, 'triangle', 0.2);
    this.tone(1320, 1320, 0.09, 'triangle', 0.2, 0.05);
    this.tone(1760, 1760, 0.1, 'triangle', 0.16, 0.1);
  }

  buy(): void {
    this.tone(523, 523, 0.09, 'triangle', 0.25);
    this.tone(659, 659, 0.09, 'triangle', 0.25, 0.07);
    this.tone(784, 784, 0.14, 'triangle', 0.26, 0.14);
    this.tone(1047, 1047, 0.16, 'triangle', 0.2, 0.21);
  }

  error(): void {
    this.tone(220, 150, 0.16, 'sawtooth', 0.25);
    this.tone(160, 110, 0.18, 'square', 0.2, 0.04);
  }

  waveStart(): void {
    this.tone(294, 294, 0.2, 'sawtooth', 0.26);
    this.tone(392, 392, 0.22, 'sawtooth', 0.28, 0.16);
    this.tone(587, 587, 0.32, 'sawtooth', 0.28, 0.32);
  }

  gameOver(): void {
    this.tone(440, 415, 0.32, 'sawtooth', 0.3);
    this.tone(392, 349, 0.36, 'sawtooth', 0.3, 0.32);
    this.tone(330, 196, 0.7, 'sawtooth', 0.32, 0.7);
    this.tone(165, 98, 0.9, 'sine', 0.3, 0.7);
  }

  click(): void {
    this.tone(660, 620, 0.04, 'square', 0.15);
  }
}
