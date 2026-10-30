export type MessageEvent = {
  from: number;
  to: number;
  label: string;
  caption: string;
  message: string;
  format?: 'invalid' | 'valid';
  error?: boolean;
  response?: boolean;
  duration?: number;
};

export const requestExample = ['{', '  "model": "example-model",', '  "messages": [{ "role": "user",', '    "content": "你好，我叫 Jimmy。" }]', '}'].join('\n');
export const responseExample = JSON.stringify({ message: { role: 'assistant', content: 'Jimmy，你好！' } }, null, 2);

export const attempts: readonly (readonly MessageEvent[])[] = [
  [
    { from: 0, to: 1, label: '输入消息', caption: '第一次尝试 · 格式不符', message: '你好，我叫 Jimmy。' },
    { from: 1, to: 2, label: '直接发送文本', format: 'invalid', caption: '缺少约定的请求结构', message: '你好，我叫 Jimmy。' },
    { from: 2, to: 1, label: '拒绝：格式不符', error: true, caption: '服务器返回格式错误', message: '请求未通过格式检查，模型程序没有被调用。', duration: 2300 },
    { from: 1, to: 0, label: '显示错误', caption: '第一次尝试失败', message: '产品收到了错误信息，没有生成模型回复。', duration: 2600 },
  ],
  [
    { from: 0, to: 1, label: '再次发送消息', caption: '第二次尝试 · 按约定格式', message: '同一句消息：你好，我叫 Jimmy。' },
    { from: 1, to: 2, label: '按约定格式发送', format: 'valid', caption: '按约定包含 model 与 messages', message: '请求中包含模型名称、消息角色与消息内容。', duration: 2600 },
    { from: 2, to: 3, label: '传入消息，调用模型', caption: '请求格式通过检查', message: '服务器将消息内容交给模型程序。' },
    { from: 3, to: 2, label: '生成回复', caption: '模型生成回复', message: 'Jimmy，你好！' },
    { from: 2, to: 1, label: '返回回复（JSON）', response: true, caption: '服务器将 JSON 返回产品', message: '回复内容：Jimmy，你好！' },
    { from: 1, to: 0, label: '显示回复', caption: '第二次尝试成功', message: 'Jimmy，你好！', duration: 2000 },
  ],
];

export const playbackEvents = attempts.flat();
export const firstAttemptLength = attempts[0].length;
