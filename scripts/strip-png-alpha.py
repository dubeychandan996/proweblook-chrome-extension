#!/usr/bin/env python3
"""
Converts Chromium 32-bit RGBA PNG screenshots into strict 24-bit RGB PNG (colorType=2, no alpha)
as required by the Chrome Web Store uploader for Screenshots (1280x800) and Promo Tiles (440x280, 1400x560).
Uses only Python standard library (`struct`, `zlib`).
"""

import os
import struct
import zlib

PNG_SIG = b"\x89PNG\r\n\x1a\n"


def paeth(a: int, b: int, c: int) -> int:
    p = a + b - c
    pa = abs(p - a)
    pb = abs(p - b)
    pc = abs(p - c)
    if pa <= pb and pa <= pc:
        return a
    if pb <= pc:
        return b
    return c


def decode_png_to_rgb24(data: bytes) -> tuple[int, int, bytes]:
    assert data[:8] == PNG_SIG, "Invalid PNG signature"
    pos = 8
    width = height = bit_depth = color_type = 0
    idat_parts = []
    while pos < len(data):
        length = struct.unpack(">I", data[pos : pos + 4])[0]
        chunk_type = data[pos + 4 : pos + 8]
        chunk_data = data[pos + 8 : pos + 8 + length]
        pos += 12 + length
        if chunk_type == b"IHDR":
            width, height, bit_depth, color_type, _, _, _ = struct.unpack(">IIBBBBB", chunk_data)
        elif chunk_type == b"IDAT":
            idat_parts.append(chunk_data)
        elif chunk_type == b"IEND":
            break

    assert bit_depth == 8 and color_type in (2, 6), f"Unsupported PNG format: depth={bit_depth}, type={color_type}"
    bpp = 4 if color_type == 6 else 3
    raw = zlib.decompress(b"".join(idat_parts))
    stride = width * bpp

    prev_row = bytearray(stride)
    rgb_out = bytearray(width * height * 3)
    in_offset = 0
    out_offset = 0

    for _y in range(height):
        filt = raw[in_offset]
        in_offset += 1
        cur = bytearray(raw[in_offset : in_offset + stride])
        in_offset += stride

        if filt == 1:  # Sub
            for i in range(bpp, stride):
                cur[i] = (cur[i] + cur[i - bpp]) & 0xFF
        elif filt == 2:  # Up
            for i in range(stride):
                cur[i] = (cur[i] + prev_row[i]) & 0xFF
        elif filt == 3:  # Average
            for i in range(stride):
                left = cur[i - bpp] if i >= bpp else 0
                cur[i] = (cur[i] + ((left + prev_row[i]) >> 1)) & 0xFF
        elif filt == 4:  # Paeth
            for i in range(stride):
                left = cur[i - bpp] if i >= bpp else 0
                up = prev_row[i]
                up_left = prev_row[i - bpp] if i >= bpp else 0
                cur[i] = (cur[i] + paeth(left, up, up_left)) & 0xFF

        prev_row = cur
        if bpp == 3:
            rgb_out[out_offset : out_offset + width * 3] = cur
            out_offset += width * 3
        else:
            for x in range(width):
                r = cur[x * 4]
                g = cur[x * 4 + 1]
                b = cur[x * 4 + 2]
                a = cur[x * 4 + 3]
                if a == 255:
                    rgb_out[out_offset] = r
                    rgb_out[out_offset + 1] = g
                    rgb_out[out_offset + 2] = b
                else:
                    af = a / 255.0
                    rgb_out[out_offset] = int(round(r * af + 7 * (1 - af)))
                    rgb_out[out_offset + 1] = int(round(g * af + 11 * (1 - af)))
                    rgb_out[out_offset + 2] = int(round(b * af + 20 * (1 - af)))
                out_offset += 3

    return width, height, bytes(rgb_out)


def make_chunk(chunk_type: bytes, payload: bytes) -> bytes:
    crc = zlib.crc32(chunk_type + payload) & 0xFFFFFFFF
    return struct.pack(">I", len(payload)) + chunk_type + payload + struct.pack(">I", crc)


def encode_rgb24_png(width: int, height: int, rgb: bytes) -> bytes:
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)
    stride = width * 3
    rows = bytearray((stride + 1) * height)
    for y in range(height):
        rows[y * (stride + 1)] = 0
        start = y * stride
        rows[y * (stride + 1) + 1 : (y + 1) * (stride + 1)] = rgb[start : start + stride]
    idat = zlib.compress(bytes(rows), 9)
    return PNG_SIG + make_chunk(b"IHDR", ihdr) + make_chunk(b"IDAT", idat) + make_chunk(b"IEND", b"")


def main() -> None:
    root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    out_dir = os.path.join(root, "store-assets")
    names = [
        "screenshot-1-verify",
        "screenshot-2-pagescan",
        "screenshot-3-contextmenu",
        "screenshot-4-settings",
        "promo-small-440x280",
        "promo-marquee-1400x560",
    ]
    for name in names:
        src = f"/tmp/_cws_{name}.png"
        dst = os.path.join(out_dir, f"{name}.png")
        with open(src, "rb") as f:
            w, h, rgb = decode_png_to_rgb24(f.read())
        out_bytes = encode_rgb24_png(w, h, rgb)
        with open(dst, "wb") as f:
            f.write(out_bytes)
        os.remove(src)
        print(f"Wrote 24-bit RGB PNG: {name}.png ({w}x{h}, {len(out_bytes)} bytes)")


if __name__ == "__main__":
    main()
