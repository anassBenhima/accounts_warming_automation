(function () {
  'use strict';

  (async () => {
    await import(
      /* @vite-ignore */
      chrome.runtime.getURL("assets/chunk-8e9e177b.js")
    );
  })().catch(console.error);

})();
