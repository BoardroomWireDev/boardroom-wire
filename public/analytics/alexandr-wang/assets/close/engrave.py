"""Regenerate: py -3.12 engrave.py L.json 0.5 0.75 && py -3.12 engrave-tojs.py L.json open-head-engraving.js   (FMIX 0.5, DTK 0.75: the settings shipped 10 Oct 2026)
"""
"""White-line engraving (scratchboard) of the open-head art, as vector paths in page space (1920x1080).

Lines are traced along a form-following direction field (Jobard-Lefer evenly spaced streamlines); each line's width is the
art's tone at that point, so the picture is carried by line weight alone. Output: JSON of layers, each a list of polygon
path strings, for the page to inline. Source art 1280x720, page = source x 1.5.
"""
import json, math, sys, time
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

PRD = r"C:\Users\dakot\OneDrive\Desktop\Boardroom 2.0\videos\alexandr-wang\thumbnails\PRD"
OUT = sys.argv[1] if len(sys.argv) > 1 else "layers.json"
W, H = 1920, 1080
K = 1.5
FMIX = float(sys.argv[2]) if len(sys.argv) > 2 else 0.6
DTK = float(sys.argv[3]) if len(sys.argv) > 3 else 0.55

# the cut, measured on the art (source px) -> page px
CX, CY, RX, RY = 639.7 * K, 318.0 * K, 308.7 * K, 56.0 * K


def load(name):
    im = Image.open(f"{PRD}\\{name}").convert("RGB").resize((W, H), Image.BICUBIC)
    a = np.asarray(im).astype(np.float32) / 255.0
    lum = 0.2126 * a[..., 0] + 0.7152 * a[..., 1] + 0.0722 * a[..., 2]
    return a, lum


def front_y(x):
    t = np.clip((x - CX) / RX, -1, 1)
    return CY + RY * np.sqrt(1 - t * t)


def in_ellipse(x, y, grow=0.0):
    return ((x - CX) / (RX + grow)) ** 2 + ((y - CY) / (RY + grow)) ** 2 <= 1


yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)


def field(lum, sig_t=9.0, base=0.0, mix=0.85, sig_i=2.0, sig_f=6.0):
    I = ndi.gaussian_filter(lum, sig_i)
    gx = ndi.sobel(I, 1); gy = ndi.sobel(I, 0)
    j11 = ndi.gaussian_filter(gx * gx, sig_t); j12 = ndi.gaussian_filter(gx * gy, sig_t); j22 = ndi.gaussian_filter(gy * gy, sig_t)
    tr = j11 + j22 + 1e-9
    coh = np.sqrt((j11 - j22) ** 2 + 4 * j12 ** 2) / tr
    th_g = 0.5 * np.arctan2(2 * j12, j11 - j22)
    th_i = th_g + np.pi / 2
    s = tr / (np.percentile(tr, 97) + 1e-9)
    a = mix * np.clip(coh, 0, 1) ** 0.5 * np.clip(s * 1.6, 0, 1) ** 0.35
    c2 = a * np.cos(2 * th_i) + (1 - a) * np.cos(2 * base)
    s2 = a * np.sin(2 * th_i) + (1 - a) * np.sin(2 * base)
    c2 = ndi.gaussian_filter(c2, sig_f); s2 = ndi.gaussian_filter(s2, sig_f)
    th = 0.5 * np.arctan2(s2, c2)
    return np.cos(th).astype(np.float32), np.sin(th).astype(np.float32)


def bil(arr, x, y):
    x = min(max(x, 0.0), W - 1.001); y = min(max(y, 0.0), H - 1.001)
    x0 = int(x); y0 = int(y); fx = x - x0; fy = y - y0
    return (arr[y0, x0] * (1 - fx) * (1 - fy) + arr[y0, x0 + 1] * fx * (1 - fy)
            + arr[y0 + 1, x0] * (1 - fx) * fy + arr[y0 + 1, x0 + 1] * fx * fy)


