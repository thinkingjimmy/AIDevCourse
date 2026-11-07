import { resolveSiteEnvironment } from '../../config/site-environment.mjs';

export const site = {
  name: 'AIDevCourse',
  logo: '/images/brand/logo.svg',
  wordmark: '/images/brand/wordmark.svg',
  ...resolveSiteEnvironment(),
};

export const author = {
  name: 'Jimmy',
  avatar: '/images/jimmy-avatar.png',
  websiteUrl: 'https://jimmywong.dev',
  projectUrl: 'https://github.com/thinkingjimmy/aidevcourse',
  xUrl: 'https://x.com/thinkingjimmy',
  bilibiliUrl: 'https://space.bilibili.com/1409205119',
  xiaohongshuUrl: 'https://www.xiaohongshu.com/user/profile/6073d38d00000000010068a6',
  // Replace the placeholder when the QR image is available.
  wechatQrImage: '',
};
