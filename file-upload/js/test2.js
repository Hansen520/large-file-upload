/*
 * @Date: 2025-02-26 15:44:19
 * @Description: description
 */
var worker = new Worker("./js/worker.js");

worker.postMessage("Hello World");

worker.onmessage = function (event) {
  console.log("Received message " + event.data);
};
