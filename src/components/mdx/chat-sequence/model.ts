export type MessageEvent = {
  from: number;
  to: number;
  key: string;
  format?: 'invalid' | 'valid';
  error?: boolean;
  response?: boolean;
  duration?: number;
};

export const attempts: readonly (readonly MessageEvent[])[] = [
  [
    { from: 0, to: 1, key: 'input' },
    { from: 1, to: 2, key: 'raw', format: 'invalid' },
    { from: 2, to: 1, key: 'reject', error: true, duration: 2300 },
    { from: 1, to: 0, key: 'error', duration: 2600 },
  ],
  [
    { from: 0, to: 1, key: 'retry' },
    { from: 1, to: 2, key: 'request', format: 'valid', duration: 2600 },
    { from: 2, to: 3, key: 'invoke' },
    { from: 3, to: 2, key: 'generate' },
    { from: 2, to: 1, key: 'response', response: true },
    { from: 1, to: 0, key: 'display', duration: 2000 },
  ],
];

export const playbackEvents = attempts.flat();
export const firstAttemptLength = attempts[0].length;
