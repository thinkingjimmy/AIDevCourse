# Vocabulary handwriting

`tracking-handwriting.woff2` is a local subset of [Xiaolai Regular v3.126](https://github.com/lxgw/kose-font/releases/tag/v3.126), distributed under the included SIL Open Font License. It covers the `lookHere` and `tryDraggingHere` annotations in all supported vocabulary languages.

Rebuild from the repository root after changing the annotation copy:

```sh
uv run --no-project --with 'fonttools[woff]' python src/components/vocabulary/annotations/build-font.py
```

The build checks glyph coverage before creating the WOFF2 subset. No remote font request is required when viewing the page.
