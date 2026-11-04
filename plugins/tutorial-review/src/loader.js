import { createPlugin } from './client.js';

window.__ModuleLoader__.load({
  id: '@local/dsh-tutorial-review',
  factory(require) {
    const React = require('react');
    return createPlugin(React);
  },
});
