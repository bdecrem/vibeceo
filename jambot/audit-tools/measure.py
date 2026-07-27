#!/usr/bin/env python3
"""Objective shrillness + squelch metrics for harness renders."""
import numpy as np, wave, sys, glob

def load(p):
    w = wave.open(p); sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32)/32768
    return x.reshape(-1, w.getnchannels()).mean(axis=1), sr

def narrow_peak(x, sr, fmin=2500, fmax=16000):
    f = np.fft.rfftfreq(len(x), 1/sr); S = 20*np.log10(np.abs(np.fft.rfft(x)) + 1e-9)
    band = (f > fmin) & (f < fmax); fb, Sb = f[band], S[band]
    best = (0, 0)
    for i in range(0, len(fb), 80):
        med = np.median(Sb[(fb > fb[i]-500) & (fb < fb[i]+500)])
        if Sb[i] - med > best[0]: best = (Sb[i] - med, fb[i])
    return best

def metrics(p):
    x, sr = load(p)
    f = np.fft.rfftfreq(len(x), 1/sr); P = np.abs(np.fft.rfft(x))**2
    tot = P[(f>20)&(f<16000)].sum()
    hf = P[(f>5000)&(f<16000)].sum()/tot
    body = P[(f>80)&(f<1000)].sum()/tot
    pk, fc = narrow_peak(x, sr)
    # squelch tracking: spectral centroid (100-4000Hz) per 0.5s window
    cents = []
    for t0 in np.arange(0, len(x)/sr - 0.5, 0.5):
        seg = x[int(t0*sr):int((t0+0.5)*sr)]
        ff = np.fft.rfftfreq(len(seg), 1/sr); SS = np.abs(np.fft.rfft(seg))**2
        m = (ff>100)&(ff<4000)
        if SS[m].sum() > 1e-8: cents.append((ff[m]*SS[m]).sum()/SS[m].sum())
    cents = np.array(cents)
    sweep = (cents.max()-cents.min())/max(cents.mean(),1) if len(cents) else 0
    return f"peak>2.5k: {pk:4.1f}dB@{fc:5.0f}Hz | HF>5k: {100*hf:4.1f}% | body: {100*body:4.1f}% | centroid sweep ratio: {sweep:.2f} | rms: {np.sqrt((x**2).mean()):.4f}"

for p in sorted(glob.glob(sys.argv[1])):
    print(p.split('/')[-1], '\n  ', metrics(p))
