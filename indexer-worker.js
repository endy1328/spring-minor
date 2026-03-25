importScripts("./indexer.js");

self.onmessage = async (event) => {
  const { type, documents } = event.data || {};

  if (type !== "build-index") {
    return;
  }

  try {
    const index = await self.SpringMinerIndexer.buildIndex(documents || [], {
      onProgress: ({ completed, total, document }) => {
        self.postMessage({
          type: "progress",
          completed,
          total,
          document
        });
      }
    });

    self.postMessage({
      type: "done",
      index
    });
  } catch (error) {
    self.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error)
    });
  }
};
