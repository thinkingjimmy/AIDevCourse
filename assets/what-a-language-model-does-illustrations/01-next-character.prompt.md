# Next-character prediction illustration

Generated with the built-in image_gen tool and the Ian Xiaohei illustration skill. The vision-pipeline illustration is a visual style reference only.

- Source image: [01-next-character.png](./01-next-character.png)
- Article asset: ../../public/images/courses/what-a-language-model-does/next-character.webp
- Placement: after the paragraph ending with the example output 「今」, before the paragraph explaining how 「今」 becomes part of the next input.
- Probability bars are illustrative and have no numerical values.

## Generation prompt

Use case: scientific-educational.
Asset type: ONE standalone 16:9 horizontal Chinese article illustration, for a beginner lesson's section "一、全自动文字接龙系统".
Primary request: illustrate ONE next-character prediction example: the question "今天广州的天气如何？" enters a language model, the model performs many calculations to produce candidate probabilities, and this particular generation outputs the single character "今".

Reference role: the attached image is a VISUAL STYLE REFERENCE ONLY. Match its sparse black hand-drawn pen strokes, pure clean white background, large readable handwritten Chinese labels, restrained orange process arrows, small blue annotations, and the recurring deadpan 小黑 creature: an irregular solid-black body, tiny white dot eyes, thin arms and legs, no cute face. Create new text-generation subject matter. Do not draw any image tiles, encoders, audio devices or objects from the reference.

Composition: a single coherent scene runs LEFT TO RIGHT across the middle of the 16:9 canvas, preferably 2048x1152. Keep the main scene around 50–60% of the canvas, with at least 35% blank white space, substantial calm space above and below, and generous safe margins. No formal panel layout.

LEFT: one simple paper strip or note, with the exact Chinese question "今天广州的天气如何？" clearly written. It may wrap across two lines without changing or omitting any characters. An ORANGE arrow carries it toward the central machine.
CENTER-LEFT: a low-tech open-sided calculation device with a few visibly interlocking gears, short linkages and simple unmarked dials, suggesting a series of calculations without a dense mathematical diagram. 小黑 is integrally operating this device, seriously turning its large side crank with both hands. Give the machine the concise handwritten label "模型计算". 小黑 must be necessary to the physical metaphor, not standing beside the scene. Do NOT draw a human brain, thought bubble, philosopher, conscious robot or an agent planning an answer.
CENTER-RIGHT: the machine emits three simple paper candidate slips on a small plain rack, stacked vertically and aligned, under the handwritten label "候选概率". Each slip shows ONE candidate Chinese character on its LEFT and a short horizontal probability bar to its RIGHT. Exact candidate labels, in this order from top to bottom: "今", "广", "明". In THIS illustrative instance, make the bar for "今" the longest; make the other two bars clearly shorter. Highlight "今" with a restrained small blue circle or blue ink, leaving other candidates in black. There must be NO percentages, numeric values, axes, scales, invented measurements or claims of a real model run. The bars show relative illustrative probabilities only. A tiny unlabelled ellipsis below may hint at other candidates, if useful.
RIGHT: one ORANGE selection arrow starts specifically from the highlighted "今" candidate slip and leads to a single large paper output tile containing EXACTLY the character "今". Above that output tile write "本次输出". This should make the precise result of this one example unmistakable. Output ONLY "今", never "今天", never the full sentence, never a weather report.
The two appearances of "今" are intentional: the selected candidate and the resulting output tile.

Exact visible Chinese text placements, eight total:
1. "今天广州的天气如何？"
2. "模型计算"
3. "候选概率"
4. "今" on the first candidate slip
5. "广" on the second candidate slip
6. "明" on the third candidate slip
7. "本次输出"
8. "今" on the final output tile

Scientific and editorial constraints: show the model calculating a distribution over possible next text units and THIS instance choosing 今. Do not write or imply a universal rule that every generation must select the maximum-probability candidate. Do not add the claim "永远选最高" or "总是选最高". The candidate bars are conceptual, not reported probabilities. Do not claim to know Guangzhou's real weather. This is a deliberate beginner character-level example: do not introduce new Token-ID labels, vocabulary IDs, tokenization internals, equations or long captions. Do not show subsequent rounds, an autoregressive return loop, the character 天, or a finished answer; a separate existing animation already explains continuation.

Visual DNA: pure white background, minimalist black hand-drawn line art with a gentle natural wobble, generous whitespace, subtle blue emphasis on the selected candidate, orange only for forward flow. One clean, slightly absurd product sketch with a serious working 小黑. Keep text large and legible in a 680px-wide article.
Avoid: top-left type title, overall title, footer, footnote, "示意", legend, explanatory paragraphs, dense PPT infographic, formal flowchart boxes, commercial vector art, cute mascot poster, children's illustration, gradients, shadows, paper texture, background noise, realistic interface screenshot, logo or watermark. Do not recreate the reference's original scene. One illustration only.
