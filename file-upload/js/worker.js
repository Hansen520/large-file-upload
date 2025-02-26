importScripts("../node_modules/spark-md5/spark-md5.min.js");

self.onmessage = async (e) => {
  const spark = new SparkMD5.ArrayBuffer();

  spark.append(e.data.buffer);
  const HASH = spark.end();
  const suffix = /\.([a-zA-Z0-9]+)$/.exec(e.data.file.name)[1];
  postMessage({
    buffer: e.data.buffer,
    HASH,
    suffix,
    filename: `${HASH}.${suffix}`,
  });
};
