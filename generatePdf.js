const { mdToPdf } = require("md-to-pdf");
const os = require("os");
const { execSync } = require("child_process");

// Detect platform and architecture
const platform = os.platform();
const arch = os.arch();

console.log(`Detected: ${platform} ${arch}`);

// Install correct Chrome binary if not already installed
const chromePath = `${os.homedir()}/.cache/puppeteer/chrome/mac_${arch === "arm64" ? "arm" : "x86"}-*`;

try {
  const chromeExists = execSync(
    `ls ${chromePath} 2>/dev/null || echo "notfound"`,
  )
    .toString()
    .trim();

  if (chromeExists === "notfound" || chromeExists === "") {
    console.log("Installing Chrome binary for current architecture...");
    execSync(
      `PUPPETEER_CACHE_DIR=${os.homedir()}/.cache/puppeteer npx puppeteer browsers install chrome`,
      {
        stdio: "inherit",
      },
    );
  }
} catch (error) {
  console.log("Chrome binary check/install completed");
}

// Generate PDF
(async () => {
  await mdToPdf(
    { path: "./notes/lectures.md" },
    {
      dest: "./dist/namaste-javascript-notes.pdf",
      launch_options: {
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      },
      pdf_options: {
        format: "A4",
        margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
        printBackground: true,
      },
      basedir: process.cwd(), // Use current working directory as base for relative paths
    },
  );
  console.log("PDF generated successfully!");
})();
