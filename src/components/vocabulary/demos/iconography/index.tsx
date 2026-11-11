import type { IconographyTermId } from '@/lib/vocabulary/catalog';
import { StrokeWeightDemo, OpticalCentreDemo, CapStyleDemo, PixelHintingDemo } from './construction';
import { IconLibraryDemo, IconSizeSystemDemo, BreathingRoomDemo, UnifiedWeightDemo } from './systems';
import { FilledOutlinedDemo, MeaningCollisionDemo, ContextualSwapDemo, MetaphorAccuracyDemo } from './meaning';

export function IconographyDemo({ id }: { id: IconographyTermId }) {
  switch (id) {
    case 'stroke-weight': return <StrokeWeightDemo />;
    case 'optical-centre': return <OpticalCentreDemo />;
    case 'filled-vs-outlined': return <FilledOutlinedDemo />;
    case 'cap-style': return <CapStyleDemo />;
    case 'pixel-hinting': return <PixelHintingDemo />;
    case 'icon-library': return <IconLibraryDemo />;
    case 'icon-size-system': return <IconSizeSystemDemo />;
    case 'meaning-collision': return <MeaningCollisionDemo />;
    case 'contextual-swap': return <ContextualSwapDemo />;
    case 'breathing-room': return <BreathingRoomDemo />;
    case 'unified-weight': return <UnifiedWeightDemo />;
    case 'metaphor-accuracy': return <MetaphorAccuracyDemo />;
  }
}
