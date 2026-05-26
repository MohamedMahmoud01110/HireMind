# HireMind — Frontend

AI-powered interview practice platform. This repo contains the React + Vite frontend.

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Start dev server  (http://localhost:5173)
npm run dev

# 3. Build for production
npm run build

# 4. Preview production build
npm run preview
```

---

## 📁 Project Structure

```
hiremind-app/
├── index.html                   # Vite entry, loads Google Fonts
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
│
└── src/
    ├── main.jsx                 # ReactDOM.createRoot entry
    ├── App.jsx                  # Root component (swap for router later)
    │
    ├── styles/
    │   └── index.css            # Tailwind directives + design tokens
    │
    ├── data/
    │   └── formOptions.js       # Job groups & skills arrays (edit data here)
    │
    ├── hooks/
    │   └── useSignupForm.js     # Form state, validation, submit logic
    │
    ├── pages/
    │   └── SignupPage.jsx       # Candidate signup page
    │
    └── components/
        ├── index.js             # Barrel export (import from '../components')
        ├── Logo.jsx             # Brand mark + wordmark
        ├── Button.jsx           # primary / ghost / outline / accent variants
        ├── FieldLabel.jsx       # Form label with optional tag
        ├── TextInput.jsx        # Text / email input with icon + error
        ├── PasswordInput.jsx    # Wraps TextInput, adds show/hide toggle
        ├── JobSelect.jsx        # Grouped <select> for job roles
        ├── SkillTags.jsx        # Multi-select pill/tag input
        ├── UploadBox.jsx        # Drag-and-drop CV uploader
        └── SuccessOverlay.jsx   # Full-screen success screen after submit
```

---

## 🧩 Component API

### `<Button>`
| Prop      | Type                                    | Default     |
|-----------|-----------------------------------------|-------------|
| variant   | `'primary' \| 'ghost' \| 'outline' \| 'accent'` | `'primary'` |
| size      | `'sm' \| 'md' \| 'lg'`                  | `'md'`      |
| fullWidth | `boolean`                               | `false`     |
| loading   | `boolean`                               | `false`     |

### `<TextInput>`
| Prop       | Type       | Notes                          |
|------------|------------|--------------------------------|
| id         | `string`   | ties to `<FieldLabel htmlFor>` |
| type       | `string`   | `'text' \| 'email' \| 'password'` |
| icon       | `string`   | emoji shown on left            |
| error      | `string`   | shown in red below the field   |
| rightSlot  | `ReactNode`| e.g. show/hide toggle button   |

### `<SkillTags>`
| Prop     | Type         | Notes                    |
|----------|--------------|--------------------------|
| selected | `string[]`   | controlled selected list |
| onToggle | `(s) => void`| called with toggled skill|

### `<UploadBox>`
| Prop   | Type          | Notes                      |
|--------|---------------|----------------------------|
| file   | `File \| null` | controlled                |
| onFile | `(f) => void` | called when file is chosen |

---

## 🔌 Connecting to a Backend

In `src/hooks/useSignupForm.js`, replace the comment in `handleSubmit`:

```js
// 🔌 Replace with your API call here:
await api.signup({ ...form, skills, cvFile })
```

---

## 🎨 Design Tokens

All CSS variables live in `src/styles/index.css`:

```css
--color-ink:          #0d1117
--color-accent:       #2563eb
--color-accent-light: #eff6ff
--color-success:      #10b981
--color-danger:       #ef4444
```

Fonts: **Sora** (headings) + **DM Sans** (body)
