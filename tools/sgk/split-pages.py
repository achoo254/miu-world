"""Split the scanned textbooks (tập 1 and tập 2 of both books) into one-page PDFs for reading.

Run with the skills venv (it has pypdf): ~/.claude/skills/.venv/bin/python3 tools/sgk/split-pages.py

The books come from the owner's iCloud Drive through `pnpm private:sync`, which puts them in .data/sgk/src/<book>.pdf
(gitignored) after checking their hash (tools/private/private-files.json). Output: pages/<prefix>-NNN.pdf where NNN is the
PDF page number (printed page number + 1).
"""

import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter

BOOKS = {
    "toan2-t1": ("toan", 141),
    "tv2-t1": ("tv", 145),
    "toan2-t2": ("toan-t2", 142),
    "tv2-t2": ("tv-t2", 145),
}
ROOT = Path(__file__).resolve().parents[2] / ".data" / "sgk"
SRC = ROOT / "src"
PAGES = ROOT / "pages"
# The file reader refuses files over 2 MB; heavier pages get their scans re-encoded as JPEG.
MAX_PAGE_BYTES = 1_900_000


def book_file(book_id: str) -> Path:
    book = SRC / f"{book_id}.pdf"
    if not book.exists():
        sys.exit(f"{book} is missing. Run `pnpm private:sync` to copy the textbooks from iCloud Drive.")
    return book


def split(book: Path, prefix: str, expected_pages: int) -> int:
    reader = PdfReader(book)
    count = len(reader.pages)
    if count != expected_pages:
        sys.exit(f"{book.name}: expected {expected_pages} pages, found {count}")
    for index, page in enumerate(reader.pages, start=1):
        out = PAGES / f"{prefix}-{index:03d}.pdf"
        if out.exists() and out.stat().st_size > 0:
            continue
        write_page(page, out)
    return count


def write_page(page, out: Path) -> None:
    writer = PdfWriter()
    writer.add_page(page)
    with out.open("wb") as f:
        writer.write(f)
    quality = 85
    while out.stat().st_size > MAX_PAGE_BYTES and quality >= 40:
        writer = PdfWriter()
        copy = writer.add_page(page)
        for image in copy.images:
            image.replace(image.image.convert("RGB"), quality=quality)
        with out.open("wb") as f:
            writer.write(f)
        quality -= 15
    if out.stat().st_size > MAX_PAGE_BYTES:
        sys.exit(f"{out.name} is still over {MAX_PAGE_BYTES} bytes after re-encoding")


def main() -> None:
    PAGES.mkdir(parents=True, exist_ok=True)
    for book_id, (prefix, expected) in BOOKS.items():
        count = split(book_file(book_id), prefix, expected)
        print(f"{book_id}: {count} pages -> {PAGES}/{prefix}-NNN.pdf")


if __name__ == "__main__":
    main()
