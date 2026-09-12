/* Original MIDI-note composition, synthesized locally. No audio downloads. */
class DerbyAudio {
  constructor() {
    this.enabled = true;
    this.scene = 'draw';
    this.context = null;
    this.voices = new Set();
    this.step = 0;
    this.cue = 0;
    this.combo = 0;
    this.hidden = false;
    this.timer = null;
  }

  async unlock() {
    if (!this.enabled || this.hidden) return;
    try {
      if (!this.context) {
        this.context = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.context.createGain();
        this.master.gain.value = 0.42;
        const limiter = this.context.createDynamicsCompressor();
        limiter.threshold.value = -16;
        limiter.ratio.value = 5;
        this.master.connect(limiter);
        limiter.connect(this.context.destination);
      }
      await this.context.resume();
      this.startAmbient();
    } catch { /* The game remains playable if audio is unavailable. */ }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (enabled) this.unlock();
    else this.silence();
  }

  silence() {
    clearInterval(this.timer);
    this.timer = null;
    for (const node of this.voices) {
      try { node.stop(); } catch {}
    }
    this.voices.clear();
  }

  setScene(scene) {
    this.silence();
    this.scene = scene;
    this.step = 0;
    this.cue = 0;
    this.combo = 0;
    this.startAmbient();
  }

  pause(hidden) {
    this.hidden = hidden;
    this.silence();
    if (!hidden) this.unlock();
  }

  get ready() {
    return this.enabled && !this.hidden && this.context?.state === 'running';
  }

  // Short envelopes and a master compressor keep overlapping combo notes gentle.
  note(midi, at, duration = 0.14, volume = 0.08, wave = 'square', slide = 0) {
    if (!this.ready) return;
    const ctx = this.context;
    at = Math.max(ctx.currentTime, at);
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = wave;
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    oscillator.frequency.setValueAtTime(frequency, at);
    if (slide) oscillator.frequency.exponentialRampToValueAtTime(frequency * 2 ** (slide / 12), at + duration);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(volume, at + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    this.voices.add(oscillator);
    oscillator.onended = () => {
      this.voices.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
  }

  percussion(at, strong = false) {
    // Pitched tom + wooden hoof: a tiny galloping drum kit.
    this.note(strong ? 43 : 76, at, strong ? 0.14 : 0.035, strong ? 0.22 : 0.055, 'sine', strong ? -20 : -10);
  }

  phrase(index, at, ambient = false) {
    // 150 BPM. Each 0.8-second input cycle spans two quarter notes.
    // Repeated hook: mi-mi-sol-la / sol-mi-re-do; variation every four bars.
    const melody = [76,76,79,81,79,76,74,72,76,76,79,81,83,81,79,74,
      76,76,79,81,79,76,74,72,74,76,74,71,72,79,76,72];
    const i = index % melody.length;
    const root = [48,45,53,55][Math.floor(i / 8)];
    const level = ambient ? 0.035 : 0.075;
    this.note(melody[i], at, ambient ? 0.22 : 0.13, level, ambient ? 'triangle' : 'square');
    if (i % 2 === 0) this.note(root + (i % 4 === 2 ? 7 : 0), at, 0.17, ambient ? 0.045 : 0.14, 'triangle');
    if (!ambient) {
      this.percussion(at, i % 4 === 0);
      if (i % 2 === 0) this.percussion(at + 0.1);
      if (this.combo >= 3 && i % 2 === 1) this.note(melody[i] + 12, at, 0.08, 0.026, 'triangle');
    }
  }

  startAmbient() {
    if (!this.ready || this.scene === 'race' || this.timer) return;
    this.next = this.context.currentTime + 0.08;
    const schedule = () => {
      if (!this.ready) return;
      while (this.next < this.context.currentTime + 0.12) {
        this.phrase(this.step++, this.next, true);
        this.next += this.scene === 'result' ? 0.25 : 0.3;
      }
    };
    schedule();
    this.timer = setInterval(schedule, 40);
  }

  sync(elapsed, combo) {
    if (!this.ready || this.scene !== 'race' || elapsed < 0) return;
    this.combo = combo;
    // Rebase after mute/backgrounding, never replay a backlog of notes.
    this.step = Math.max(this.step, Math.ceil((elapsed - 0.035) / 0.2));
    while (this.step * 0.2 <= elapsed + 0.12) {
      this.phrase(this.step, this.context.currentTime + Math.max(0, this.step * 0.2 - elapsed));
      this.step++;
    }
    this.cue = Math.max(this.cue, Math.ceil((elapsed - 0.672 - 0.035) / 0.8));
    while (this.cue * 0.8 + 0.672 <= elapsed + 0.12) {
      // Bell lands in the middle of the green target, so ears can guide the tap.
      this.note(91, this.context.currentTime + Math.max(0, this.cue * 0.8 + 0.672 - elapsed), 0.075, 0.1, 'sine');
      this.cue++;
    }
  }

  effect(kind, value = 0) {
    if (!this.ready) return;
    const at = this.context.currentTime;
    if (kind === 'count') {
      this.note(67, at, 0.12, 0.15, 'square');
      this.note(55, at, 0.1, 0.09, 'triangle');
    } else if (kind === 'go') {
      [72,79,84].forEach((n,i) => this.note(n, at+i*0.06, 0.18, 0.12));
    } else if (kind === 'hit') {
      const n = 76 + Math.min(value, 6);
      [n,n+7,n+12].forEach((m,i) => this.note(m,at+i*0.035,0.09,0.09,'triangle'));
      if (value > 0 && value % 3 === 0) this.note(60, at, 0.23, 0.07, 'sawtooth', 24);
    } else if (kind === 'miss') {
      this.note(52, at, 0.19, 0.085, 'triangle', -12);
    } else if (kind === 'finish') {
      const tune = value === 1 ? [72,76,79,84,79,84] : [76,74,72,67,72];
      tune.forEach((n,i) => this.note(n,at+i*0.13,0.25,0.12));
    } else if (kind === 'draw') {
      this.note(72 + value % 5 * 2, at, 0.07, 0.045, 'sine');
    } else if (kind === 'adopt') {
      [60,67,72].forEach((n,i) => this.note(n,at+i*0.065,0.12,0.08,'triangle',5));
    }
  }
}
window.derbyAudio = new DerbyAudio();
