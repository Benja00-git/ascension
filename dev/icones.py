#!/usr/bin/env python3
"""Génère les icônes de l'appli (PNG) dans docs/icones/. Nécessite Pillow.

Usage : py dev/icones.py
"""
import math
import os

from PIL import Image, ImageDraw, ImageFilter

RACINE = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
SORTIE = os.path.join(RACINE, "docs", "icones")
T = 1024  # taille de travail (suréchantillonnée), réduite ensuite

FOND_HAUT = (16, 38, 86)
FOND_BAS = (4, 6, 13)
LUEUR = (92, 200, 255)


def fond():
    """Dégradé radial bleu nuit, plus clair vers le haut."""
    image = Image.new("RGB", (T, T), FOND_BAS)
    pixels = image.load()
    cx, cy, portee = T * 0.5, T * 0.18, T * 0.95
    for y in range(T):
        for x in range(T):
            d = min(1.0, math.hypot(x - cx, y - cy) / portee)
            k = (1 - d) ** 1.6
            pixels[x, y] = tuple(round(FOND_BAS[i] + (FOND_HAUT[i] - FOND_BAS[i]) * k) for i in range(3))
    return image


def hexagone(c, r):
    return [(c + r * math.cos(math.radians(a)), c + r * math.sin(math.radians(a))) for a in range(-90, 270, 60)]


def trait(dessin, points, largeur, couleur):
    dessin.line(points, fill=couleur, width=largeur, joint="curve")
    rayon = largeur / 2
    for x, y in (points[0], points[-1]):
        dessin.ellipse((x - rayon, y - rayon, x + rayon, y + rayon), fill=couleur)


def motif(echelle):
    """Hexagone et chevrons, avec halo. `echelle` < 1 laisse une marge (icône « masquable »)."""
    calque = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    d = ImageDraw.Draw(calque)
    c = T / 2
    r = T * 0.40 * echelle
    pts = hexagone(c, r)
    d.polygon(pts, fill=(92, 200, 255, 22))
    d.line(pts + [pts[0], pts[1]], fill=(120, 200, 255, 150), width=round(T * 0.016 * echelle), joint="curve")
    demi = T * 0.165 * echelle
    haut = T * 0.165 * echelle
    epais = round(T * 0.062 * echelle)
    for i, (dy, alpha) in enumerate(((-0.125, 255), (0.015, 255), (0.155, 120))):
        y = c + T * dy * echelle
        larg = demi if i < 2 else demi * 0.62
        ht = haut if i < 2 else haut * 0.62
        trait(d, [(c - larg, y + ht / 2), (c, y - ht / 2), (c + larg, y + ht / 2)], epais, LUEUR + (alpha,))
    halo = calque.filter(ImageFilter.GaussianBlur(T * 0.035))
    return Image.alpha_composite(halo, calque)


def icone(echelle=1.0):
    base = fond().convert("RGBA")
    return Image.alpha_composite(base, motif(echelle)).convert("RGB")


def main():
    os.makedirs(SORTIE, exist_ok=True)
    pleine = icone(1.0)
    for taille in (180, 192, 512):
        pleine.resize((taille, taille), Image.LANCZOS).save(os.path.join(SORTIE, f"icone-{taille}.png"), optimize=True)
    icone(0.74).resize((512, 512), Image.LANCZOS).save(os.path.join(SORTIE, "icone-masque-512.png"), optimize=True)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'
        '<rect width="64" height="64" rx="14" fill="#07101f"/>'
        '<path d="M32 6 54.500 19v26L32 58 9.500 45V19z" fill="#5cc8ff" fill-opacity=".1" stroke="#78c8ff" stroke-opacity=".6" stroke-width="1.5"/>'
        '<g fill="none" stroke="#5cc8ff" stroke-width="4.200" stroke-linecap="round" stroke-linejoin="round">'
        '<path d="m21 30 11-11 11 11"/><path d="m21 39 11-11 11 11"/><path d="m25.500 46.500 6.500-6.500 6.500 6.500" stroke-opacity=".5"/>'
        "</g></svg>\n"
    )
    with open(os.path.join(SORTIE, "favicon.svg"), "w", encoding="utf-8", newline="\n") as f:
        f.write(svg)
    print("Icônes écrites dans", SORTIE)


if __name__ == "__main__":
    main()
