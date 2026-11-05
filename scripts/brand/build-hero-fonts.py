"""Subset the pinned Fusion Pixel release for the localized homepage titles.

Usage: python scripts/brand/build-hero-fonts.py /path/to/release.zip
Requires fonttools[woff]. Source: TakWolf/fusion-pixel-font, release 2026.10.25.
"""

import io
import json
import sys
import zipfile
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parents[2]
destination = root / "public/fonts/hero"
destination.mkdir(parents=True, exist_ok=True)
messages = {
    path.stem: json.loads(path.read_text())["Home"]["title"]
    for path in (root / "src/messages").glob("*.json")
}
with zipfile.ZipFile(sys.argv[1]) as archive:
    for variant, locales in {"zh_hans": ["en", "zh", "fr", "es"], "ja": ["ja"]}.items():
        font = TTFont(io.BytesIO(archive.read(f"fusion-pixel-12px-proportional-{variant}.ttf.woff2")))
        options = subset.Options()
        options.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]
        options.name_legacy = True
        subsetter = subset.Subsetter(options=options)
        subsetter.populate(text="".join(messages[locale] for locale in locales))
        subsetter.subset(font)
        family = "Course Pixel JP" if variant == "ja" else "Course Pixel"
        names = {1: family, 2: "Regular", 3: f"{family} 2026.10.25", 4: family, 6: family.replace(" ", "")}
        for record in font["name"].names:
            if record.nameID in names:
                record.string = names[record.nameID].encode(record.getEncoding())
        font.flavor = "woff2"
        font.save(destination / f"course-pixel-{variant}.woff2")
    licenses = [name for name in archive.namelist() if name.endswith(("OFL.txt", "LICENSE.txt"))]
    (destination / "LICENSE.txt").write_text("\n\n".join(
        f"{name}\n\n{archive.read(name).decode('utf-8')}" for name in licenses
    ))
