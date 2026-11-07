"""Build the local handwriting subset used by vocabulary annotations."""

import json
from io import BytesIO
from pathlib import Path
from urllib.request import Request, urlopen

from fontTools import subset
from fontTools.ttLib import TTFont


VERSION = "v3.126"
FONT_URL = f"https://github.com/lxgw/kose-font/releases/download/{VERSION}/Xiaolai-Regular.ttf"
LICENSE_URL = f"https://raw.githubusercontent.com/lxgw/kose-font/{VERSION}/OFL.txt"
DIRECTORY = Path(__file__).resolve().parent
ROOT = DIRECTORY.parents[3]


def download(url):
    request = Request(url, headers={"User-Agent": "aidevcourse-font-assets"})
    with urlopen(request, timeout=90) as response:
        return response.read()


def main():
    labels = [
        json.loads(path.read_text())["lookHere"]
        for path in sorted((ROOT / "src/messages/vocabulary").glob("*.json"))
    ]
    characters = set(" ".join(labels))
    font = TTFont(BytesIO(download(FONT_URL)))
    missing = characters.difference(map(chr, font.getBestCmap()))
    if missing:
        raise ValueError(f"Missing annotation glyphs: {sorted(missing)}")

    options = subset.Options()
    options.flavor = "woff2"
    options.name_IDs = ["*"]
    options.name_languages = ["*"]
    options.name_legacy = True
    builder = subset.Subsetter(options=options)
    builder.populate(text="".join(sorted(characters)))
    builder.subset(font)
    font.flavor = "woff2"
    target = DIRECTORY / "tracking-handwriting.woff2"
    font.save(target)
    (DIRECTORY / "OFL.txt").write_bytes(download(LICENSE_URL))
    print(f"Saved {target.name}: {target.stat().st_size} bytes, {len(characters)} characters")


if __name__ == "__main__":
    main()
