# Original score for the Diwali film. Nothing sampled, nothing borrowed.
import numpy as np

SR = 48000
DUR = 40.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(20261108)

L = np.zeros(N); R = np.zeros(N)

def midi(m): return 440.0 * 2 ** ((m - 69) / 12.0)

def add(buf, start, sig, gain=1.0):
    i = int(start * SR)
    if i >= N: return
    k = min(len(sig), N - i)
    if k > 0: buf[i:i+k] += sig[:k] * gain

def stereo(start, sig, gain=1.0, pan=0.0):
    gl = gain * np.sqrt((1 - pan) / 2) * 1.414
    gr = gain * np.sqrt((1 + pan) / 2) * 1.414
    add(L, start, sig, gl); add(R, start, sig, gr)

# ---- santoor / music-box style struck string ----
def pluck(freq, dur, amp=1.0, bright=1.0):
    n = int(dur * SR); x = np.arange(n) / SR
    parts = [(1.0, 1.00, 1.70), (2.0, 0.44, 1.05), (3.0, 0.21, 0.70),
             (4.0, 0.11, 0.48), (5.4, 0.055, 0.34), (6.8, 0.028, 0.24)]
    out = np.zeros(n)
    for ratio, a, tau in parts:
        f = freq * ratio * (1 + 0.0012 * (ratio - 1))
        out += a * bright ** (ratio - 1) * np.sin(2 * np.pi * f * x) * np.exp(-x / tau)
    # a touch of strike noise
    k = int(0.012 * SR)
    out[:k] += rng.normal(0, 0.28, k) * np.exp(-np.arange(k) / (0.0035 * SR))
    atk = np.clip(x / 0.004, 0, 1)
    return out * atk * amp / 1.9

# ---- temple-bell for the climax ----
def bell(freq, dur, amp=1.0):
    n = int(dur * SR); x = np.arange(n) / SR
    parts = [(1.0, 1.0, 3.6), (2.00, 0.6, 2.4), (2.76, 0.52, 2.0),
             (4.07, 0.32, 1.3), (5.43, 0.22, 0.9), (8.21, 0.12, 0.6)]
    out = np.zeros(n)
    for ratio, a, tau in parts:
        out += a * np.sin(2 * np.pi * freq * ratio * x) * np.exp(-x / tau)
    out *= (1 + 0.04 * np.sin(2 * np.pi * 3.1 * x))   # gentle beating
    return out * np.clip(x / 0.006, 0, 1) * amp / 2.4

# ---- breathing pad ----
def pad(freqs, dur, amp=1.0, atk=2.2, rel=2.6):
    n = int(dur * SR); x = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for det in (-0.004, 0.0, 0.0045):
            ph = rng.random() * 6.283
            v = 1 + 0.0016 * np.sin(2 * np.pi * 0.17 * x + ph)   # slow drift
            out += np.sin(2 * np.pi * f * (1 + det) * x * v + ph)
            out += 0.22 * np.sin(2 * np.pi * 2 * f * (1 + det) * x + ph)
    env = np.clip(x / atk, 0, 1) * np.clip((dur - x) / rel, 0, 1)
    env *= 0.86 + 0.14 * np.sin(2 * np.pi * 0.09 * x)
    return out * env * amp / (len(freqs) * 3.4)

# ---- tanpura-ish drone ----
def drone(freq, dur, amp=1.0):
    n = int(dur * SR); x = np.arange(n) / SR
    out = np.zeros(n)
    for h, a in [(1, 1.0), (2, 0.42), (3, 0.2), (4, 0.1), (5, 0.05)]:
        out += a * np.sin(2 * np.pi * freq * h * x + rng.random() * 6.283)
    out *= 0.8 + 0.2 * np.sin(2 * np.pi * 0.07 * x)
    env = np.clip(x / 3.0, 0, 1) * np.clip((dur - x) / 3.0, 0, 1)
    return out * env * amp / 1.8

# ---- distant firework: a soft thud, never a bang ----
def boom(amp=1.0):
    n = int(1.5 * SR); x = np.arange(n) / SR
    low = np.sin(2 * np.pi * 52 * x * (1 - 0.25 * x)) * np.exp(-x / 0.22)
    nz = rng.normal(0, 1, n)
    # cheap low-pass: running mean
    w = 70; nz = np.convolve(nz, np.ones(w) / w, mode='same')
    nz *= np.exp(-x / 0.33)
    return (low * 0.85 + nz * 0.5) * amp

def swell(dur, amp=1.0):
    n = int(dur * SR); x = np.arange(n) / SR
    nz = rng.normal(0, 1, n)
    w = 180; nz = np.convolve(nz, np.ones(w) / w, mode='same')
    env = np.sin(np.pi * np.clip(x / dur, 0, 1)) ** 2
    return nz * env * amp

# ================= arrangement =================
D3, A3, D4 = midi(50), midi(57), midi(62)
stereo(0.0, drone(D3, 39.0, 0.30), 1.0, -0.12)
stereo(0.6, drone(A3, 38.2, 0.17), 1.0, 0.14)
stereo(21.0, drone(D4, 18.0, 0.10), 1.0, 0.0)

# chords under the story
CH = [(0.0, 14.8, [midi(50), midi(57), midi(62), midi(65)], 0.30),   # Dm
      (13.8, 7.0, [midi(46), midi(53), midi(58), midi(62)], 0.28),   # Bb
      (19.8, 6.8, [midi(53), midi(60), midi(65), midi(69)], 0.28),   # F
      (25.6, 5.2, [midi(55), midi(58), midi(62), midi(67)], 0.32),   # Gm
      (29.6, 10.2, [midi(50), midi(57), midi(62), midi(69)], 0.34)]  # Dm, home
