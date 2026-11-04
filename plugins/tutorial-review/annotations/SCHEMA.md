# Tutorial review annotation schema

Each file mirrors a tutorial below `content/zh`, with `.mdx` replaced by `.json`.

```json
{
  "path": "llm-101/model-fundamentals/what-is-a-token",
  "reviewedAt": "2026-11-04",
  "annotations": [
    {
      "id": "short-stable-slug",
      "quote": "exactly the rendered plain text, no Markdown markers",
      "category": "表述过宽",
      "comment": "Why the claim is imprecise and a more reasonable formulation."
    }
  ]
}
```

Rules:

- `quote` must be copied from the tutorial as rendered text. Do not include `**`, `==`, backticks, link syntax, or JSX tags.
- Prefer a complete clause or sentence, 15–90 Chinese characters. It must occur verbatim and only once on the page.
- `comment` explains the problem and the reasonable correction. It must be self-contained, 60–220 Chinese characters, and avoid inventing facts.
- 1–3 annotations per substantial lesson. Do not annotate a lesson with nothing substantive to say.
- `category` is one of: 表述过宽, 因果简化, 概念混用, 缺少前提, 数据待核, 类比局限, 绝对化, 术语不准.
- Do not modify any file under `content/`.
