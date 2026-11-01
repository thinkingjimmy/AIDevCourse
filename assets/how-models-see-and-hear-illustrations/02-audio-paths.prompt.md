# Audio input paths illustration

Generated with the built-in image_gen tool and the Ian Xiaohei illustration skill. The vision-pipeline illustration is a style reference only.

- Source image: [02-audio-paths.png](./02-audio-paths.png)
- Article asset: ../../public/images/courses/how-models-see-and-hear/audio-paths.webp
- Placement: before the two audio-path subsections in how-models-see-and-hear.mdx.

## Generation prompt

Use case: scientific-educational.
Asset type: ONE 16:9 horizontal Chinese article illustration for "三、模型是如何听声音的？".
Primary request: compare TWO common ways a product handles the SAME audio recording: (1) transcribe speech and give only the transcript to a language model; (2) encode audio as numerical features and give those features together with a separate written instruction to an audio-capable model. Make the difference in information received unmistakable.

Reference role: the attached vision illustration is a VISUAL STYLE REFERENCE ONLY. Match the spare black hand-drawn pen lines, pure clean white background, readable handwritten Chinese labels, restrained orange arrows and blue annotations, and deadpan solid-black 小黑 creature with tiny white dot eyes and thin limbs. Create completely NEW audio subject matter, not another image encoder or the same scene. Do not include any text from the reference.

Composition: one open, airy hand-drawn scene on a wide 16:9 canvas, ideally 2048x1152. Arrange TWO clearly separated horizontal paths, upper and lower, with ample white space between them. No enclosing panel frames, no large headings. Main drawings occupy about 55–60% of the canvas; at least 35% empty white space. Keep all labels large enough to remain clear when displayed at 680px width.

COMMON INPUT on the far LEFT, vertically centered between the two paths: one small simple audio recorder and an audio-waveform ribbon, with a tiny speech-bubble glyph and a small RED ringing-alarm glyph mixed into that same waveform. These two glyphs represent spoken words and background sound within a SINGLE recording. Use no written source label. From this ONE recording, two thin ORANGE arrows split, one toward the upper path and one toward the lower path. Do not draw two separate recordings.

UPPER PATH, left to right: 小黑 is an active transcriber at a small plain writing desk, seriously holding a pen and writing a short paper transcript. Label this desk "语音转文字". The transcript paper to its right reads EXACTLY "下周三" and contains NO alarm annotation. Show one small RED alarm glyph crossed out BELOW the transcript, with the compact red handwritten annotation "未写进转写". This is the specific information missing from THIS transcript, not a claim that every ASR product must always omit sound annotations. An ORANGE arrow leads from the paper transcript into a modest plain hand-drawn open box on the far right labeled "语言模型". ONLY the transcript enters this upper model box. No waveform, no alarm, no audio feature vectors, and no blue written-instruction arrow enter the UPPER box. The visual lesson is that a model cannot use background sound not included in the transcript it received.

LOWER PATH, left to right: the SAME source waveform enters a simple low-tech reel-and-dial audio encoding device. A second 小黑 seriously threads the waveform ribbon through this device and turns its dial, making the audio-to-features conversion the character's core physical action. Label the device "音频编码器". It emits a short group of TWO OR THREE feature strips with sparse numerical vectors such as [0.2, -0.7, ...] and [0.8, 0.1, ...], labeled "音频特征". These strips contain NUMBERS, not words, not a transcript and not a literal alarm sentence. An ORANGE arrow carries these numerical features into a SECOND plain hand-drawn open box at the far right, aligned vertically beneath the upper box, also labeled "语言模型". Above THIS LOWER box only, a separate little note marked exactly "文字指令" feeds into it with a short BLUE arrow. Clearly show TWO inputs at the lower box: encoded audio features AND the written instruction. The lower path must not pass through speech-to-text or a transcript.

Exact Chinese labels, eight visible text placements total:
1. "语音转文字"
2. "下周三"
3. "未写进转写"
4. "语言模型" on the UPPER box
5. "音频编码器"
6. "音频特征"
7. "文字指令"
8. "语言模型" on the LOWER box
Numeric vectors are allowed as specified. No other words, labels or text.

Scientific accuracy constraints: the upper model receives only this transcript; untranscribed alarm information never enters it. The lower model receives numerical audio features and a separate text instruction; it does NOT first get the sound converted to natural-language descriptions. Do not claim all audio information is perfectly retained or that interpretation is always correct. Do not depict an audio answer or a speaker at either model output; audio understanding does not by itself mean audio generation. The recorder is an input device, not a generated-audio output.

Style constraints: pure white; slightly wobbly black hand-drawn lines; restrained orange process arrows; blue only for secondary information or written-instruction input; red only for the alarm and missing-information emphasis. At most the eight short Chinese text placements above. No title, no footer, no "示意", no explanatory footnote, no legend, no extra captions. No paper texture, gradients, shadows, background noise, realistic screenshot, technology UI, stock-vector illustration, cute mascot, children's drawing, formal flowchart, dense PPT infographic, watermark, or logo. Do not copy prior known compositions. This is one coherent comparison image, not a collage of separate pictures.