for st, dr, fr, am in CH:
    stereo(st, pad(fr, dr, am), 1.0, rng.uniform(-0.18, 0.18))

# the melody
MEL = [
  # scene 1 - the waiting
  (2.1, 69, .34), (3.0, 67, .30), (3.9, 65, .32), (5.3, 64, .26), (6.1, 62, .30),
  # scene 2 - one diya
  (8.45, 74, .30), (9.0, 69, .34), (9.9, 65, .30), (10.7, 67, .28),
  (11.7, 65, .30), (12.9, 64, .26), (13.6, 62, .28),
  # scene 3 - the light spreads
  (14.9, 65, .30), (15.5, 67, .30), (16.1, 69, .34), (16.8, 72, .32),
  (17.7, 70, .30), (18.3, 69, .32), (19.1, 67, .28), (19.9, 69, .30), (20.9, 65, .28),
  # scene 4 - coming home
  (22.6, 62, .30), (23.2, 65, .32), (23.8, 69, .34), (24.4, 72, .36),
  (25.1, 74, .40), (26.05, 74, .46), (26.9, 72, .38), (27.7, 69, .34),
  (28.5, 67, .30), (29.3, 65, .28),
  # scene 5 - the wish
  (30.9, 69, .32), (31.7, 74, .38), (32.9, 72, .32), (33.7, 69, .32),
  (34.9, 67, .28), (35.7, 65, .30), (36.9, 64, .26), (37.7, 62, .32),
]
for st, m, am in MEL:
    f = midi(m)
    stereo(st, pluck(f, 3.4, am, bright=0.92), 1.0, np.clip((m - 67) * 0.045, -0.3, 0.3))
    # soft octave shimmer above
    stereo(st + 0.012, pluck(f * 2, 2.0, am * 0.16, bright=0.8), 1.0, 0.22)

# the moment the diya catches
stereo(8.45, bell(midi(86), 3.2, 0.17), 1.0, 0.10)
# the embrace
stereo(26.05, bell(midi(62), 5.5, 0.30), 1.0, -0.06)
stereo(26.05, bell(midi(74), 4.5, 0.16), 1.0, 0.12)
# the wish lands
stereo(31.3, bell(midi(74), 5.0, 0.20), 1.0, 0.05)

# distant fireworks, kept well under the music
for ft, am, pn in [(23.1,.12,-.3),(24.0,.10,.35),(25.2,.11,-.2),(26.15,.22,0.0),
                   (26.9,.12,.3),(27.8,.10,-.35),(28.9,.11,.2),(31.5,.17,-.15),
                   (33.2,.10,.3),(34.9,.13,-.25),(36.1,.10,.2),(37.1,.12,-.1)]:
    stereo(ft, boom(am), 1.0, pn)
stereo(24.6, swell(5.0, 0.020), 1.0, 0.0)
stereo(30.6, swell(7.0, 0.016), 1.0, 0.0)

# ---- reverb: a warm hall ----
def make_ir(tau, length, seed):
    r = np.random.default_rng(seed)
    n = int(length * SR); x = np.arange(n) / SR
    ir = r.normal(0, 1, n) * np.exp(-x / tau)
    w = 6; ir = np.convolve(ir, np.ones(w) / w, mode='same')   # soften the top
    pre = int(0.028 * SR)
    ir[:pre] *= np.linspace(0, 1, pre) ** 3
    return ir / np.sqrt(np.sum(ir ** 2))

def conv(sig, ir):
    n = len(sig) + len(ir) - 1
    nf = 1 << (n - 1).bit_length()
    out = np.fft.irfft(np.fft.rfft(sig, nf) * np.fft.rfft(ir, nf), nf)[:len(sig)]
    return out

irL, irR = make_ir(1.25, 2.8, 7), make_ir(1.32, 2.8, 8)
WET = 0.34
L = L * (1 - WET * 0.55) + conv(L, irL) * WET
R = R * (1 - WET * 0.55) + conv(R, irR) * WET

# ---- the arc: restrained when she waits, full when he comes home ----
arc = np.interp(t, [0, 3, 7, 11, 14, 21, 26, 30, 36, 40],
                   [0.50, 0.56, 0.62, 0.70, 0.76, 0.92, 1.00, 0.97, 0.95, 0.90])
L *= arc; R *= arc

# ---- gentle master: soft knee, fades ----
mx = np.maximum(np.abs(L).max(), np.abs(R).max())
L, R = L / mx * 0.92, R / mx * 0.92
L, R = np.tanh(L * 1.18) / np.tanh(1.18), np.tanh(R * 1.18) / np.tanh(1.18)
fade = np.ones(N)
fi = int(1.6 * SR); fade[:fi] = np.linspace(0, 1, fi) ** 1.5
fo = int(1.9 * SR); fade[-fo:] = np.linspace(1, 0, fo) ** 1.4
L *= fade; R *= fade
peak = max(np.abs(L).max(), np.abs(R).max())
L, R = L / peak * 0.89, R / peak * 0.89

out = np.empty(N * 2, dtype=np.float32)
out[0::2] = L; out[1::2] = R
out.tofile('score.f32')
print('score.f32 written  %.1fs  peak=%.3f  rms=%.4f' % (DUR, peak and 0.89, np.sqrt(np.mean(L**2))))
