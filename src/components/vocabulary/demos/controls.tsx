'use client';
import { useEffect, useId, useState, type ReactNode } from 'react';
import { useFormatter, useTranslations } from 'next-intl';
import { Slider } from '@/components/ui/controls/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/controls/tabs';

type DemoProps = { children: ReactNode; controls?: ReactNode; note?: string };

export function usePreviewWidth(maximum: number) {
  const [element, setElement] = useState<HTMLDivElement | null>(null);
  const [available, setAvailable] = useState(maximum);
  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setAvailable(Math.min(maximum, Math.max(64, Math.floor(entry.contentRect.width))));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, maximum]);
  return { ref: setElement, available };
}

export function DemoFrame({ children, controls, note }: DemoProps) {
  return <div className="vocabulary-demo">
    <div className="vocabulary-stage">{children}</div>
    <div className="vocabulary-controls">{controls}</div>
    {note && <p className="vocabulary-note">{note}</p>}
  </div>;
}

export function DemoTabs<T extends string>({ label, value, options, onChange, children, controls, note }: DemoProps & {
  label: string; value: T; options: { value: T; label: string }[]; onChange: (value: T) => void;
}) {
  return <Tabs value={value} onValueChange={value => onChange(value as T)} className="vocabulary-demo gap-0">
    {options.map(option => <TabsContent key={option.value} value={option.value} className="min-w-0 data-[state=active]:flex data-[state=active]:flex-col">
      <div className="vocabulary-stage">{children}</div>
    </TabsContent>)}
    <div className="vocabulary-controls">
      <TabsList aria-label={label}>
        {options.map(option => <TabsTrigger key={option.value} value={option.value}>{option.label}</TabsTrigger>)}
      </TabsList>
      {controls}
    </div>
    {note && <p className="vocabulary-note">{note}</p>}
  </Tabs>;
}

export function ToggleDemo({ label, value, onChange, adjusted = false, ...props }: DemoProps & {
  label: string; value: boolean; onChange: (value: boolean) => void; adjusted?: boolean;
}) {
  const t = useTranslations('Vocabulary');
  return <DemoTabs {...props} label={label} value={value ? 'on' : 'off'} onChange={value => onChange(value === 'on')}
    options={[{ value: 'off', label: t(adjusted ? 'original' : 'off') }, { value: 'on', label: t(adjusted ? 'apply' : 'on') }]} />;
}

export function Range({ label, value, min, max, step = 1, unit = '', onChange }: {
  label: string; value: number; min: number; max: number; step?: number; unit?: string; onChange: (value: number) => void;
}) {
  const id = useId();
  const format = useFormatter();
  const display = `${format.number(value, { maximumFractionDigits: 2 })}${unit}`;
  return <div className="vocabulary-range">
    <div><span id={`${id}-label`}>{label}</span><output htmlFor={id}>{display}</output></div>
    <Slider min={min} max={max} step={step} value={[value]} className="min-h-8"
      thumbProps={{ id, 'aria-labelledby': `${id}-label`, 'aria-valuetext': display }}
      onValueChange={values => onChange(values[0])} />
  </div>;
}