def trace_all(fx, fy, mask, dsep, step=1.0, dtest_k=0.55, minlen=10, seed_dir=None):
    dtest = dsep * dtest_k
    cell = dsep
    gw, gh = int(W / cell) + 1, int(H / cell) + 1
    grid = {}
    lines = []

    def ok(x, y, lid, idx_ok):
        if x < 0 or y < 0 or x >= W - 1 or y >= H - 1: return False
        if not mask[int(y), int(x)]: return False
        gx, gy = int(x / cell), int(y / cell)
        for i in range(gx - 1, gx + 2):
            for j in range(gy - 1, gy + 2):
                for (px, py, l2, k2) in grid.get((i, j), ()):
                    if l2 == lid and idx_ok(k2): continue
                    if (px - x) ** 2 + (py - y) ** 2 < dtest * dtest: return False
        return True

    sepk = [0.98]
    def far(x, y):
        gx, gy = int(x / cell), int(y / cell)
        for i in range(gx - 1, gx + 2):
            for j in range(gy - 1, gy + 2):
                for (px, py, _, _) in grid.get((i, j), ()):
                    if (px - x) ** 2 + (py - y) ** 2 < (dsep * sepk[0]) ** 2: return False
        return True

    def trace(sx, sy, lid):
        pts = [(sx, sy)]
        for sgn in (1, -1):
            x, y = sx, sy
            dx, dy = bil(fx, x, y) * sgn, bil(fy, x, y) * sgn
            seg = []
            for _ in range(6000):
                vx, vy = bil(fx, x, y), bil(fy, x, y)
                if vx * dx + vy * dy < 0: vx, vy = -vx, -vy
                # midpoint step
                mx, my = x + vx * step * 0.5, y + vy * step * 0.5
                wx, wy = bil(fx, mx, my), bil(fy, mx, my)
                if wx * vx + wy * vy < 0: wx, wy = -wx, -wy
                nx, ny = x + wx * step, y + wy * step
                n = len(seg)
                if not ok(nx, ny, lid, lambda k: True): break
                seg.append((nx, ny)); x, y, dx, dy = nx, ny, wx, wy
            if sgn == 1: pts = pts + seg
            else: pts = list(reversed(seg)) + pts
        return pts

    def commit(pts, lid):
        for k, (x, y) in enumerate(pts):
            grid.setdefault((int(x / cell), int(y / cell)), []).append((x, y, lid, k))

    # seed candidates: a coarse grid scan, ordered top-left first, plus neighbours of finished lines
    queue = []
    cand = [(x, y) for y in np.arange(dsep / 2, H, dsep * 3) for x in np.arange(dsep / 2, W, dsep * 3)]
    ci = 0
    while True:
        if queue:
            sx, sy = queue.pop()
        else:
            found = False
            while ci < len(cand):
                sx, sy = cand[ci]; ci += 1
                if mask[int(sy), int(sx)] and far(sx, sy): found = True; break
            if not found and sepk[0] > 0.7:
                # second pass: fill the slivers where two families of lines meet, with shorter lines
                sepk[0] = 0.62; ci = 0
                cand = [(x, y) for y in np.arange(dsep / 4, H, dsep / 2) for x in np.arange(dsep / 4, W, dsep / 2)]
                continue
            if not found: break
        if not (0 <= sx < W - 1 and 0 <= sy < H - 1) or not mask[int(sy), int(sx)] or not far(sx, sy): continue
        lid = len(lines)
        pts = trace(sx, sy, lid)
        if len(pts) * step < minlen:
            continue
        commit(pts, lid)
        lines.append(pts)
        for (x, y) in pts[::max(1, int(dsep / step / 2))]:
            vx, vy = bil(fx, x, y), bil(fy, x, y)
            queue.append((x - vy * dsep, y + vx * dsep)); queue.append((x + vy * dsep, y - vx * dsep))
    return lines


