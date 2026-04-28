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
    const rotationAngles = [0, 90, 180, 270];

    for (const scale of scaleCandidates) {
      const scaledWidth = Math.max(320, Math.round(sourceWidth * scale));
      const scaledHeight = Math.max(320, Math.round(sourceHeight * scale));

      for (const rotationAngle of rotationAngles) {
        const isSideways = rotationAngle === 90 || rotationAngle === 270;
        const width = isSideways ? scaledHeight : scaledWidth;
        const height = isSideways ? scaledWidth : scaledHeight;

        canvas.width = width;
        canvas.height = height;
        context.clearRect(0, 0, width, height);
        context.save();
        context.translate(width / 2, height / 2);
        context.rotate((rotationAngle * Math.PI) / 180);
        context.drawImage(
          imageSource.source,
          -scaledWidth / 2,
          -scaledHeight / 2,
          scaledWidth,
          scaledHeight
        );
        context.restore();

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
    }

    imageSource.release();
    return null;
  }

  function extractPartCodeFromText(text) {
    if (!text) {
      return null;
    }

    const normalizedText = text
      .toUpperCase()
      .replace(/\s+/g, " ")
      .replace(/[|]/g, "I");
    const partCodeMatches = normalizedText.match(/[A-Z]{1,4}\d{6,}/g);

    if (!partCodeMatches?.length) {
      return null;
    }

    return partCodeMatches
      .sort((left, right) => right.length - left.length)[0]
      .trim();
  }

  async function decodePartCodeWithOcr(file) {
    if (!window.Tesseract?.recognize) {
      return null;
    }

    const imageSource = await getImageSource(file);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const rotationAngles = [0, 90, 270, 180];

    if (!context) {
      imageSource.release();
      return null;
    }

    try {
      for (const rotationAngle of rotationAngles) {
        const isSideways = rotationAngle === 90 || rotationAngle === 270;
        const width = isSideways ? imageSource.source.height : imageSource.source.width;
        const height = isSideways ? imageSource.source.width : imageSource.source.height;

        canvas.width = width;
        canvas.height = height;
        context.clearRect(0, 0, width, height);
        context.save();
        context.translate(width / 2, height / 2);
        context.rotate((rotationAngle * Math.PI) / 180);
        context.drawImage(
          imageSource.source,
          -imageSource.source.width / 2,
          -imageSource.source.height / 2,
          imageSource.source.width,
          imageSource.source.height
        );
        context.restore();

        const result = await window.Tesseract.recognize(canvas, "eng", {
          logger: () => {},
          workerBlobURL: false
        });
        const partCode = extractPartCodeFromText(result?.data?.text || "");

        if (partCode) {
          return partCode;
        }
      }
    } finally {
      imageSource.release();
    }

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

    const ocrPartCode = await decodePartCodeWithOcr(file);

    if (ocrPartCode) {
      return {
        value: ocrPartCode,
        source: "OCR"
      };
    }

    return {
      value: null,
      source: window.Tesseract?.recognize ? "OCR" : (typeof window.jsQR === "function" ? "jsQR" : "unavailable")
    };
  }

  window.monitorQrImageDecoder = {
    decodeQrFromImageFile
  };
})();
