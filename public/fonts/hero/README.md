# Hero title fonts

Course Pixel is a renamed, title-only subset of [Fusion Pixel](https://github.com/TakWolf/fusion-pixel-font/releases/tag/2026.10.25), using the 12px proportional TrueType WOFF2 release. It retains the original Simplified Chinese and Japanese glyph forms. All font licenses and upstream notices are preserved in `LICENSE.txt`.

The homepage uses these small local fonts for its heading. Body copy and tutorials retain their existing typefaces. Rebuild the subsets when a localized `Home.title` changes:

```sh
python -m pip install 'fonttools[woff]'
python scripts/brand/build-hero-fonts.py /path/to/fusion-pixel-font-12px-proportional-ttf.woff2-v2026.10.25.zip
```
