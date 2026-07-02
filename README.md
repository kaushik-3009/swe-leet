# System Design Tracker

I used to grind LeetCode. Hated it at first. What kept me going was the numbers — watching my submission count climb, seeing the heatmap fill up green, knowing I hadn't broken the streak. That feedback loop turned a chore into something I actually wanted to do every day.

System design was different. There's no built-in tracker, no submission counter, no green squares. You read a chapter, watch a video, sketch an architecture — and then it's gone. No record. No momentum. I'd study for a week, take a few days off, and forget where I left up.

So I built this.

## What it does

You log what you studied and where you learned it. That's it. The app does the rest:

- **Heatmap** — a year of green squares staring back at you, daring you to break the chain
- **Weekly progress** — bar chart showing how many sessions you've logged this week, Mon–Sun
- **Stats** — total entries, study days, unique topics. Three numbers that only go up
- **Follow friends** — search by username, see their heatmap, keep each other honest

## The stack

Next.js, Tailwind, Firebase Auth, Firestore. No backend server, no Docker, no Redis. Just a frontend that talks to Firebase and a Vercel deploy that costs nothing.

## Getting started

```bash
git clone https://github.com/kaushik-3009/swe-leet.git
cd swe-leet
npm install
```

Create a `.env.local` file with your Firebase config:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

Then:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Create an account. Start logging.

## Firebase setup

1. [Create a Firebase project](https://console.firebase.google.com)
2. Enable **Authentication** → Email/Password
3. Create a **Firestore Database** (start in test mode)
4. Add a **Web App** and copy the config into `.env.local`
5. Deploy these Firestore rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /usernames/{username} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /entries/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /following/{uid}/{document=**} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid;
    }
    match /followers/{uid}/{document=**} {
      allow read: if request.auth != null;
      allow write: if true;
    }
  }
}
```

6. Create a composite index on `entries` — fields: `userId` (ASC) + `createdAt` (DESC). The app will give you a direct link if it's missing.

## Demo data

Visit `/seed` after deploying to create 5 demo users with 60 days of study data each. Good for testing the search and follow features.

## Deploy

Push to GitHub. Connect the repo on [vercel.com](https://vercel.com). Add the Firebase env vars. Deploy.

## Why this exists

The best study tool is the one you actually use. LeetCode taught me that a heatmap and a number going up is enough to build a habit. This is the same idea, for system design.
