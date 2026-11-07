import type { TypographyTermId } from '@/lib/vocabulary/catalog';
import { KerningDemo, TrackingDemo, LeadingDemo, OpticalKerningDemo, LineLengthDemo } from './spacing';
import { WeightDemo, XHeightDemo, CapHeightDemo, LigatureDemo, SmoothingDemo, FontStackDemo } from './letterforms';
import { TypeScaleDemo, OverflowDemo, HyphenationDemo, WidowDemo, OrphanDemo } from './layout';
import { TabularDemo, ScriptDemo } from './numbers';
import { ClampDemo } from './clamp';

export function TypographyDemo({ id }: { id: TypographyTermId }) {
  switch (id) {
    case 'kerning': return <KerningDemo />;
    case 'tracking': return <TrackingDemo />;
    case 'leading': return <LeadingDemo />;
    case 'optical-kerning': return <OpticalKerningDemo />;
    case 'tabular-nums': return <TabularDemo />;
    case 'type-scale': return <TypeScaleDemo />;
    case 'weight': return <WeightDemo />;
    case 'x-height': return <XHeightDemo />;
    case 'cap-height': return <CapHeightDemo />;
    case 'ligature': return <LigatureDemo />;
    case 'font-smoothing': return <SmoothingDemo />;
    case 'text-overflow': return <OverflowDemo />;
    case 'hyphenation': return <HyphenationDemo />;
    case 'clamp': return <ClampDemo />;
    case 'widow': return <WidowDemo />;
    case 'orphan': return <OrphanDemo />;
    case 'font-stack': return <FontStackDemo />;
    case 'line-length': return <LineLengthDemo />;
    case 'variable-font': return <WeightDemo variable />;
    case 'superscript': return <ScriptDemo />;
    case 'subscript': return <ScriptDemo sub />;
  }
}