def polys(lines, wfun, wmin=0.22, sub=2):
    """variable-width ribbons, split where the line thins out"""
    out = []
    for pts in lines:
        pts = pts[::sub] if len(pts) > 4 else pts
        P = np.array(pts, dtype=np.float32)
        if len(P) < 3: continue
        d = np.gradient(P, axis=0); n = np.linalg.norm(d, axis=1, keepdims=True) + 1e-9; d /= n
        nrm = np.stack([-d[:, 1], d[:, 0]], 1)
        w = np.array([wfun(x, y) for x, y in P], dtype=np.float32)
        on = w > wmin
        i = 0
        while i < len(P):
            if not on[i]: i += 1; continue
            j = i
            while j < len(P) and on[j]: j += 1
            if j - i >= 2:
                seg = P[i:j]; ww = w[i:j].copy()
                # taper the ends to a point, the way a burin enters and leaves
                ww[0] *= 0.25; ww[-1] *= 0.25
                L = seg + nrm[i:j] * (ww[:, None] / 2); R = seg - nrm[i:j] * (ww[:, None] / 2)
                ring = np.concatenate([L, R[::-1]])
                s = "M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in ring) + "Z"
                out.append(s)
            i = j
    return out


def lines_d(lines, sub=3):
    return ["M" + "L".join(f"{x:.1f} {y:.1f}" for x, y in pts[::sub]) for pts in lines if len(pts) > 6]



import base64, struct
def enc_lines(lines, sub=2):
    """centrelines: [u16 n] then per line [u16 m][i16 x0*4][i16 y0*4] + (m-1)*[i8 dx*4][i8 dy*4]; returns (b64, resampled lines)"""
    out = bytearray(struct.pack("<H", 0)); kept = []
    for pts in lines:
        P = pts[::sub]
        if len(P) < 3: continue
        q = [(int(round(x * 4)), int(round(y * 4))) for x, y in P]
        body = bytearray(struct.pack("<Hhh", len(q), q[0][0], q[0][1])); ok = True
        cx, cy = q[0]; R = [(cx / 4, cy / 4)]
        for (x, y) in q[1:]:
            dx, dy = x - cx, y - cy
            if not (-127 <= dx <= 127 and -127 <= dy <= 127): ok = False; break
            body += struct.pack("<bb", dx, dy); cx += dx; cy += dy; R.append((cx / 4, cy / 4))
        if not ok: continue
        out += body; kept.append(R)
    struct.pack_into("<H", out, 0, len(kept))
    return base64.b64encode(bytes(out)).decode(), kept
def enc_w(kept, wfun):
    b = bytearray()
    for R in kept:
        for (x, y) in R: b.append(max(0, min(255, int(round(wfun(x, y) * 40)))))
    return base64.b64encode(bytes(b)).decode()


