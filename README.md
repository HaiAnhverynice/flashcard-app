# Flashcards 📚

A fast, keyboard-driven flashcard app. Upload a `.csv` or `.xlsx` file, pick a deck, and start studying. MCQ and written questions supported.

## Live Demo

> Deployed at: `https://YOUR-USERNAME.github.io/flashcard-app/`

---

## File Format

Your upload file must have these columns (see `public/demo_questions.csv` for an example):

| Column | Header (optional) | Description |
|--------|-------------------|-------------|
| A | Question | The question text |
| B | Type | `MCQ` or `written` |
| C | Answer | The correct answer |
| D+ | Choices | MCQ options (include the correct answer here too) |

**Rules:**
- MCQ questions need at least 2 choices in columns D onwards
- The `Answer` must exactly match one of the choices for MCQ
- Written questions can leave columns D+ empty
- A header row is optional (auto-detected)

**Example CSV:**
```
Question,Type,Answer,Choice A,Choice B,Choice C,Choice D
What is the capital of France?,MCQ,Paris,London,Berlin,Paris,Madrid
What year did WWII end?,written,1945,,,
```

---

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `1` `2` `3` `4` | Select MCQ option |
| `Enter` | Confirm answer / next question |

---

## Local Development

```bash
# 1. Clone the repo
git clone https://github.com/YOUR-USERNAME/flashcard-app.git
cd flashcard-app

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in your Firebase credentials (see Firebase Setup below)

# 4. Start dev server
npm run dev
```

---

## Firebase Setup

> **Note:** Firebase is optional. Without it, decks are stored in your browser's localStorage — they won't sync across devices or be visible to other users.

### Step 1 — Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → follow the setup wizard
3. In the project, go to **Firestore Database** → **Create database**
   - Choose **Start in test mode** (you can secure it later)
   - Pick a region close to you

### Step 2 — Get your config

1. Go to **Project Settings** (⚙️ icon) → **Your apps** → click the `</>` Web icon
2. Register the app → copy the `firebaseConfig` object values

### Step 3 — Local development

Paste the values into `.env.local`:
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### Step 4 — Firestore security rules (recommended)

In Firebase Console → Firestore → Rules, paste:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /decks/{deckId} {
      allow read, write: if true; // Change to auth-based rules for production
    }
  }
}
```

---

## Deploy to GitHub Pages

### Step 1 — Configure repo name in Vite

Edit `vite.config.js` and change the `base` to match your GitHub repo name:
```js
base: '/YOUR-REPO-NAME/',
```

### Step 2 — Enable GitHub Pages

In your repo: **Settings → Pages → Source → GitHub Actions**

### Step 3 — Add Firebase secrets

In your repo: **Settings → Secrets and variables → Actions → New repository secret**

Add each of these secrets:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Step 4 — Push to main

```bash
git add .
git commit -m "Initial deploy"
git push origin main
```

GitHub Actions will build and deploy automatically. ✅

---

## Tech Stack

- **React 18** + **Vite** — Frontend framework & build tool
- **Firebase Firestore** — Cloud database for deck storage
- **Papa Parse** — CSV parsing
- **SheetJS (xlsx)** — Excel file parsing
- **GitHub Actions** — CI/CD pipeline
- **GitHub Pages** — Hosting
