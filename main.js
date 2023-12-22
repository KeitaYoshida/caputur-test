// Modules to control application life and create native browser window
const {
  app,
  BrowserWindow,
  ipcMain,
  systemPreferences,
  desktopCapturer,
} = require("electron");
const util = require("electron-util");
const path = require("path");
const IS_OSX = process.platform === "darwin";
const Tesseract = require("tesseract.js");
const fs = require("fs");

let mainWindow = null;
function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: true,
      sandbox: false,
      contextIsolation: true,
    },
  });

  // and load the index.html of the app.
  mainWindow.loadFile("index.html");

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  mainWindow.on("closed", function () {
    mainWindow = null;
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
ipcMain.handle("electronMain:openScreenSecurity", () =>
  util.openSystemPreferences("security", "Privacy_ScreenCapture")
);
ipcMain.handle(
  "electronMain:getScreenAccess",
  () =>
    !IS_OSX || systemPreferences.getMediaAccessStatus("screen") === "granted"
);
ipcMain.handle("electronMain:screen:getSources", () => {
  return desktopCapturer
    .getSources({ types: ["window", "screen"] })
    .then(async (sources) => {
      return sources.map((source) => {
        source.thumbnailURL = source.thumbnail.toDataURL();
        return source;
      });
    });
});

ipcMain.on("get-stream", async (event, imageData) => {
  console.log("-------------------");
  try {
    const {
      data: { text },
    } = await Tesseract.recognize(imageData, "eng+jpn");
    console.log(text);
    //

    // const base64Data = imageData.replace(/^data:image\/png;base64,/, "");
    // const filePath = path.join(__dirname, "capturedImage.png");

    // ファイルとして保存
    // fs.writeFile(filePath, base64Data, "base64", (err) => {
    //   if (err) {
    //     console.error("Failed to save image:", err);
    //   } else {
    //     console.log("Image saved to", filePath);
    //   }
    // });
    // event.sender.send("ocr-result", result.text);
  } catch (error) {
    console.error("OCR error:", error);
    event.sender.send("ocr-result", "");
  }
});
