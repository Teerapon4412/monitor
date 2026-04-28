(function () {
  async function normalizeImageFile(file) {
    const fileName = file?.name || "";
    const fileType = (file?.type || "").toLowerCase();
    const isHeicLike = fileType.includes("heic") || fileType.includes("heif") || /\.(heic|heif)$/i.test(fileName);

    if (!isHeicLike || typeof window.heic2any !== "function") {
      return file;
    }

    const convertedBlob = await window.heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92
    });

    const outputBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

    return new File(
      [outputBlob],
      fileName.replace(/\.(heic|heif)$/i, ".jpg") || "converted-from-heic.jpg",
      { type: "image/jpeg" }
    );
  }

  function loadImageElement(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      let revoked = false;

      function cleanup() {
        if (!revoked) {
          URL.revokeObjectURL(objectUrl);
          revoked = true;
        }
      }

      image.onload = () => {
        cleanup();
        resolve(image);
      };

      image.onerror = () => {
        cleanup();

        const reader = new FileReader();
        reader.onload = () => {
          const fallbackImage = new Image();
          fallbackImage.onload = () => resolve(fallbackImage);
          fallbackImage.onerror = () => reject(new Error("Unable to load image"));
          fallbackImage.src = reader.result;
        };
        reader.onerror = () => reject(new Error("Unable to load image"));
        reader.readAsDataURL(file);
      };

      image.src = objectUrl;
    });
  }

  function applyCanvasPreset(context, width, height, preset) {
    const imageData = context.getImageData(0, 0, width, height);
    const { data } = imageData;

    for (let index = 0; index < data.length; index += 4) {
      const red = data[index];
      const green = data[index + 1];
      const blue = data[index + 2];
      const luminance = Math.round(red * 0.299 + green * 0.587 + blue * 0.114);

      if (preset === "grayscale") {
        data[index] = luminance;
        data[index + 1] = luminance;
        data[index + 2] = luminance;
        continue;
      }

      if (preset === "threshold") {
        const thresholdValue = luminance > 150 ? 255 : 0;
        data[index] = thresholdValue;
        data[index + 1] = thresholdValue;
        data[index + 2] = thresholdValue;
        continue;
      }

      if (preset === "contrast") {
        const contrastValue = luminance > 170 ? 255 : luminance < 90 ? 0 : luminance;
        data[index] = contrastValue;
        data[index + 1] = contrastValue;
        data[index + 2] = contrastValue;
      }
    }

    context.putImageData(imageData, 0, 0);
  }

  function drawImageVariant(context, imageSource, options = {}) {
    const {
      rotationAngle = 0,
      scale = 1,
      crop = null,
      preset = "original"
    } = options;
    const source = imageSource.source;
    const cropX = crop ? Math.max(0, Math.round(source.width * crop.x)) : 0;
    const cropY = crop ? Math.max(0, Math.round(source.height * crop.y)) : 0;
    const cropWidth = crop ? Math.max(1, Math.round(source.width * crop.width)) : source.width;
    const cropHeight = crop ? Math.max(1, Math.round(source.height * crop.height)) : source.height;
    const scaledWidth = Math.max(240, Math.round(cropWidth * scale));
    const scaledHeight = Math.max(240, Math.round(cropHeight * scale));
    const isSideways = rotationAngle === 90 || rotationAngle === 270;
    const width = isSideways ? scaledHeight : scaledWidth;
    const height = isSideways ? scaledWidth : scaledHeight;

    context.canvas.width = width;
    context.canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.save();
    context.translate(width / 2, height / 2);
    context.rotate((rotationAngle * Math.PI) / 180);
    context.drawImage(
      source,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      -scaledWidth / 2,
      -scaledHeight / 2,
      scaledWidth,
      scaledHeight
    );
    context.restore();

    if (preset !== "original") {
      applyCanvasPreset(context, width, height, preset);
    }

    return { width, height };
  }

  async function getImageSource(file) {
    const normalizedFile = await normalizeImageFile(file);

    if (typeof createImageBitmap === "function") {
      try {
        const imageBitmap = await createImageBitmap(normalizedFile);
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

    const image = await loadImageElement(normalizedFile);
    return {
      source: image,
      release() {}
    };
  }

  async function decodeWithBarcodeDetector(file) {
    if (!("BarcodeDetector" in window)) {
      return null;
    }

    const imageSource = await getImageSource(file);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) {
      imageSource.release();
      return null;
    }

    const supportedFormats = typeof window.BarcodeDetector.getSupportedFormats === "function"
      ? await window.BarcodeDetector.getSupportedFormats()
      : ["qr_code"];
    const preferredFormats = ["qr_code", "data_matrix", "aztec", "pdf417"];
    const formats = preferredFormats.filter((format) => supportedFormats.includes(format));
    const detector = new window.BarcodeDetector({ formats: formats.length ? formats : ["qr_code"] });
    const scaleCandidates = [1, 0.85, 0.65];
    const rotationAngles = [0, 90, 180, 270];
    const cropCandidates = [
      null,
      { x: 0.18, y: 0.12, width: 0.64, height: 0.72 },
      { x: 0.1, y: 0.1, width: 0.8, height: 0.8 }
    ];

    try {
      const directBarcodes = await detector.detect(imageSource.source);

      if (directBarcodes[0]?.rawValue?.trim()) {
        return directBarcodes[0].rawValue.trim();
      }

      for (const scale of scaleCandidates) {
        for (const rotationAngle of rotationAngles) {
          for (const crop of cropCandidates) {
            drawImageVariant(context, imageSource, {
              rotationAngle,
              scale,
              crop,
              preset: "original"
            });

            const barcodes = await detector.detect(canvas);

            if (barcodes[0]?.rawValue?.trim()) {
              return barcodes[0].rawValue.trim();
            }
          }
        }
      }

      return null;
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
    const cropCandidates = [
      null,
      { x: 0.2, y: 0.15, width: 0.6, height: 0.7 },
      { x: 0.12, y: 0.12, width: 0.76, height: 0.76 }
    ];
    const presets = ["original", "grayscale", "contrast", "threshold"];

    for (const scale of scaleCandidates) {
      for (const rotationAngle of rotationAngles) {
        for (const crop of cropCandidates) {
          for (const preset of presets) {
            const { width, height } = drawImageVariant(context, imageSource, {
              rotationAngle,
              scale,
              crop,
              preset
            });
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
    const cropCandidates = [
      null,
      { x: 0.45, y: 0.02, width: 0.53, height: 0.34 },
      { x: 0.3, y: 0.02, width: 0.68, height: 0.45 },
      { x: 0.15, y: 0.08, width: 0.7, height: 0.84 }
    ];
    const presets = ["original", "grayscale", "contrast", "threshold"];
    const scaleCandidates = [1, 0.8, 0.6];

    if (!context) {
      imageSource.release();
      return null;
    }

    try {
      for (const rotationAngle of rotationAngles) {
        for (const crop of cropCandidates) {
          for (const scale of scaleCandidates) {
            for (const preset of presets) {
              drawImageVariant(context, imageSource, {
                rotationAngle,
                crop,
                scale,
                preset
              });

              const result = await window.Tesseract.recognize(canvas, "eng", {
                logger: () => {},
                workerBlobURL: false
              });
              const partCode = extractPartCodeFromText(result?.data?.text || "");

              if (partCode) {
                return partCode;
              }
            }
          }
        }
      }
    } finally {
      imageSource.release();
    }

    return null;
  }

  async function decodeQrFromImageFile(file) {
    const errors = [];
    let barcodeDetectorResult = null;

    try {
      barcodeDetectorResult = await decodeWithBarcodeDetector(file);
    } catch (error) {
      errors.push(`BarcodeDetector: ${error.message || "failed"}`);
    }

    if (barcodeDetectorResult) {
      return {
        value: barcodeDetectorResult,
        source: "BarcodeDetector"
      };
    }

    let jsQrResult = null;

    try {
      jsQrResult = await decodeWithJsQr(file);
    } catch (error) {
      errors.push(`jsQR: ${error.message || "failed"}`);
    }

    if (jsQrResult) {
      return {
        value: jsQrResult,
        source: "jsQR"
      };
    }

    let ocrPartCode = null;

    try {
      ocrPartCode = await decodePartCodeWithOcr(file);
    } catch (error) {
      errors.push(`OCR: ${error.message || "failed"}`);
    }

    if (ocrPartCode) {
      return {
        value: ocrPartCode,
        source: "OCR"
      };
    }

    return {
      value: null,
      source: window.Tesseract?.recognize ? "OCR" : (typeof window.jsQR === "function" ? "jsQR" : "unavailable"),
      error: errors.join(" | ")
    };
  }

  window.monitorQrImageDecoder = {
    decodeQrFromImageFile
  };
})();
