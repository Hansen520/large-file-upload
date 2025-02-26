// 延迟函数
const delay = function delay(interval) {
  typeof interval !== "number" ? (interval = 1000) : null;
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, interval);
  });
};
/* 大文件上传 */
(function () {
  const upload = document.querySelector("#upload7"),
    upload_inp = upload.querySelector(".upload_inp"),
    upload_button_select = upload.querySelector(".upload_button.select"),
    upload_progress = upload.querySelector(".upload_progress"),
    upload_progress_value = upload_progress.querySelector(".value");

  /* 判断按钮是否可以点击 */
  const checkIsDisable = (element) => {
    let classList = element.classList;
    return classList.contains("disable") || classList.contains("loading");
  };

  /**
   * 传入文件对象,返回文件生成的HASH值,后缀,buffer,以HASH值为名的新文件名
   * @param file
   * @returns {Promise<unknown>}
   */
  const changeBuffer = (file) => {
    return new Promise((resolve) => {
      /* * 开启工作线程 */
      const worker = new Worker("./js/worker.js");
      let fileReader = new FileReader();
      fileReader.readAsArrayBuffer(file);
      fileReader.onload = (ev) => {
        // 定义变量
        const buffer = ev.target.result;
        worker.postMessage({ buffer, file });
        worker.onmessage = function (e) {
        const d = Date.now()
          resolve(e.data);
          console.log((Date.now() - d) / 1000)
          worker.terminate(); // 关闭工作线程
        };
      };
    });
  };

  /* * 触发原生的上传文件框(入口) */
  upload_button_select.addEventListener("click", function () {
    if (checkIsDisable(this)) return;
    upload_inp.click();
  });

  /* * 点击上传 */
  upload_inp.addEventListener("change", async function () {
    /* 获取文件对象 */
    const file = upload_inp.files[0];
    if (!file) return;
    /* * 将按钮变成 loading */
    upload_button_select.classList.add("loading");
    /* * 显示进度条 */
    upload_progress.style.display = "block";

    /* * 获取文件的HASH */
    let already = []; // 已经上传过的切片的切片名
    let data = null;
    /* * 得到原始文件的hash和后缀 */
    const { HASH, suffix } = await changeBuffer(file);

    /* * 获取已经上传的切片信息 */
    try {
      data = await instance.get("/upload_already", {
        params: {
          HASH,
        },
      });
      if (+data.code === 0) {
        already = data.fileList;
        
      }
    } catch (err) {}

    // 实现文件切片处理 「固定数量 & 固定大小」
    let CHUNK_SIZE = 1024 * 1024 * 100; // 切片大小先设置5MB
    let chunkCount = Math.ceil(file.size / CHUNK_SIZE); // 得到应该上传的切片数量

    let index = 0; // 存放切片数组的时候遍历使用
    let chunks = []; // 用以存放切片值

    /* * 对文件进行分片 */
    while (index < chunkCount) {
      //循环生成切片
      //index 0 =>  0~max
      //index 1 =>  max~max*2
      //index*max ~(index+1)*max
      chunks.push({
        file: file.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
        filename: `${HASH}_${index + 1}.${suffix}`,
      });
      index++;
    }

    index = 0;

    /* 清空进度条等交互信息 */
    const clear = () => {
      //上传完成后,将状态回归
      upload_button_select.classList.remove("loading");
      upload_progress.style.display = "none";
      upload_progress_value.style.width = "0%";
    };

    //每一次上传一个切片成功的处理[进度管控&切片合并]
    const complete = async () => {
      // 管控进度条:每上传完一个切片,就将进度条长度增加一点
      index++;
      upload_progress_value.style.width = `${(index / chunkCount) * 100}%`;

      if (index < chunkCount) return;
      // 当所有切片都上传成功，就合并切片
      upload_progress_value.style.width = `100%`;
      try {
        //调用合并切片方法
        data = await instance.post(
          "/upload_merge",
          {
            HASH,
            chunkCount,
          },
          {
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
          }
        );
        if (+data.code === 0) {
          alert(`恭喜您，文件上传成功，您可以基于 ${data.servicePath} 访问该文件~~`);
          clear();
          return;
        }
        
        throw data.codeText;
      } catch (err) {
        // alert("切片合并失败，请您稍后再试~~");
        clear();
      }
    };
 
    // 循环上传每一个切片
    chunks.forEach((chunk, index) => {
      // 已经上传的无需在上传
      // 后台返回的already格式为['HASH_1.png','HASH_2.png'],既已经上传的文件的切片名
      // 这个是所有的切片都没有漏，都已经上传完毕了的情况
      if (already.length > 0 && already.includes(chunk.filename)) {
      
        //已经上传过了的切片就无需再调用接口上传了, 这边其实直接用了断点续传的功能了
        complete(); //动进度条或合并所有切片
        return;
      }
      // 如果没有上传过，就调用接口上传
      let fm = new FormData();
      fm.append("file", chunk.file);
      fm.append("filename", chunk.filename);
      instance
        .post("/upload_chunk", fm)
        .then((data) => {
          //使用form data格式上传切片
          if (+data.code === 0) {
            complete(); ////动进度条或合并所有切片
            return;
          }
          return Promise.reject(data.codeText);
        })
        .catch(() => {
        //   alert("当前切片上传失败，请您稍后再试~~");
          clear();
        });
    });
  });
})();
