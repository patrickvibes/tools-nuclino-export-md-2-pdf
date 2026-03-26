# md-to-pdf

> Convert exported Markdown documents — with UUID-based image subfolders — into clean, self-contained PDFs.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)
![License](https://img.shields.io/badge/license-ISC-blue)
![Requires](https://img.shields.io/badge/requires-wkhtmltopdf-orange)

---

## What it does

Takes a folder of `.md` files and converts each one into a PDF, with all images **fully embedded** as base64 — so the PDFs are completely portable, no external files needed.

Built specifically for tools that export Markdown with images stored in a `files/<uuid>/` subfolder structure and use angle-bracket escaping for filenames with spaces:

```markdown
![error screenshot](<files/4b7d92fe-594f-47b7-a461-67992027cf3a/error message(1)(1).png>)
```

---

## Prerequisites

### 1 — Node.js 18+

Download from [nodejs.org](https://nodejs.org) or use a version manager:

```bash
# macOS / Linux (using nvm)
nvm install 18
nvm use 18
```

Check your version:

```bash
node --version   # should print v18.x.x or higher
```

### 2 — wkhtmltopdf

This is the PDF rendering engine the app uses. It must be installed separately on your system.

| Platform | Command |
|----------|---------|
| **macOS** | `brew install wkhtmltopdf` |
| **Ubuntu / Debian** | `sudo apt-get install wkhtmltopdf` |
| **Fedora / RHEL** | `sudo dnf install wkhtmltopdf` |
| **Windows** | Download installer from [wkhtmltopdf.org/downloads.html](https://wkhtmltopdf.org/downloads.html) |

Verify it's installed:

```bash
wkhtmltopdf --version
```

---

## Installation

Clone this repo and install Node dependencies:

```bash
git clone https://github.com/your-username/md-to-pdf.git
cd md-to-pdf
npm install
```

---

## Usage

```bash
node index.js
```

The interactive prompt walks you through three steps:

```
  ╔══════════════════════════════════╗
  ║       MD → PDF Converter         ║
  ╚══════════════════════════════════╝

  Source folder (containing .md files): › /path/to/your/export
  
  Found 3 markdown file(s):
    • bug-report.md
    • feature-request.md
    • onboarding-guide.md

  Output folder for PDFs: › /path/to/your/export/pdf-output

  Convert 3 file(s) → /path/to/your/export/pdf-output? › Yes

  ✓ bug-report.md         →  bug-report.pdf         (22 KB)
  ✓ feature-request.md    →  feature-request.pdf     (18 KB)
  ✓ onboarding-guide.md   →  onboarding-guide.pdf    (45 KB)

  ──────────────────────────────────────────────────
  ✓  3 PDF(s) saved  ·  85 KB total
     /path/to/your/export/pdf-output
```

---

## Expected folder structure

```
my-export/
├── bug-report.md
├── feature-request.md
├── onboarding-guide.md
└── files/
    ├── 4b7d92fe-594f-47b7-a461-67992027cf3a/
    │   └── error message(1)(1).png
    ├── 9f2a1b3c-1234-5678-abcd-ef0123456789/
    │   ├── screenshot.png
    │   └── architecture-diagram.webp
    └── a1b2c3d4-5678-90ab-cdef-1234567890ab/
        └── logo.svg
```

The `files/` folder sits alongside the `.md` files. Each UUID subfolder contains the images referenced by one or more documents.

---

## Supported image path formats

Both Markdown image syntaxes are handled automatically:

```markdown
<!-- Standard path (no spaces) -->
![diagram](files/uuid/diagram.png)

<!-- Angle-bracket escaped path (spaces and special characters in filename) -->
![screenshot](<files/uuid/my screenshot (1).png>)
```

External `http://` and `https://` image URLs are preserved as links — they are not downloaded or embedded.

---

## Supported image formats

`png` · `jpg` / `jpeg` · `gif` · `webp` · `svg` · `bmp`

---

## PDF output

- **One PDF per `.md` file**, named to match the source file
- **A4 page size** with 15mm margins on all sides
- **Images embedded** as base64 — PDFs work standalone with no external dependencies
- **Full Markdown support** — headings, tables, code blocks, blockquotes, ordered/unordered lists, bold, italic, links, horizontal rules
- If an image file is **not found**, a warning is shown but conversion continues — the rest of the document renders normally

---

## Troubleshooting

**`wkhtmltopdf not found`**
The tool isn't installed or isn't on your `PATH`. Follow the installation steps above and run `wkhtmltopdf --version` to confirm.

**`No .md files found in that folder`**
Make sure you're pointing to the folder that *contains* the `.md` files, not a parent directory.

**Images not appearing in the PDF**
Check that the `files/` subfolder is in the same directory as your `.md` files. The app will warn you about any image paths it couldn't resolve.

**`Cannot find package 'marked'`**
Run `npm install` inside the `md-to-pdf` directory before running the app.

---

## Author

**Corax**

---

## License

ISC License

Copyright (c) 2026 Corax

Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