def main():
    t0 = time.time()
    rgb2, lum2 = load("PRD_AW_02_open-head-black.png")
    rgb4, lum4 = load("PRD_AW_04_motion-black.png")
    res = {"cut": {"cx": CX, "cy": CY, "rx": RX, "ry": RY}}

    # ---------------- Wang: the face and hair below the cut ----------------
    person = ndi.gaussian_filter(lum2, 1.5) > 0.012
    person = ndi.binary_closing(person, iterations=4); person = ndi.binary_fill_holes(person)
    below = yy > (front_y(xx) + 3.0)
    below &= ~in_ellipse(xx, yy, 6.0)
    below &= yy > 150 * K
    face_mask = person & below
    # remove the art's blue glow spill below the rim
    face_mask &= ~((rgb2[..., 2] > rgb2[..., 0] + 0.08) & (lum2 > 0.05))
    fx, fy = field(lum2, sig_t=22.0, base=np.deg2rad(-6.0), mix=FMIX, sig_i=13.0, sig_f=16.0)
    dsep = 4.2
    L = trace_all(fx, fy, face_mask, dsep, dtest_k=DTK)
    print("face lines", len(L), time.time() - t0)

    # tone: levels on the art, eyes/brows swapped to 04 through a soft mask
    # the source art carries a generator crease across the forehead (src y ~433-446): heal it vertically before engraving
    band = np.zeros((H, W), np.float32); band[int(425 * K):int(452 * K), int(540 * K):int(700 * K)] = 1
    band = ndi.gaussian_filter(band, 6)
    def heal(l): return l * (1 - band) + ndi.gaussian_filter(l, (9, 1.5)) * band
    def tone(lum):
        t = ndi.gaussian_filter(heal(lum), 0.8)
        return np.clip((t - 0.035) / (0.82 - 0.035), 0, 1) ** 1.1
    T2, T4 = tone(lum2), tone(lum4)
    eyes = np.zeros((H, W), np.float32)
    for (ex, ey) in ((535 * K, 495 * K), (765 * K, 478 * K)):
        eyes += ((xx - ex) / (115 * K)) ** 2 + ((yy - ey) / (62 * K)) ** 2 <= 1
    eyes = np.clip(ndi.gaussian_filter(eyes, 14), 0, 1)
    T4f = T2 * (1 - eyes) + T4 * eyes
    wmax = dsep * 0.72
    res["face_l"], kept = enc_lines(L)
    res["face_w02"] = enc_w(kept, lambda x, y: wmax * bil(T2, x, y))
    res["face_w04"] = enc_w(kept, lambda x, y: wmax * bil(T4f, x, y))
    res["face02"] = []; res["face04"] = []
    print("face polys", len(res["face02"]), len(res["face04"]), time.time() - t0)

    # second cut across the first, in the lights only (scratchboard adds light by crossing)
    rot = np.deg2rad(62.0)
    cx_ = fx * np.cos(rot) - fy * np.sin(rot); cy_ = fx * np.sin(rot) + fy * np.cos(rot)
    Tl = ndi.gaussian_filter(T2, 2.0)
    Lx = trace_all(cx_.astype(np.float32), cy_.astype(np.float32), face_mask & (Tl > 0.60), dsep * 1.6)
    res["cross_l"], kept = enc_lines(Lx)
    res["cross_w"] = enc_w(kept, lambda x, y: 1.8 * max(0.0, (bil(T2, x, y) - 0.62) / 0.38) ** 1.0)

    # hair: its own strands, a fine field that follows the locks, in the darks only
    S6 = ndi.gaussian_filter(lum2, 5.0)
    hair_mask = face_mask & (S6 < 0.16)
    hair_mask &= yy > 150 * K
    hx, hy = field(lum2, sig_t=6.0, base=np.deg2rad(-70.0), mix=1.0, sig_i=1.0, sig_f=5.0)
    Lh = trace_all(hx, hy, hair_mask, 3.4, minlen=22)
    Th = np.clip((ndi.gaussian_filter(lum2, 0.6) - 0.025) / (0.30 - 0.025), 0, 1) ** 0.8
    Th = Th * np.clip((0.15 - S6) / 0.05, 0, 1)        # strands only in the dark of the hair, never along the brow
    res["hair_l"], kept = enc_lines(Lh)
    res["hair_w"] = enc_w(kept, lambda x, y: 2.6 * bil(Th, x, y))

    # ---------------- Jolly: above the front of the cut ----------------
    def jolly(rgb, lum, orb):
        m = lum > 0.20
        m &= ~((rgb[..., 2] > rgb[..., 0] + 0.06))          # no blue glow, no orb
        m &= (rgb[..., 0] - rgb[..., 2]) > 0.07                # fur is warm; the art's grey rim is not
        ox, oy, orr = orb
        m &= ((xx - ox) ** 2 + (yy - oy) ** 2) > (orr + 4) ** 2
        m &= yy < front_y(xx) + 2
        m &= yy > 100 * K
        m &= (xx > CX - RX - 40) & (xx < CX + RX + 40)
        m = ndi.binary_opening(m, iterations=2)
        lab, n = ndi.label(m)
        if n > 1:
            sizes = ndi.sum(m, lab, range(1, n + 1)); m = lab == (int(np.argmax(sizes)) + 1)
        m = ndi.binary_closing(m, iterations=3); m = ndi.binary_fill_holes(m)
        jx, jy = field(lum, sig_t=24.0, base=np.deg2rad(-4.0), mix=0.3, sig_i=14.0, sig_f=18.0)
        Lj = trace_all(jx, jy, m, 3.8)
        T = np.clip((ndi.gaussian_filter(lum, 0.8) - 0.30) / (0.88 - 0.30), 0, 1) ** 1.25
        T = 0.18 + 0.82 * T   # fur is light: keep every line, carry the form in weight
        # the face: a smooth oval in the fur (low texture, light)
        sd = np.sqrt(np.clip(ndi.uniform_filter(lum * lum, 7) - ndi.uniform_filter(lum, 7) ** 2, 0, None))
        fm = m & (ndi.gaussian_filter(sd, 2.0) < 0.022) & (ndi.gaussian_filter(lum, 2) > 0.66)
        fm = ndi.binary_opening(fm, iterations=4)
        lab, n = ndi.label(fm)
        if n:
            sizes = ndi.sum(fm, lab, range(1, n + 1)); fm = lab == (int(np.argmax(sizes)) + 1)
        fm = ndi.binary_fill_holes(ndi.binary_closing(fm, iterations=6))
        soft = ndi.gaussian_filter(fm.astype(np.float32), 3.0)
        el, kept = enc_lines(Lj)
        p = {"l": el, "w": enc_w(kept, lambda x, y: 3.8 * (0.80 - 0.42 * bil(soft, x, y)) * bil(T, x, y))}
        # silhouette for the knock-out behind the lines
        sil = ndi.binary_dilation(m, iterations=3)
        return p, sil, m, fm

    orb2 = (631 * K, 307 * K, 37.5 * K)
    orb4 = (417 * K, 258 * K, 37.5 * K)
    res["orb02"] = orb2; res["orb04"] = orb4
    j2, s2, m2, fm2 = jolly(rgb2, lum2, orb2)
    j4, s4, m4, fm4 = jolly(rgb4, lum4, orb4)
    res["jolly02"] = j2; res["jolly04"] = j4
    print("jolly", len(j2), len(j4), time.time() - t0)

    # silhouettes as traced outlines (marching squares via skimage)
    from skimage import measure
    def sil_path(m, smooth=1.2, tol=0.8):
        f = ndi.gaussian_filter(m.astype(np.float32), smooth)
        cs = measure.find_contours(f, 0.5)
        out = []
        for c in cs:
            if len(c) < 30: continue
            c = measure.approximate_polygon(c, tol)
            out.append("M" + "L".join(f"{p[1]:.1f} {p[0]:.1f}" for p in c) + "Z")
        return " ".join(out)
    res["jolly02_sil"] = sil_path(s2); res["jolly04_sil"] = sil_path(s4)
    # drawn contours: Jolly's outline and the oval of his face
    res["jolly02_line"] = sil_path(m2, 3.2, 0.6); res["jolly04_line"] = sil_path(m4, 3.2, 0.6)
    res["jolly02_face"] = sil_path(fm2, 3.0, 0.6); res["jolly04_face"] = sil_path(fm4, 3.0, 0.6)
    # Wang's silhouette (for the ground's gap)
    res["wang_sil"] = sil_path(ndi.binary_dilation(person & (yy > front_y(xx) - 10) | in_ellipse(xx, yy, 0), iterations=2), 3.0, 1.2)

    json.dump(res, open(OUT, "w"))
    print("done", time.time() - t0)


if __name__ == "__main__":
    main()
