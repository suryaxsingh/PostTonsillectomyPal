# Post Tonsillectomy Pal — how to get the app onto a phone

This guide is written for people who don't do coding. Follow the steps in order and you will have a link that parents can open on their phone and save to their home screen like a normal app.

There are two ways to start:

- **Quickest:** use the ready-made app file, **`post-tonsillectomy-pal.zip`**, and start at Part 1.
- **From the code:** if you've changed the code, or want to make the app file yourself, do **Part 0** first, then skip Part 1 and continue from Part 2.

**Time needed:** about 15 minutes.
**Cost:** free.
**What you need:** a computer (Windows or Mac), an internet connection, an email address, and a phone to test on.

---

## Part 0 (optional) — Make the app file yourself from the code

You only need this if you're starting from the code (**`post-tonsillectomy-pal-source.zip`**, or the `app` folder on GitHub) instead of the ready-made app file. It takes about 15 minutes the first time.

**Step 1 — Install Node.js (one time only)**
1. Go to **https://nodejs.org**.
2. Download the version marked **LTS** and install it. Click Next/Continue through the installer and keep all the default options.

**Step 2 — Unzip the code**
1. Unzip **`post-tonsillectomy-pal-source.zip`** (right-click → Extract All on Windows; double-click on Mac).
2. Inside, you'll find a folder called **`app`**. Move it to your Desktop.

**Step 3 — Open a command window in that folder**
- **Windows:** open the `app` folder, click the address bar at the top of the window, type `cmd` and press **Enter**. A black window opens.
- **Mac:** open the **Terminal** app (search for it with Spotlight). Type `cd ` (with a space after it), drag the `app` folder into the Terminal window, and press **Enter**.

**Step 4 — Build the app**
Type these two commands, pressing **Enter** after each one. Wait for each to finish before typing the next.

```
npm install
npm run build
```

- The first command downloads what the app needs. It takes 1–3 minutes and prints a lot of text. That's normal.
- The second command makes the app. It finishes with a line ending in **"built in …"**.

**Step 5 — Find the finished app**
Inside the `app` folder there is now a folder called **`dist`**. **That `dist` folder is the app.** Use it in Part 2 wherever the guide says the `post-tonsillectomy-pal` folder, and skip Part 1.

> **Optional check before you upload:** type `npm test` and press Enter. It runs the app's safety checks and should finish with every test **passed**. If any test fails, don't upload — ask a developer to look at it.

---

## Part 1 — Get the app file

1. Download **`post-tonsillectomy-pal.zip`**. It's in the `release` folder next to this guide, or it was sent to you directly.
2. Find the zip in your **Downloads** folder.
3. Unzip it:
   - **Windows:** right-click the zip → **Extract All** → **Extract**.
   - **Mac:** double-click the zip.
4. You now have a folder called **`post-tonsillectomy-pal`**. Leave it somewhere easy to find, like your Desktop.

> Don't rename, open or change anything inside this folder. The whole folder *is* the app.

---

## Part 2 — Put the app on the internet (free, using Netlify)

Netlify is a free service that hosts small websites. It gives the app its own web address (link).

1. On your computer, go to **https://app.netlify.com/signup** and create a free account. Signing up with your email is fine.
2. Once you're signed in, go to **https://app.netlify.com/drop**.
3. You'll see a box that says something like *"Drag and drop your site output folder here"*.
4. **Drag the whole `post-tonsillectomy-pal` folder** (from Part 1) into that box.
5. Wait 10–30 seconds. Netlify shows a link that looks like `https://something-random-123.netlify.app`.
6. **That link is your app.** Copy it and save it somewhere safe.

**Optional: give it a nicer name**
On the Netlify page for your site, go to **Site configuration → Change site name**. Type something like `tonsil-pal`. Your link becomes `https://tonsil-pal.netlify.app`.

---

## Part 3 — Install it on a phone

Send the link to the phone (by text or email), open it, then:

**iPhone (use Safari)**
1. Open the link in **Safari**. Other browsers may not show the option below.
2. Tap the **Share** button (the square with an arrow pointing up).
3. Scroll down and tap **Add to Home Screen** → **Add**.

**Android (use Chrome)**
1. Open the link in **Chrome**.
2. Tap the **⋮** menu (top right).
3. Tap **Install app** or **Add to Home screen**.

An app icon called **Tonsil Pal** appears on the home screen. Open it from there from now on.

After the first time it's opened, **the app works without internet**.

---

## Part 4 — Check it works before giving it to parents

Do this once yourself on a test phone:

