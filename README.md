# CIS – Data Foundations Practice Test
### Certified Implementation Specialist – Data Foundations (CMDB and CSDM)

A fully static, mobile-friendly practice test with **164 unique questions** covering all core exam objectives.

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
