# CIS – Data Foundations Practice Test
### Certified Implementation Specialist – Data Foundations (CMDB and CSDM)

A fully static, mobile-friendly practice test with **164 unique questions** covering all core exam objectives.

---

## 🚀 Live Demo
Once hosted on GitHub Pages: `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

---

## 📁 File Structure

```
├── index.html              ← Main HTML page (structure & layout only)
├── css/
│   └── style.css           ← All styles (themes, components, responsive)
├── data/
│   └── questions.js        ← All 164 questions & answers (EDIT HERE)
├── js/
│   └── app.js              ← All app logic (state, scoring, modes, timer)
└── README.md               ← This file
```

### Which file to edit:
| Need to... | Edit this file |
|---|---|
| Fix a wrong answer or explanation | `data/questions.js` |
| Add a new question | `data/questions.js` |
| Change colors, fonts, layout | `css/style.css` |
| Add a new feature | `js/app.js` |
| Change page title or structure | `index.html` |

---

## 🌐 How to Host on GitHub Pages

### Step 1: Create a GitHub repository
1. Go to [github.com](https://github.com) → Sign in → Click **"New"** repository
2. Name it (e.g., `cis-cmdb-practice-test`)
3. Set to **Public**
4. Click **"Create repository"**

### Step 2: Upload your files
**Option A — GitHub web interface (easiest):**
1. In your new repo, click **"uploading an existing file"**
2. Drag and drop ALL files maintaining the folder structure:
   - `index.html`
   - `css/style.css`
   - `data/questions.js`
   - `js/app.js`
3. Click **"Commit changes"**

**Option B — Git command line:**
```bash
# In the folder containing index.html
git init
git add .
git commit -m "Initial commit: CIS-CMDB practice test"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```

### Step 3: Enable GitHub Pages
1. In your repo, go to **Settings** → **Pages** (left sidebar)
2. Under **"Source"**, select **"Deploy from a branch"**
3. Branch: **main**, Folder: **/ (root)**
4. Click **Save**
5. Wait ~2 minutes, then your site will be live at:
   `https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/`

---

## ✏️ How to Edit Questions

Open `data/questions.js` and find the question you want to change.

Each question follows this format:
```javascript
{
  id: 1,                          // Unique ID — do NOT change
  section: "CMDB Governance",     // Section name for grouping
  text: "Question text here?",    // The question
  type: "single",                 // "single" or "multi"
  options: [                      // Answer choices (A, B, C...)
    "Option A",
    "Option B",
    "Option C"
  ],
  correct: [1],                   // Index of correct answer(s) — zero-based
                                  // e.g., [0] = A, [1] = B, [0,2] = A and C
  explanation: "Why this is correct..."  // Shown after answering
}
```

### Example: Fixing a wrong answer
If question 12 has the wrong correct answer, find `id:12` and change the `correct` array:
```javascript
// Before (incorrect answer B selected)
correct: [1],

// After (correct answer is A, index 0)
correct: [0],
```

### Adding a new question
Copy an existing question block, change the `id` to the next available number, and fill in the fields.

---

## 🎮 Features

| Feature | Description |
|---|---|
| 📚 Practice Mode | All 164 questions, instant feedback + explanations per question |
| 🎯 Exam Mode | 75 random questions, 90-minute countdown, explanations shown after finishing |
| 💾 Auto-save | Progress saved in browser localStorage — reload without losing progress |
| 🔍 Jump to Q# | Jump directly to any question number |
| 🏷️ Section Filter | Practice specific topic areas only |
| ❌ Answer Filter | View All / Unanswered / Correct / Incorrect |
| 📊 Section Breakdown | Results show performance per topic section |
| 🌙 Dark/Light Theme | Toggle between themes |
| 🔡 Font Size | Adjustable font size (A- / A+) |
| 📋 Share Score | Copy score text to clipboard |
| ↺ Restart | Reset all progress and start over |

---

## 📚 Topics Covered

- CMDB Governance & Data Manager
- CMDB Health Dashboard
- CI Class Manager
- IRE & Identification Rules
- CMDB 360 & Multisource
- CMDB Data Ingestion
- Asset & CI Synchronization
- Duplicate CI Management
- CMDB Workspace
- CMDB Query Builder
- CMDB Groups
- CMDB Relationships
- CMDB Business Value
- CSDM Domains
- CSDM Life Cycle
- CSDM Maturity
- Application Services

---

## 🛠️ Technical Notes

- **Pure static HTML/CSS/JS** — no server, no build step, no dependencies
- **Google Fonts** loaded from CDN (requires internet)
- **localStorage** used for progress persistence (browser-local, private)
- Works on all modern browsers (Chrome, Firefox, Safari, Edge)
- Fully responsive — works on mobile, tablet, and desktop
