type Widgets = {
  widgets: {
    createTweet(id: string, container: HTMLElement, options: { lang: string; dnt: boolean; theme: 'light'; align: 'center' }): Promise<HTMLElement | undefined>;
  };
};
declare global {
  interface Window { twttr?: Partial<Widgets> & { ready?: (callback: (api: Widgets) => void) => void } }
}

let loading: Promise<Widgets> | undefined;

export function loadXWidgets(): Promise<Widgets> {
  if (window.twttr?.widgets?.createTweet) return Promise.resolve(window.twttr as Widgets);
  if (loading) return loading;
  loading = new Promise<Widgets>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://platform.twitter.com/widgets.js';
    script.async = true;
    script.dataset.xWidgets = '';
    let settled = false;
    const timer = window.setTimeout(() => finish(), 10000);
    function finish(api?: Widgets) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
      if (api?.widgets?.createTweet) resolve(api);
      else {
        script.remove();
        reject(new Error('X widgets could not load'));
      }
    }
    function onLoad() {
      script.dataset.loaded = 'true';
      if (window.twttr?.widgets?.createTweet) finish(window.twttr as Widgets);
      else if (window.twttr?.ready) window.twttr.ready((api) => finish(api));
      else finish();
    }
    function onError() { finish(); }
    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);
    document.head.append(script);
  }).catch((error) => {
    loading = undefined;
    throw error;
  });
  return loading;
}
