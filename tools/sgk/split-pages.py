"""Copy the two scanned textbooks out of iCloud and split them into one-page PDFs for reading.

Run with the skills venv (it has pypdf): ~/.claude/skills/.venv/bin/python3 tools/sgk/split-pages.py

Output lives in .data/sgk/ (gitignored): src/<book>.pdf + SHA256SUMS, pages/<prefix>-NNN.pdf where NNN is the
PDF page number (printed page number + 1). A later run checks the recorded hash before reusing a copy.
"""

import hashlib
import shutil
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter

ICLOUD = Path.home() / "Library/Mobile Documents/com~apple~CloudDocs"
BOOKS = {
    "toan2-t1": ("toan", "Sách giáo khoa Toán lớp 2 (tập 1) - bộ sách Kết nối tri thức với cuộc sống.pdf", 141),
    "tv2-t1": ("tv", "Sách giáo khoa Tiếng Việt lớp 2 (tập 1) - bộ sách Kết nối tri thức với cuộc sống.pdf", 145),
}
ROOT = Path(__file__).resolve().parents[2] / ".data" / "sgk"
SRC = ROOT / "src"
PAGES = ROOT / "pages"
SUMS = SRC / "SHA256SUMS"
# The file reader refuses files over 2 MB; heavier pages get their scans re-encoded as JPEG.
MAX_PAGE_BYTES = 1_900_000


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            digest.update(chunk)
    return digest.hexdigest()


def recorded_sums() -> dict[str, str]:
    if not SUMS.exists():
        return {}
    sums = {}
    for line in SUMS.read_text().splitlines():
        digest, name = line.split(maxsplit=1)
        sums[name] = digest
    return sums


def copy_book(book_id: str, filename: str, sums: dict[str, str]) -> Path:
    target = SRC / f"{book_id}.pdf"
    name = target.name
    if target.exists() and sums.get(name) == sha256(target):
        return target
    source = ICLOUD / filename
    if not source.exists() or source.stat().st_size == 0:
        sys.exit(
            f"{source} is missing or not downloaded from iCloud yet.\n"
            "Open it once in Finder (or choose 'Download Now') and run this script again."
        )
    shutil.copyfile(source, target)
    sums[name] = sha256(target)
    return target


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
    SRC.mkdir(parents=True, exist_ok=True)
    PAGES.mkdir(parents=True, exist_ok=True)
    sums = recorded_sums()
    for book_id, (prefix, filename, expected) in BOOKS.items():
        book = copy_book(book_id, filename, sums)
        SUMS.write_text("".join(f"{digest}  {name}\n" for name, digest in sorted(sums.items())))
        count = split(book, prefix, expected)
        print(f"{book_id}: {count} pages -> {PAGES}/{prefix}-NNN.pdf (sha256 {sums[book.name][:12]}…)")


if __name__ == "__main__":
    main()
