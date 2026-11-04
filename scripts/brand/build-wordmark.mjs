import { writeFile } from 'node:fs/promises';

const glyphs = {
  A: ['0111110', '1100011', '1111111', '1100011', '1100011'],
  I: ['1111', '0110', '0110', '0110', '1111'],
  D: ['1111110', '1100011', '1100011', '1100011', '1111110'],
  E: ['1111111', '1100000', '1111100', '1100000', '1111111'],
  V: ['11000011', '11000011', '11000011', '01100110', '00111100'],
  C: ['0111111', '1100000', '1100000', '1100000', '0111111'],
  O: ['01111110', '11000011', '11000011', '11000011', '01111110'],
  U: ['11000011', '11000011', '11000011', '11000011', '01111110'],
  R: ['1111110', '1100011', '1111110', '1100110', '1100011'],
  S: ['0111111', '1100000', '0111110', '0000011', '1111110'],
};
const color = '#31564b';
const cellWidth = 12;
const cellHeight = 24;
const margin = 3;
const depthX = 2.7;
const depthY = 4.5;
const cells = [];
let columnOffset = 0;
let outline = '';

for (const letter of 'AIDEVCOURSE') {
  const rows = glyphs[letter];
  const filled = (column, row) => rows[row]?.[column] === '1';
  for (let row = 0; row < rows.length; row++) {
    for (let column = 0; column < rows[row].length; column++) {
      if (!filled(column, row)) continue;
      const x = (columnOffset + column) * cellWidth + margin;
      const y = row * cellHeight + margin;
      cells.push({ x, y });
      // Internal cell edges belong to the grid, not the offset contours.
      if (!filled(column, row - 1)) outline += `M${x} ${y}h${cellWidth}`;
      if (!filled(column + 1, row)) outline += `M${x + cellWidth} ${y}v${cellHeight}`;
      if (!filled(column, row + 1)) outline += `M${x} ${y + cellHeight}h${cellWidth}`;
      if (!filled(column - 1, row)) outline += `M${x} ${y}v${cellHeight}`;
    }
  }
  columnOffset += rows[0].length + 1;
}

const width = (columnOffset - 1) * cellWidth + margin * 2 + depthX * 3;
const height = 5 * cellHeight + margin * 2 + depthY * 3;
const face = cells.map(({ x, y }) => `M${x} ${y}h${cellWidth}v${cellHeight}h-${cellWidth}Z`).join('');
const contours = [3, 2, 1].map(layer =>
  `    <use href="#wordmark-contour" transform="translate(${depthX * layer} ${depthY * layer})"/>`).join('\n');
const grid = cells.map(({ x, y }) =>
  `    <rect x="${x}" y="${y}" width="${cellWidth}" height="${cellHeight}"/>`).join('\n');

// The continuous face prevents bright seams when the cell grid is scaled down.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="wordmark-title wordmark-description">
  <title id="wordmark-title">AIDevCourse</title>
  <desc id="wordmark-description">Forest green block lettering with three offset outlines.</desc>
  <defs><path id="wordmark-contour" d="${outline}"/></defs>
  <g fill="none" stroke="${color}" stroke-width="1.35" stroke-linecap="square">
${contours}
  </g>
  <g fill="${color}" stroke="#ffffff" stroke-opacity="0.18" stroke-width="0.45">
    <path d="${face}" stroke="none"/>
${grid}
  </g>
</svg>
`;
await writeFile(new URL('../../public/images/brand/wordmark.svg', import.meta.url), svg);
console.log('Updated the forest green SVG wordmark.');
