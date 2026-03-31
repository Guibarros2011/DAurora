#!/usr/bin/env python3
"""
gerar_tiles.py — Gera tiles JPEG a partir de uma imagem grande (JPEG, PNG, TIFF)
Uso: python gerar_tiles.py mapageral.jpg
"""

import sys, os, json, math, time, argparse

try:
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
except ImportError:
    print("Erro: pip install Pillow")
    sys.exit(1)

TILE_SIZE = 256

def calcular_niveis(w, h):
    n = 0
    while w > TILE_SIZE or h > TILE_SIZE:
        n += 1
        w = (w + 1) // 2
        h = (h + 1) // 2
    return n

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("arquivo")
    parser.add_argument("--pasta",     default="tiles")
    parser.add_argument("--qualidade", default=82, type=int)
    args = parser.parse_args()

    if not os.path.exists(args.arquivo):
        print(f"Arquivo nao encontrado: {args.arquivo}"); sys.exit(1)

    print(f"\n{'='*54}")
    print(f"  Gerador de Tiles - D'Aurora")
    print(f"  Entrada  : {args.arquivo}  ({os.path.getsize(args.arquivo)/1024/1024:.0f} MB)")
    print(f"  Saida    : {args.pasta}/")
    print(f"  Qualidade: {args.qualidade}%")
    print(f"{'='*54}\n")

    print("[1/4] Abrindo imagem...")
    t0 = time.time()
    img = Image.open(args.arquivo)
    img.load()
    if img.mode != "RGB":
        print(f"      Convertendo {img.mode} -> RGB...")
        img = img.convert("RGB")
    w_full, h_full = img.size
    print(f"      {w_full}x{h_full} px  ({time.time()-t0:.1f}s)")

    max_nivel = calcular_niveis(w_full, h_full)

    print(f"[2/4] Planejando...")
    total_tiles = 0
    for nivel in range(max_nivel + 1):
        scale = 2 ** nivel
        lw = max(1, math.ceil(w_full / scale))
        lh = max(1, math.ceil(h_full / scale))
        total_tiles += math.ceil(lw / TILE_SIZE) * math.ceil(lh / TILE_SIZE)
    print(f"      Niveis : 0 (completo) -> {max_nivel} (visao geral)")
    print(f"      Tiles  : {total_tiles} arquivos")

    os.makedirs(args.pasta, exist_ok=True)
    info = {"width": w_full, "height": h_full,
            "tileSize": TILE_SIZE, "maxLevel": max_nivel,
            "format": "jpeg", "quality": args.qualidade}
    with open(os.path.join(args.pasta, "info.json"), "w") as f:
        json.dump(info, f, indent=2)

    print(f"[3/4] Gerando tiles...")
    t0 = time.time()
    gerados = 0

    for nivel in range(max_nivel + 1):
        scale = 2 ** nivel
        lw = max(1, math.ceil(w_full / scale))
        lh = max(1, math.ceil(h_full / scale))
        cols = math.ceil(lw / TILE_SIZE)
        rows = math.ceil(lh / TILE_SIZE)

        img_nivel = img if nivel == 0 else img.resize((lw, lh), Image.LANCZOS)

        for col in range(cols):
            col_dir = os.path.join(args.pasta, str(nivel), str(col))
            os.makedirs(col_dir, exist_ok=True)
            for row in range(rows):
                x0, y0 = col * TILE_SIZE, row * TILE_SIZE
                x1, y1 = min(x0 + TILE_SIZE, lw), min(y0 + TILE_SIZE, lh)
                tile = img_nivel.crop((x0, y0, x1, y1))
                if tile.size != (TILE_SIZE, TILE_SIZE):
                    pad = Image.new("RGB", (TILE_SIZE, TILE_SIZE), (0, 0, 0))
                    pad.paste(tile, (0, 0))
                    tile = pad
                tile.save(os.path.join(col_dir, f"{row}.jpg"),
                          "JPEG", quality=args.qualidade, optimize=True)
                gerados += 1

        elapsed = time.time() - t0
        vel = gerados / elapsed if elapsed > 0 else 1
        eta = int((total_tiles - gerados) / vel)
        pct = gerados / total_tiles * 100
        print(f"      Nivel {nivel}/{max_nivel}  {gerados}/{total_tiles} ({pct:.0f}%)  ETA: {eta}s        ", end="\r")
        if nivel > 0:
            del img_nivel

    print(f"\n      Concluido em {time.time()-t0:.0f}s")

    tamanho = sum(os.path.getsize(os.path.join(r, f))
                  for r, _, files in os.walk(args.pasta) for f in files)
    print(f"\n[4/4] Pronto!")
    print(f"      {args.pasta}/  ({tamanho/1024/1024:.1f} MB, {total_tiles} tiles)")
    print(f"\n  Proximos passos:")
    print(f"  1. wrangler r2 object put-batch SEU-BUCKET/tiles/ --dir {args.pasta}/")
    print(f"  2. No admin, use: https://pub-xxx.r2.dev/tiles/info.json\n")

if __name__ == "__main__":
    main()
