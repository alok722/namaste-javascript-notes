const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const mds = require("markdown-styles");
const marked = require("marked");

const INPUT = "./notes/lectures.md";
const OUTPUT = "./dist";
const LAYOUT_TEMP = "./custom-layout-temp";
const THEME = "markedapp-byword";

// Deletes a folder recursively if it exists
function cleanFolder(folderPath) {
  if (fs.existsSync(folderPath)) {
    fs.rmSync(folderPath, { recursive: true, force: true });
    console.log(`🗑️  Deleted old folder: ${folderPath}`);
  }
}

// Custom renderer to add <a class="header-link"> to headings
const renderer = new marked.Renderer();
renderer.heading = function (text, level, raw, slugger) {
  const id = slugger.slug(raw);
  return `<h${level} id="${id}">
    <a class="header-link" href="#${id}"></a>
    ${text}
  </h${level}>`;
};

/* 
BUILD FUNCTION: build()
Purpose:
This asynchronous function handles the full pipeline of generating a styled HTML
page from a Markdown file, with a custom Table of Contents (TOC) sidebar and 
inline JavaScript for interactive behavior. It combines template export, patching, 
and Markdown rendering in one workflow.

Steps:

1. Clean old folders
   - Deletes any previous exported layout folder (LAYOUT_TEMP) and output folder (OUTPUT)
   - Ensures that the build starts fresh without leftover files.

2. Export fresh theme layout
   - Uses 'npx generate-md' to export the chosen theme into the temporary layout folder.
   - Ensures that we always patch the latest template version.

3. Patch the page.html template
   - Reads 'page.html' from the exported theme folder.
   - Injects custom CSS for the TOC sidebar directly into the <head>.
   - Replaces the <body> content to include:
     a) A fixed TOC sidebar with toggle button and topic links
     b) A content containing the rendered Markdown content
     c) Inline JavaScript for:
        - TOC generation from h1, h2, h3 headings
        - Sidebar toggle functionality
        - Mobile responsiveness
        - Auto-closing sidebar when clicking links or background

4. Render Markdown to HTML
   - Uses 'markdown-styles' to render the input Markdown file into HTML.
   - Applies the custom 'marked' renderer to add anchor links to headings.
   - Outputs the final HTML into the OUTPUT folder.

Notes:
- All headings automatically generate anchors for linking from the TOC.
- The TOC only starts including headings after detecting a heading containing "episode" (can be customized).
- The sidebar automatically collapses on mobile and dims the background when open.
 */
