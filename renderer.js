/**
 * This file is loaded via the <script> tag in the index.html file and will
 * be executed in the renderer process for that window. No Node.js APIs are
 * available in this process because `nodeIntegration` is turned off and
 * `contextIsolation` is turned on. Use the contextBridge API in `preload.js`
 * to expose Node.js functionality from the main process.
 */

const main = window.electronApi.main;

const video = document.querySelector("#stream");
const startBtn = document.querySelector("#start");
const stopBtn = document.querySelector("#stop");
const openSettingsBtn = document.querySelector("#system-preferences");
const screenPicker = document.querySelector("#electron-screen-picker");

const displayMediaOptions = {
  video: {
    displaySurface: "window",
  },
  audio: false,
};

navigator.mediaDevices.getDisplayMedia = getDisplayMedia;

// Set event listeners for the start, stop and openSettings buttons
startBtn.addEventListener("click", startCapture, false);
stopBtn.addEventListener("click", stopCapture, false);
openSettingsBtn.addEventListener("click", openPreferences, false);

async function startCapture() {
  try {
    video.srcObject = await navigator.mediaDevices.getDisplayMedia(
      displayMediaOptions
    );
    setupContinuousOCR();
    startBtn.classList = "hidden";
    stopBtn.classList = "";
  } catch (err) {
    console.error(err);
  }
}

function stopCapture(evt) {
  if (!video.srcObject) return;

  let tracks = video.srcObject.getTracks();

  tracks.forEach((track) => track.stop());
  video.srcObject = null;
  startBtn.classList = "";
  stopBtn.classList = "hidden";
}

function openPreferences() {
  main.openScreenSecurity();
}

let screenPickerOptions = {
  system_preferences: false,
};

function getDisplayMedia() {
  if (main.isOSX()) {
    screenPickerOptions.system_preferences = true;
  }

  return new Promise(async (resolve, reject) => {
    let has_access = await main.getScreenAccess();
    if (!has_access) {
      return reject("none");
    }

    try {
      const sources = await main.getScreenSources();
      screenPickerShow(
        sources,
        async (id) => {
          try {
            console.log("b");
            const source = sources.find((source) => source.id === id);
            if (!source) {
              return reject("none");
            }

            const stream = await window.navigator.mediaDevices.getUserMedia({
              audio: false,
              video: {
                mandatory: {
                  chromeMediaSource: "desktop",
                  chromeMediaSourceId: source.id,
                },
              },
            });
            resolve(stream);
          } catch (err) {
            reject(err);
          }
        },
        {}
      );
    } catch (err) {
      reject(err);
    }
  });
}

function screenPickerShow(sources, onselect) {
  const list = document.querySelector("#sources");
  list.innerHTML = "";

  sources.forEach((source) => {
    const item = document.createElement("div");
    item.classList = "__electron-list";

    const wrapper = document.createElement("div");
    wrapper.classList = "thumbnail __electron-screen-thumbnail";

    const thumbnail = document.createElement("img");
    thumbnail.src = source.thumbnailURL;

    const label = document.createElement("div");
    label.classList = "__electron-screen-name";
    label.innerText = source.name;

    wrapper.append(thumbnail);
    wrapper.append(label);
    item.append(wrapper);
    item.onclick = () => {
      onselect(source.id);
      MicroModal.close("electron-screen-picker");
    };
    list.append(item);
  });

  if (!screenPickerOptions.system_preferences) {
    openSettingsBtn.classList = "hidden";
  }

  MicroModal.show("electron-screen-picker");
}

async function performOCR() {
  const canvas = document.createElement("canvas");
  const videoElement = document.querySelector("#stream");
  const context = canvas.getContext("2d");

  if (videoElement.readyState >= 2) {
    // キャプチャする領域の設定
    const captureWidth = videoElement.videoWidth * 0.3;
    const captureHeight = videoElement.videoHeight * 0.2;
    const captureX = videoElement.videoWidth * 0.35;
    const captureY = videoElement.videoHeight * 0.5;

    // キャンバスのサイズをキャプチャする領域に合わせる
    canvas.width = captureWidth;
    canvas.height = captureHeight;

    // 特定の領域のみをキャンバスに描画
    context.drawImage(
      videoElement,
      captureX,
      captureY,
      captureWidth,
      captureHeight,
      0,
      0,
      captureWidth,
      captureHeight
    );

    const imageData = canvas.toDataURL();
    main.getStream(imageData);
  }

  // try {
  //   context.drawImage(
  //     videoElement,
  //     0,
  //     0,
  //     videoElement.width,
  //     videoElement.height
  //   );

  //   const imageData = canvas.toDataURL();

  //   saveImageData(imageData);
  //   main.getStream(imageData);
  // } catch (error) {
  //   console.error("OCR error:", error);
  // }
}

function setupContinuousOCR() {
  setInterval(performOCR, 1000); // 1秒ごとに実行
}

// function saveImageData(imageData) {
//   const link = document.createElement("a");
//   link.href = imageData;
//   link.download = "capturedImage.png";
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
// }
