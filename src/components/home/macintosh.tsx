const artwork = '/images/home/pixel-macintosh.svg';

export function Macintosh({ title, status }: { title?: string; status?: string }) {
  return (
    <svg className="pixel-macintosh" data-slot="home-macintosh" viewBox="19 14 165 181"
      width="165" height="181" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      <use href={`${artwork}#pixel-cable`} />
      <use href={`${artwork}#pixel-housing`} />
      <g data-slot="mac-screen">
        <use href={`${artwork}#pixel-screen`} />
        {title ? (
          <foreignObject x="59" y="48" width="71" height="51">
            <div className="pixel-screen-readout">
              <span className="pixel-screen-title">{title}</span>
              {status && <span className="pixel-screen-status">{status}</span>}
            </div>
          </foreignObject>
        ) : <use href={`${artwork}#pixel-screen-content`} />}
      </g>
      <use href={`${artwork}#pixel-drive-slot`} data-slot="mac-drive" />
      <use href={`${artwork}#pixel-badge`} />
      <use href={`${artwork}#pixel-keyboard`} />
      <use href={`${artwork}#pixel-mouse`} />
    </svg>
  );
}
