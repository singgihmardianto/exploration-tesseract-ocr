import * as fs from "fs";
import * as path from "path";
import tesseract from "node-tesseract-ocr";

// --- Configuration ---
const config = {
  lang: "eng",
  oem: 1,
  psm: 3,
};

const IMAGE_DIR = "./images";
const OUTPUT_FILE = "results.csv";
const SUPPORTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".tiff", ".tif"];

/**
 * Array of strings to look for. Each keyword will be a separate CSV column.
 * NOTE: The order here defines the order of the 'Search N' columns in the CSV.
 */
const TARGET_KEYWORDS: string[] = [
  "Selamat",
  // "Device is in warranty period",
  // "Issue diagnosed is covered",
  // "Qure outcome was not escalated"
];

// --- Type Definitions ---
interface ImageResult {
  fileName: string;
  keywordStatus: Map<string, boolean>;
}

// --- Helper Functions ---
function isSupportedImage(filename: string): boolean {
  const ext = path.extname(filename).toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

/**
 * Checks the recognized text against all TARGET_KEYWORDS and returns a status map.
 */
function checkKeywords(text: string): Map<string, boolean> {
  const lowerText = text.toLowerCase();
  const statusMap = new Map<string, boolean>();

  for (const keyword of TARGET_KEYWORDS) {
    const found = lowerText.includes(keyword.toLowerCase());
    statusMap.set(keyword, found);
  }
  return statusMap;
}

/**
 * Converts the array of ImageResult objects into the specified matrix CSV string.
 */
function convertToCsv(results: ImageResult[]): string {
  const searchHeaders = TARGET_KEYWORDS
    // .map((_, index) => `Search ${index + 1}`)
    .join(",");

  const header = `Case,${searchHeaders}\n`;

  const rows = results.map((result) => {
    let row = `${result.fileName}`;

    for (const keyword of TARGET_KEYWORDS) {
      const status = result.keywordStatus.get(keyword) || false;
      const statusText = status ? "found" : "not found";
      row += `,${statusText}`;
    }
    return row;
  });

  return header + rows.join("\n");
}

/**
 * Main function to process images and write the results.
 */
async function processImages(): Promise<void> {
  console.log(`Starting OCR process for images in: ${IMAGE_DIR}`);
  const allImageResults: ImageResult[] = [];

  let totalSuccessfulMatches = 0;

  try {
    const files = fs.readdirSync(IMAGE_DIR);
    const imageFiles = files.filter(isSupportedImage);

    if (imageFiles.length === 0) {
      console.log(
        `\nNo supported images (${SUPPORTED_EXTENSIONS.join(", ")}) found in ${IMAGE_DIR}.`,
      );
      return;
    }

    const numImages = imageFiles.length;
    const numKeywords = TARGET_KEYWORDS.length;
    const totalPossibleChecks = numImages * numKeywords;

    console.log(`Found ${numImages} image(s) to process.`);
    console.log("----------------------------------------");

    // 1. Process images and populate allImageResults
    for (const file of imageFiles) {
      const imagePath = path.join(IMAGE_DIR, file);

      try {
        const text = await tesseract.recognize(imagePath, config);

        // Get the status map for all keywords
        const keywordStatus = checkKeywords(text);

        allImageResults.push({
          fileName: file,
          keywordStatus: keywordStatus,
        });

        // Tally the successful matches for the summary
        const foundCount = Array.from(keywordStatus.values()).filter(
          (v) => v,
        ).length;
        totalSuccessfulMatches += foundCount;

        console.log(
          `Processed: ${file} (${foundCount} matches out of ${numKeywords} keywords)`,
        );
      } catch (error) {
        console.error(`Error processing ${file}:`, (error as Error).message);
      }
    }

    // 2. Summary Calculation
    let averageMatchPercentage = 0;
    if (totalPossibleChecks > 0) {
      // Calculate percentage: (Successful Matches / Total Possible Checks) * 100
      averageMatchPercentage =
        (totalSuccessfulMatches / totalPossibleChecks) * 100;
    }

    // 3. Convert results to CSV format
    const csvData = convertToCsv(allImageResults);
    fs.writeFileSync(OUTPUT_FILE, csvData);

    // 4. Output Summary
    console.log("\n========================================");
    console.log(`OCR Processing Summary`);
    console.log("========================================");
    console.log(`Total Images Processed: ${numImages}`);
    console.log(`Total Keywords Checked: ${totalPossibleChecks}`);
    console.log(`Total Successful Matches: ${totalSuccessfulMatches}`);
    console.log(
      `Average Match Percentage: **${averageMatchPercentage.toFixed(2)}%**`,
    );
    console.log(`Results written to: **${OUTPUT_FILE}**`);
    console.log("========================================");
  } catch (err) {
    console.error(`\nFatal Error:`, (err as Error).message);
  }
}

// Execute the main function
processImages();
