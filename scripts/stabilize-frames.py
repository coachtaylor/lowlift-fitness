#!/usr/bin/env python3
"""Frame stabilizer. Vertical: anchor content bottom (floor) to a constant.
Optional --hx: also anchor the head (top-of-content) horizontal center — for
UPRIGHT/seated movements only (not lying poses). Pads with bg, clamps to avoid clipping."""
import subprocess, sys, os, statistics
args = [a for a in sys.argv[1:] if not a.startswith("--")]
HX = "--hx" in sys.argv
IN, OUT = args[0], args[1]
BG = args[2] if len(args) > 2 else "#F7F7F5"
def bbox_of(out):
    wh, xy = out.split("+",1); x,y = map(int, xy.split("+")); w,h = map(int, wh.split("x")); return w,h,x,y
def info(f):
    bb = bbox_of(subprocess.check_output(["magick", f, "-fuzz","12%","-format","%@","info:"]).decode().strip())
    cw, ch = map(int, subprocess.check_output(["magick", f, "-format","%w %h","info:"]).decode().split())
    return (*bb, cw, ch)
def head_cx(f, y, h, cw, frac=0.22):
    sh = max(1, int(h*frac))
    out = subprocess.check_output(["magick", f, "-crop", f"{cw}x{sh}+0+{y}", "+repage","-fuzz","12%","-format","%@","info:"]).decode().strip()
    w2,h2,x2,y2 = bbox_of(out); return x2 + w2/2.0
frames = sorted(f for f in os.listdir(IN) if f.lower().endswith(".png"))
data = {f: info(os.path.join(IN,f)) for f in frames}
cw, ch = next(iter(data.values()))[4:6]
bottoms = [y+h for (w,h,x,y,_,_) in data.values()]
maxH = max(h for (w,h,x,y,_,_) in data.values())
ty = max(min(int(statistics.median(bottoms)), ch-6), maxH+6)
hcx = {f: head_cx(os.path.join(IN,f), d[3], d[1], cw) for f,d in data.items()} if HX else None
tx = statistics.median(hcx.values()) if HX else None
os.makedirs(OUT, exist_ok=True)
for f,(w,h,x,y,_,_) in data.items():
    dy = ty - (y+h)
    dx = 0
    if HX:
        dx = round(tx - hcx[f])
        dx = max(min(dx, cw-(x+w)), -x)   # clamp so content stays on-canvas
    subprocess.check_call(["magick","-size",f"{cw}x{ch}","xc:"+BG, os.path.join(IN,f),
                           "-geometry",f"{dx:+d}{dy:+d}","-composite", os.path.join(OUT,f)])
print(f"{os.path.basename(IN):24s} floor->{ty}{' +head-x' if HX else ''}")
