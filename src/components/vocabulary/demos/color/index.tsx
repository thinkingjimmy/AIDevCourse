import type { ColorTermId } from '@/lib/vocabulary/catalog';
import { SrgbDemo, P3Demo, OklchDemo } from './spaces';
import { SemanticTokenDemo, ContrastDemo, TintedNeutralDemo, SaturationDemo, ChromaDemo, GradientDemo } from './palettes';
import { AlphaDemo, VisibilityDemo, DarkModeDemo, BlendingDemo } from './layers';

export function ColorDemo({ id }: { id: ColorTermId }) {
  switch (id) {
    case 'srgb': return <SrgbDemo />;
    case 'p3': return <P3Demo />;
    case 'oklch': return <OklchDemo />;
    case 'alpha': return <AlphaDemo />;
    case 'semantic-token': return <SemanticTokenDemo />;
    case 'contrast-ratio': return <ContrastDemo />;
    case 'tinted-neutral': return <TintedNeutralDemo />;
    case 'saturation': return <SaturationDemo />;
    case 'chroma': return <ChromaDemo />;
    case 'gradient': return <GradientDemo />;
    case 'opacity-vs-visibility': return <VisibilityDemo />;
    case 'dark-mode': return <DarkModeDemo />;
    case 'blending': return <BlendingDemo />;
  }
}
