#!/usr/bin/env python3
"""Shrink-to-fit: uniformly scale a frame sequence so the global content envelope
(union across all frames) clears a target margin, center it horizontally, floor-anchor it.
Same scale+offset for every frame → no size pop, motion preserved. Usage: refit.py IN OUT M [bg]"""
import subprocess, sys, os
IN, OUT, M = sys.argv[1], sys.argv[2], int(sys.argv[3])
BG = sys.argv[4] if len(sys.argv) > 4 else "#F7F7F5"
def bb(f):
    o = subprocess.check_output(["magick", f, "-fuzz","12%","-format","%@","info:"]).decode().strip()
    wh,xy=o.split("+",1); x,y=map(int,xy.split("+")); w,h=map(int,wh.split("x")); return w,h,x,y
frames = sorted(f for f in os.listdir(IN) if f.lower().endswith(".png"))
cw,ch = map(int, subprocess.check_output(["magick", os.path.join(IN,frames[0]), "-format","%w %h","info:"]).decode().split())
bbs = {f: bb(os.path.join(IN,f)) for f in frames}
minX = min(x for (w,h,x,y) in bbs.values())
maxX = max(x+w for (w,h,x,y) in bbs.values())
minY = min(y for (w,h,x,y) in bbs.values())
maxY = max(y+h for (w,h,x,y) in bbs.values())
uW, uH = maxX-minX, maxY-minY
s = min(1.0, (cw-2*M)/uW, (ch-2*M)/uH)
# place scaled union: centered horizontally, floor-anchored (bottom at ch-M)
offX = (cw - uW*s)/2 - minX*s
offY = (ch - M) - maxY*s
os.makedirs(OUT, exist_ok=True)
for f in frames:
    subprocess.check_call(["magick", os.path.join(IN,f), "-resize", f"{s*100:.4f}%",
        "-background", BG, "-virtual-pixel","background",
        "-page", f"+{round(offX)}+{round(offY)}", "-background", BG, "-flatten",
        "-gravity","NorthWest", "-extent", f"{cw}x{ch}", os.path.join(OUT,f)])
print(f"scale {s:.3f}  union {uW}x{uH}  margin->{M}px  (was L={minX} R={cw-maxX})")
