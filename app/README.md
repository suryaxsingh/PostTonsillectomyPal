# Post Tonsillectomy Pal — how to get the app onto a phone

This guide is written for people who don't do coding. Follow the steps in order and you will have a link that parents can open on their phone and save to their home screen like a normal app.

**Time needed:** about 15 minutes.
**Cost:** free.
**What you need:** a computer (Windows or Mac), an internet connection, an email address, and a phone to test on.

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

- [ ] Go through setup with a made-up child (for example, weight 18.5 kg).
- [ ] Check the doses on the **Review medicine plan** screen match what your clinician expects.
- [ ] On the Home screen, tap a medicine, confirm it, and check it shows as **given**.
- [ ] Close the app completely, reopen it, and check your entries are still there.
- [ ] Tap **SOS → Yes → Call 000** and check the phone offers to dial. **Don't actually call.**
- [ ] When finished, go to **Settings → Start over** to clear the test child.

---

## Things parents (and you) should know

- **Information stays on the phone.** Nothing is sent to anyone. Each phone keeps its own records. If the app is deleted, or the phone's browser data is cleared, the records are gone.
- **Reminders only work while the app is open or recently used.** Phones don't let a web app ring an alarm when it's fully closed. The red **overdue** banner on the Home screen always shows if a dose is missed. Parents should still set their own phone alarms for overnight doses.
- **The dose record can be shared.** **Settings → Download dose record** saves a file of everything that was ticked off, which a nurse or doctor can open.
- **Emergency advice is always one tap away** through the red **SOS** button.

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

The medicine rules are version **LOCAL-TONSIL-v1.0**. This version appears in the app under **Settings** and on every dose record. The app owner has confirmed that a clinician signed it off. Keep a copy of that sign-off (who, when, what version) with your clinical governance records.

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
