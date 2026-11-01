# Vision pipeline illustration

Generated with the built-in image_gen tool. The original PNG is retained as a source variant. The final PNG applies the requested footnote removal; the WebP in public/images/courses/how-models-see-and-hear is the article asset.

## Generation prompt

Use case: scientific-educational
Asset type: one 16:9 horizontal Chinese article illustration for section "二、模型是如何看图的？" in a beginner lesson about multimodal models.
Primary request: clearly explain one common vision-language pipeline: an image is divided into regions while retaining spatial information; a visual encoder converts visual information into numerical feature vectors; a language model uses these features together with a separate written question to generate an answer.

Visual DNA: pure white background, sparse black hand-drawn pen lines with a slight natural wobble, generous empty white space, small restrained orange arrows, blue secondary notes, one small red emphasis. An intelligent editorial product sketch, serious and a little absurd. No gradient, no shadow, no paper texture, no realistic screenshot, no commercial vector art, no cute children's cartoon, no slide or infographic template. No title at the top-left. Landscape canvas exactly 16:9, preferably 2048 by 1152.

Composition: one continuous scene across the middle of the wide canvas, not boxed panels. Leave substantial whitespace above and below, at least 35% overall.
LEFT: a very simple hand-drawn interface screenshot on a sheet, with a large enough bottom-right rectangular button reading exactly "提交". Overlay a loose 3 by 3 image-region grid and gently lift two or three tiles in place; the picture is still recognizable as one whole image, and the bottom-right button remains in its original spatial location. Under the sheet write "分块，保留位置". This must convey image patches, NOT individual pixels.
MIDDLE: the picture tiles enter a modest mechanical hand-cranked press, the metaphor for the visual encoder. The character 小黑 is the integral operator: a small irregular solid-black body, two tiny white dot eyes, thin stick legs and arms, deadpan expression; its arm is visibly turning the crank that converts image information into numeric strips. Label the press "视觉编码器". Several small strips emerge on the right with example numeric values such as [0.2, -0.7, ...] and [0.8, 0.1, ...], grouped together under the label "数字特征". Keep values sparse and clearly numerical, with no semantic words replacing the image information. The encoder does not emit a textual scene description.
RIGHT: these numeric strips flow with one restrained orange arrow into a simple unembellished hand-drawn open box marked "语言模型". A separate question note above the box reads exactly "右下角写了什么？"; a short blue arrow points from this note into the same box, visibly showing the second input. To the right, one small response bubble connected to the box reads exactly "按钮写着“提交”". The button text in the original screenshot and answer MUST match.

Small blue handwritten footnote centered low in the scene: "一种常见方案（示意）".
There should be exactly these eight Chinese text items, no extra captions or headings:
"提交"
"分块，保留位置"
"视觉编码器"
"数字特征"
"右下角写了什么？"
"语言模型"
"按钮写着“提交”"
"一种常见方案（示意）"

Typography: readable Chinese handwritten-style lettering, large enough to remain legible in a 760-pixel-wide article. Labels are brief and carefully spaced; avoid cramped fine print. Numeric feature strips may use simple pen numerals.
Constraints: technical sequence must be accurate and immediately readable. Preserve both image information and written question as separate inputs at the language model. Do not imply all models use exactly this architecture. Do not show image patches mapped one-to-one to Chinese characters or vocabulary token IDs. Do not draw an OCR-first or image-to-text intermediate stage. Do not add a tokenizer, neural-network spaghetti, server racks, source code, formulas, people, logos, watermarks, or a decorative character. 小黑 actively operates the central encoding action, not standing aside. Invent this specific press metaphor from this article. One illustration only.

## Final edit prompt

Edit the provided full-width Chinese article illustration with one precise change only: completely remove the blue handwritten footnote "一种常见方案（示意）" at the bottom center of the image, including all its blue strokes and parentheses. Fill only that footnote area with the matching clean white background. Leave the resulting bottom area empty. Preserve everything else exactly: the original 16:9 canvas and dimensions, layout, every black line, the hand-drawn screenshot and its button marked "提交", the orange patch grid and arrows, 小黑 turning the crank, the visual encoder, all numeric feature strips, the blue question and arrow above the language model, the language-model box, every other Chinese label and the answer bubble, the drawing style and all positions. Do not crop, scale, recompose, redraw, add any text, or replace the removed footnote with anything.
