const cutFile = (file) => {
    return new Promise((resolve) => {
      let chunkCount = Math.ceil(file.size / CHUNK_SIZE); // 得到应该上传的切片数量
      const threadChunkCount = Math.ceil(count / THREAD_COUNT); // 每个线程应该上传的切片数量
      const result = [];
      let finishCount = 0;
      for (let i = 0; i < THREAD_COUNT; i++) {
        /* * 创建一个线程，并分配任务 */
        const worker = new Worker("./worker.js", {
          type: "module",
        });
        let end = (i + 1) * threadChunkCount;
        if (end > chunkCount) {
          end = chunkCount;
        }
        worker.postMessage({
          file,
          CHUNK_SIZE,
          startChunkIndex: i * threadChunkCount,
          endChunkIndex: end,
        });
        worker.onmessage = (e) => {
          for (let i = start; i < end; i++) {
            result[i] = e.data[i - start];
          }
          worker.terminate();
          finishCount++;
          if (finishCount === THREAD_COUNT) {
            resolve(result);
          }
        };
      }
    });
  };