async function build() {
  try {
    // 0. Clean previous folders
    cleanFolder(LAYOUT_TEMP);
    cleanFolder(OUTPUT);

    // 1. Export theme fresh
    console.log(`📦 Exporting ${THEME}...`);
    execSync(`npx generate-md --export ${THEME} --output ${LAYOUT_TEMP}`);

    // 2. Patch page.html
    const pageHtmlPath = path.join(LAYOUT_TEMP, "page.html");
    let html = fs.readFileSync(pageHtmlPath, "utf-8");

    // 2a. Inject TOC CSS inline
    html = html.replace(
      /<\/head>/,
      `<!-- Custom TOC sidebar styles -->
      <style>
      /* ================= TOC SIDEBAR ================= */
      .toc-sidebar { position: fixed; top: 0; left: 0; height: 100vh; width: 300px; background: #000; border-right: 1px solid #222; transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); z-index: 1001; overflow-y: auto; overflow-x: hidden; }
      .toc-sidebar.close { width: 60px; background: transparent; border-right: none; }
      .toc-header { height: 60px; display: flex; align-items: center; overflow: hidden; background: inherit; }
      .toc-icon-svg { min-width: 60px; cursor: pointer; display: block; padding: 15px; transition: color 0.3s ease; color: #fff; }
      .toc-sidebar.close .toc-icon-svg { color: #000; }
      .toc-title { font-size: 20px; color: #fff; font-weight: 600; white-space: nowrap; transition: opacity 0.3s ease; margin-left: 0; }
      .toc-sidebar.close .toc-title { opacity: 0; pointer-events: none; }
      #toc { margin-top: 10px; padding: 0; list-style: none; }
      #toc li.h1 a { font-weight: 700; color: #fff2f2; opacity: 1; } 
      #toc li.h2 { padding-left: 20px; }
      #toc li.h3 { padding-left: 40px; }
      #toc a { color: #fff; font-size: 14px; text-decoration: none; display: block; padding: 12px 20px; opacity: 0.7; transition: all 0.2s ease; }
      #toc a:hover { opacity: 1; background: #111; }
      .toc-sidebar.close #toc { display: none; }
      @media (max-width: 900px) {
        .toc-sidebar { width: 280px !important; }
        .toc-sidebar.close { width: 60px !important; background: transparent !important; border-right: none !important; }
        .toc-sidebar.close .toc-icon-svg { color: #000 !important; }
        body.sidebar-open::after { content: ""; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); backdrop-filter: blur(3px); z-index: 1000; }
        body.sidebar-open { overflow: hidden; }
      }
      #content img {
        border: none;
        display: block;
        margin: 1em auto;
        max-width: 100%;
      }
      </style>
      </head>`,
    );

    // 2b. Replace body with TOC + content + inline JS
    html = html.replace(
      /<body>[\s\S]*<\/body>/,
      `<body>
      <div class="toc-sidebar close">
        <div class="toc-header"> 
          <svg id="toc-toggle" class="toc-icon-svg" xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0,0,256,256">
            <g fill="currentColor" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10">
              <g transform="scale(5.12,5.12)">
                <path d="M0,9v2h50v-2zM0,24v2h50v-2zM0,39v2h50v-2z"></path>
              </g>
            </g>
          </svg>
          <span class="toc-title">Topics</span>
        </div>
        <ul id="toc"></ul>
      </div>
      <div id="content">
        <article class="markdown-body">
          {{~> content}}
        </article>
      </div>

      <!-- Inline TOC Script -->
      <script>
        document.addEventListener("DOMContentLoaded", () => {
        const sidebar = document.querySelector(".toc-sidebar");
        const toggle = document.getElementById("toc-toggle");
        const toc = document.getElementById("toc");
        const content = document.getElementById("content");
        const body = document.body;

        // Toggle Sidebar logic
        toggle.addEventListener("click", () => {
          sidebar.classList.toggle("close");
          
          // Dim background for mobile
          if (!sidebar.classList.contains("close") && window.innerWidth < 900) {
            body.classList.add("sidebar-open");
          } else {
            body.classList.remove("sidebar-open");
          }
        });

        // Generate TOC Logic
        const allHeadings = content.querySelectorAll("h1, h2, h3");
        let episodeReached = false;

        allHeadings.forEach((heading) => {
          const clone = heading.cloneNode(true);
          const anchor = clone.querySelector(".header-link");
          if (anchor) anchor.remove();

          const text = clone.textContent.trim();
          if (!text) return;

          const isEpisode = heading.tagName === "H1" && text.toLowerCase().includes("episode");
          if (isEpisode) episodeReached = true;

          if (episodeReached) {
            const li = document.createElement("li");
            li.className = heading.tagName.toLowerCase();
            const a = document.createElement("a");
            a.href = '#' + heading.id;
            a.textContent = text;
            li.appendChild(a);
            toc.appendChild(li);
          }
        });

        // Auto-close on link click (Mobile)
        toc.addEventListener("click", (e) => {
          if (e.target.tagName === "A" && window.innerWidth < 900) {
            sidebar.classList.add("close");
            body.classList.remove("sidebar-open");
          }
        });

        // Close when clicking dimmed background
        document.addEventListener("click", (e) => {
          if (body.classList.contains("sidebar-open") && !sidebar.contains(e.target)) {
            sidebar.classList.add("close");
            body.classList.remove("sidebar-open");
          }
        });
      });
      </script>
      </body>`,
    );

    fs.writeFileSync(pageHtmlPath, html);
    console.log("✅ Patched fresh template with TOC sidebar + JS + CSS!");

    // 3. Render Markdown to HTML using custom renderer
    console.log("🚀 Generating HTML...");
    const settings = mds.resolveArgs({
      input: path.resolve(INPUT),
      output: path.resolve(OUTPUT),
      layout: path.resolve(LAYOUT_TEMP),
      marked: { renderer }, // use our custom heading renderer
    });

    mds.render(settings, (err) => {
      if (err) {
        console.error(err);
      } else {
        console.log("✅ Done! Open ./dist/lectures.html");
        // Clean up temporary layout folder
        cleanFolder(LAYOUT_TEMP);
        console.log("🧹 Cleaned up temporary files");
      }
    });
  } catch (err) {
    console.error("❌ Error:", err);
  }
}

build();
