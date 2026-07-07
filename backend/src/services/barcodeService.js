/**
 * Barcode Service
 * Generates barcode (Code 128) and QR code images as PNG buffers using bwip-js.
 */

const bwipjs = require("bwip-js");

/**
 * Generate a barcode or QR code PNG buffer.
 * @param {string} text — Barcode/QR code value
 * @param {string} format — "barcode" or "qr"
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function generate(text, format = "barcode") {
  const options = {
    bcid: format === "qr" ? "qrcode" : "code128",
    text: String(text),
    scale: 3,
    height: format === "qr" ? 15 : 10,
    includetext: format !== "qr",
    textxalign: "center",
  };

  try {
    const png = await bwipjs.toBuffer(options);
    return png;
  } catch (error) {
    throw Object.assign(
      new Error(`Barcode generation failed: ${error.message}`),
      { statusCode: 500, code: "BARCODE_GENERATION_ERROR" }
    );
  }
}

module.exports = {
  generate,
};
