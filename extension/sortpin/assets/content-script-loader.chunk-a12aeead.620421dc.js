(function () {
  'use strict';

  (async () => {
    await import(
      /* @vite-ignore */
      chrome.runtime.getURL("assets/chunk-a12aeead.js")
    );
  })().catch(console.error);

})();
