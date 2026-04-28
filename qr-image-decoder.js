(function () {
  function loadImageElement(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Unable to load image"));
      };

      image.src = objectUrl;
    });
  }

  async function getImageSource(file) {
    if (typeof createImageBitmap === "function") {
      try {
        const imageBitmap = await createImageBitmap(file);
        return {
          source: imageBitmap,
          release() {
            imageBitmap.close();
          }
        };
      } catch (error) {
        // Fall through to <img> fallback for Safari/iOS cases.
      }
    }

    const image = await loadImageElement(file);
    return {
      source: image,
      release() {}
    };
  }

  async function decodeWithBarcodeDetector(file) {
    if (!("BarcodeDetector" in window)) {
      return null;
    }

    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const imageSource = await getImageSource(file);

    try {
      const barcodes = await detector.detect(imageSource.source);
      return barcodes[0]?.rawValue?.trim() || null;
    } finally {
      imageSource.release();
    }
  }

  async function decodeWithJsQr(file) {
    if (typeof window.jsQR !== "function") {
      return null;
    }

    const imageSource = await getImageSource(file);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      imageSource.release();
      return null;
    }

    const sourceWidth = imageSource.source.width;
    const sourceHeight = imageSource.source.height;
    const maxDimension = Math.max(sourceWidth, sourceHeight);
    const scaleCandidates = maxDimension > 2200
      ? [1, 0.7, 0.5, 0.35]
      : [1, 0.8, 0.6, 0.4];
    const inversionModes = ["dontInvert", "attemptBoth", "onlyInvert"];

    for (const scale of scaleCandidates) {
      const width = Math.max(320, Math.round(sourceWidth * scale));
      const height = Math.max(320, Math.round(sourceHeight * scale));

      canvas.width = width;
      canvas.height = height;
      context.clearRect(0, 0, width, height);
      context.drawImage(imageSource.source, 0, 0, width, height);

      const imageData = context.getImageData(0, 0, width, height);

      for (const inversionAttempts of inversionModes) {
        const result = window.jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts
        });

        if (result?.data?.trim()) {
          imageSource.release();
          return result.data.trim();
        }
      }
    }

    imageSource.release();
    return null;
  }

  async function decodeQrFromImageFile(file) {
    const barcodeDetectorResult = await decodeWithBarcodeDetector(file);

    if (barcodeDetectorResult) {
      return {
        value: barcodeDetectorResult,
        source: "BarcodeDetector"
      };
    }

    const jsQrResult = await decodeWithJsQr(file);

    if (jsQrResult) {
      return {
        value: jsQrResult,
        source: "jsQR"
      };
    }

    return {
      value: null,
      source: typeof window.jsQR === "function" ? "jsQR" : "unavailable"
    };
  }

  window.monitorQrImageDecoder = {
    decodeQrFromImageFile
  };
})();