- [ ] Go through setup with a made-up child (for example, weight 18.5 kg). Near the end, the app asks you to **type the weight again**. It only continues when both entries match.
- [ ] Check the doses on the **Review medicine plan** screen match what your clinician expects.
- [ ] On the Home screen, tap a medicine, confirm it, and check it shows as **given**.
- [ ] Check that the **next** dose of that medicine moved to the right time (for example, paracetamol given at 8 am → next at 2 pm).
- [ ] Close the app completely, reopen it, and check your entries are still there.
- [ ] Tap **SOS → Yes → Call 000** and check the phone offers to dial. **Don't actually call.**
- [ ] When finished, go to **Settings → Start over** to clear the test child.

---

## Things parents (and you) should know

- **Information stays on the phone.** Nothing is sent to anyone. Each phone keeps its own records. If the app is deleted, or the phone's browser data is cleared, the records are gone.
- **Reminders only work while the app is open or recently used.** Phones don't let a web app ring an alarm when it's fully closed. The red **overdue** banner on the Home screen always shows if a dose is missed. Parents should still set their own phone alarms for overnight doses.
- **The dose record can be shared.** **Settings → Download dose record** saves a file of everything that was ticked off, which a nurse or doctor can open.
- **Emergency advice is always one tap away** through the red **SOS** button.
- **Tablets come in whole tablets only.** For tablets and capsules the app shows the dose as whole tablets (for example "500 mg · 1 tablet"), rounded down. If even one tablet is too strong for the child, it says so and points to the liquid instead.
- **Dose times move with the real doses.** The app works out each next dose from when the last one was actually given: paracetamol every 6 hours, ibuprofen every 8 hours, celecoxib every 12 hours. If paracetamol is first given at 8 am, the next doses show at 2 pm and 8 pm. If a dose is given late, the ones after it move later too. Overnight doses carry on into the next day.

---

## Updating the app later

If changes are made (for example, a new version of the medicine rules):

1. You'll get a new `post-tonsillectomy-pal.zip`. Unzip it as in Part 1.
2. In Netlify, open your site → **Deploys** tab.
3. Drag the new folder into the box at the bottom of that page.

The link stays the same. Phones pick up the new version the next time the app is opened with internet (sometimes it takes two openings).

> **Any change to doses or medicine rules must be signed off by a clinician again before it's uploaded.**

---

## Clinical sign-off

The medicine rules are now version **LOCAL-TONSIL-v1.1**. The version appears in the app under **Settings** and on every dose record.

- **v1.0** was signed off by a clinician (confirmed by the app owner).
- **v1.1** adds whole-tablet rounding. **It needs a clinician to sign it off before parents use it.** Tablet and capsule doses are rounded **down** to whole tablets, so a dose never goes above the weight-based amount. If one tablet is more than the child's dose, the app says tablets are too strong, suggests the liquid, and won't record a tablet dose.

| Medicine | Tablet/capsule size used |
| --- | --- |
| Paracetamol | 500 mg tablet |
| Ibuprofen | 200 mg tablet |
| Celecoxib | 100 mg capsule |
| Dexamethasone, oxycodone | Not rounded — tablet doses are shown in mg |

These sizes can be changed in the code (`src/domain/rules.ts`, the `solidUnitMg` value for each medicine).

Keep a copy of each sign-off (who, when, what version) with your clinical governance records.

---

## Getting it into the Apple App Store or Google Play (later)

The steps above give you a working app without going through the stores. Putting it *in* the stores is a bigger job:

- A developer has to wrap the app with a tool called **Capacitor**. This also makes reminders work as real alarms.
- You need an Apple Developer account (about A$149 per year) and a Google Play account (a one-off US$25).
- Apple usually expects medical-dosing apps to be published by a health organisation (for example, the health district), not an individual.
- In Australia, software that calculates medicine doses may be regulated by the **TGA** as a medical device. Check this with your health district's digital health team first.

---

<details>
<summary><b>For developers only</b> (you can ignore this section)</summary>

This is a React + TypeScript + Vite progressive web app.

```bash
npm install
npm run dev        # local dev server
npm test           # domain + UI safety tests (vitest)
npm run build      # typecheck + production build into dist/
```

To make a new upload zip: `npm run build`, then zip the contents of `dist/` into a folder called `post-tonsillectomy-pal`.

- Medicine rules: `src/domain/rules.ts`. Bump `RULE_VERSION` and get clinical sign-off for any change.
- Dose maths and caps: `src/domain/dose.ts`, `src/domain/events.ts`. Both have unit tests.
- The dose log is append-only. Undoing a dose adds a "retracted" entry instead of deleting anything.
- Data is stored in the browser's `localStorage` under the key `ptpal.state.v2`.
- The original design handoff is in `../project/design_handoff_post_tonsillectomy_pal/`.

</details>
