import { BrowserRouter, HashRouter } from 'react-router-dom';

/** The desktop offline entry is index.html#/ide, not a web-server path. */
export function appRouterForProtocol(protocol: string) {
  return protocol === 'file:' ? HashRouter : BrowserRouter;
}