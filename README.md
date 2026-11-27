# RankPrep

Android study app for JEE Main and NEET UG aspirants, built with Expo (React Native) and Supabase.

## Features

- **PIP, a 3D animated robot tutor.** Built in three.js (`src/lib/PipRobot.tsx`). It floats and blinks, jumps and waves on a correct answer, droops on a wrong one, thinks while the AI works, and talks while answering.
- **Ask PIP.** An AI doubt solver (English or Manglish). You can also send a photo of a question.
- **For every student.** On first launch the student picks a class (Class 8, 9 or 10, Plus One, Plus Two, JEE or NEET) and a board (Kerala SCERT, CBSE or ICSE). Plus One and Plus Two get the NCERT class 11 or class 12 chapters. Classes 8–10 show "coming soon" until their question banks are added.
- **Question bank: 32,430 questions**, all bundled and working offline:
  - JEE: 9,312 questions (Physics, Chemistry, Maths).
  - NEET: Physics 9,748, Chemistry 7,944, Biology about 5,400 (all 33 NCERT chapters). JEE Physics and Chemistry MCQs are also used for NEET, but not the other way round.
  - Sources: the JEE and NEET Word banks, the Brilliant Test Series Word files, and the Brilliant NEET Biology workbook (via OCR).
  - Missing solutions were written with Gemini from the official answer key and are labelled "AI explanation". About 2,200 BTS questions and the workbook questions have no solution yet.
  - Import scripts are in `tools/qbank/`.
- **Planner** (tab), saved on the phone:
  - **Today:** a day plan with to-dos and topics to finish, each tagged by subject. Pending topics can be moved to today.
  - **Month:** monthly targets (Study / Health / Personal), marked done or missed, with carry-over.
  - **Dates:** important dates, with a notification the evening before and on the morning of the day.
  - **Journal:** a private daily note with a mood emoji.
  - **Wishlist:** things to buy, marked as got or not.
  - **Health:** water, sleep, exercise and meals, plus a week view.
- **Progress** (tab):
  - Per-subject tracker: chapters finished, test accuracy, planned topics done, and a mastery %.
  - A 5-week study calendar and a weekly review against the previous week.
  - Auto badges plus your own achievements.
  - Focus-timer minutes count towards progress.
- **Pastel look.** Soft pink, lavender, mint, peach and sky colours.
- **Practice tests.** Mixed, subject-wise or chapter-wise tests, with a difficulty filter, NTA marking (+4/−1/0), a timer, an OMR strip and a subject-wise result.
- **Streak, XP, levels and a daily goal.**
- **Weak chapters.** Chapters where you scored below 60% are listed on Home, and one tap starts a test on that chapter.
- **Formula sheets** for every subject. They work offline.
- **Syllabus heat map.** Each chapter is green (know it well), yellow (needs revision) or red (not studied), using ticks, test accuracy and revision dates.
- **Smart revision reminders.** Ticking a chapter schedules phone notifications after 3, 7 and 21 days, and Home lists the chapters due for revision.
- **Mistake notebook.** Wrong answers are saved automatically and can be tagged as a silly mistake, a concept gap or running out of time. Retrying a mistake correctly removes it.
- **Quick mini test.** 15 questions in 10 minutes.
- **Daily mood check-in.** On a tired or stressed day, the daily goal is halved.
- **Relax zone.** A 2-minute breathing exercise led by PIP, plus a 20-20-20 eye break.
- **Vent box.** A private journal kept only on the phone, never synced. Entries can be burnt with an animation or deleted. It also shows the Tele-MANAS helpline.
- **Reels-style flashcards.** Swipe up through formulas and facts.
- **Guilt-free breaks.** The focus timer suggests healthy break activities.
- **Exam countdown and focus timer.**
- **Login with cloud sync** through Supabase, or a guest mode that saves on the phone.

## Run locally

```bash
npm install
```

```bash
npx expo start
```

## Connect Supabase (login + PIP)

1. Create a Supabase project, then run `supabase/migrations/001_rankprep_init.sql` in its SQL editor.
2. Deploy the edge function `supabase/functions/pip-chat`.
3. Choose the AI model by setting the function's secrets:
   - Claude: `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY=...`
   - Gemini: `AI_PROVIDER=gemini` and `GEMINI_API_KEY=...`
   - Optional: `AI_MODEL` overrides the default model.
4. Create a `.env` file in this folder:

   ```
   EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   EXPO_PUBLIC_SUPABASE_KEY=<publishable or anon key>
   ```

5. Rebuild the app.

Without `.env`, the app runs in guest mode: everything except PIP's AI answers works offline.

## Build the APK

```bash
npx expo prebuild --platform android
```

```bash
cd android && ./gradlew assembleRelease
```

The APK is written to `android/app/build/outputs/apk/release/app-release.apk`. It is signed with the debug key, which is fine for sharing and testing. Before publishing on the Play Store, set up a real signing key (for example with `npx eas-cli build`).
