**Master Build Prompt**

**Paediatric Tonsillectomy Recovery App MVP**

You are building an iOS-first mobile app MVP called **TonsilTrack**.

The app helps parents manage their child's recovery after tonsillectomy. It provides a 14-day recovery timeline, weight-based medication dose calculation, medication reminders, dose tick-off logging, pain faces check-in, FAQs, and emergency bleeding instructions.

The app must be calm, simple, parent-friendly, and safety-first.

**1\. Tech Stack**

Build using:

- React Native
- Expo
- TypeScript
- Local storage only for MVP
- No login
- No cloud backend
- No AI medical advice
- No external medical API

Use modular architecture.

Suggested folders:

/clinical

medicationRules.ts

doseCalculator.ts

scheduleGenerator.ts

safetyValidator.ts

/data

storage.ts

childProfile.ts

medicationPlan.ts

doseLog.ts

painCheckIn.ts

/content

recoveryTimeline.ts

faqContent.ts

emergencyContent.ts

disclaimerContent.ts

/components

MedicationCard.tsx

DoseCheckbox.tsx

PainFacesScale.tsx

EmergencyButton.tsx

SafetyWarningCard.tsx

DayCard.tsx

PrimaryButton.tsx

ScreenContainer.tsx

/screens

onboarding/

home/

timeline/

medicines/

questions/

emergency/

settings/

**2\. Core App Concept**

The parent enters:

- child nickname
- age
- weight in kg
- surgery date
- hospital
- prescribed medications

The app then:

- calculates doses using approved medication rules
- creates a medication plan
- displays today's recovery day
- shows today's medicines
- allows parents to tick doses as given
- logs actual dose time
- provides a pain faces daily check-in
- provides emergency bleeding instructions

**3\. Important Safety Rules**

These rules are mandatory.

**Medication Safety**

The app must:

- calculate doses only from the structured medication rules table
- require child weight before dose calculation
- require weight confirmation before medication plan creation
- require parent confirmation that medicines were prescribed
- require parent confirmation that the medicine plan matches discharge instructions
- display mL dose only if liquid concentration is confirmed
- warn against double dosing after missed/skipped doses
- warn against duplicate paracetamol-containing medicines
- require explicit prescription confirmation for oxycodone
- treat oxycodone as PRN only, not routine scheduled medication
- store medication plan version and rule version

The app must not:

- invent medication advice
- provide AI-generated medication advice
- exceed maximum single dose
- exceed maximum doses per 24 hours
- create extra doses from reminders
- advise double doses
- show mL doses without confirmed concentration
- hide emergency instructions

**Emergency Safety**

If the user reports or selects bleeding, vomiting blood, fresh blood, or clots:

Immediately show:

**Call 000 now.**

Do not provide reassurance first.

**4\. Navigation**

Use bottom tabs:

- Home
- Timeline
- Medicines
- Questions
- Emergency

Emergency must be visually distinct.

Also include a persistent emergency button on key screens:

- Home
- Medicines
- Pain check-in
- Timeline
- Questions

**5\. First-Time User Flow**

Splash

↓

Welcome

↓

Medical Disclaimer

↓

Emergency Warning

↓

Child Setup

↓

Weight Confirmation

↓

Surgery Details

↓

Medication Selection

↓

Medication Formulation / Concentration

↓

Calculated Medication Plan Review

↓

Parent Confirmation

↓

Notification Permission / Reminder Setup

↓

Home Dashboard

**6\. Screens to Build**

**6.1 Splash Screen**

Simple app logo/name.

If setup complete, go to Home.

If setup incomplete, go to Welcome.

**6.2 Welcome Screen**

Title:

**Helping you manage recovery after tonsillectomy**

Body:

"This app helps you track your child's recovery, medicines, pain, and emergency instructions after tonsillectomy."

Bullets:

- Day-by-day recovery guide
- Medicine reminders
- Weight-based medicine plan
- Pain faces check-in
- Emergency bleeding advice

Button:

**Get started**

**6.3 Medical Disclaimer Screen**

Title:

**Before you start**

Body:

"This app provides general post-operative support and medicine scheduling based on approved clinical rules. It does not replace your child's discharge instructions or advice from your doctor, nurse, pharmacist, surgeon, or hospital."

Safety text:

"Always follow your child's discharge paperwork. If anything in the app appears different, check with your treating team or pharmacist."

Checkbox:

"I understand this app does not replace medical advice."

Button:

**I understand**

Button disabled until checkbox is ticked.

**6.4 Emergency Warning Screen**

Title:

**Important emergency advice**

High-contrast card:

**If your child has fresh bleeding from the mouth, vomits blood, or brings up clots after tonsillectomy, call 000 immediately.**

Body:

"Do not wait to see if it settles. Fresh bleeding after tonsillectomy can be serious."

Button:

**I understand**

Secondary link:

**View emergency instructions**

**6.5 Child Setup Screen**

Fields:

- child nickname, optional
- age, required
- weight in kg, required

Helper:

"We use weight to calculate medicine doses from approved clinical rules."

Validation:

- age required
- weight required
- weight must be positive
- weight must be clinically plausible
- if weight unusual, ask parent to confirm

Button:

**Continue**

**6.6 Weight Confirmation Screen**

Title:

**Confirm weight**

Body:

"You entered: \[X\] kg"

Warning:

"Medicine doses are calculated from this weight. Please check this matches your child's recent hospital or clinic weight."

Buttons:

- **Yes, this is correct**
- **Edit weight**

Do not allow medication calculation until weight is confirmed.

**6.7 Surgery Details Screen**

Fields:

- surgery date
- surgery type:
  - Tonsillectomy
  - Adenotonsillectomy
  - Not sure
- hospital:
  - John Hunter Hospital
  - Tamworth Hospital
  - Other

Use surgery date to calculate post-operative day.

If surgery date is more than 14 days ago, show:

"This app is designed for the first 14 days after surgery. You can still continue, but some recovery guidance may no longer apply."

**6.8 Medication Selection Screen**

Title:

**Which medicines were prescribed?**

Helper:

"Only select medicines that are written on your child's discharge instructions or were prescribed by your doctor."

Checklist:

- Paracetamol / Panadol
- Ibuprofen / Nurofen
- Celecoxib
- Dexamethasone
- Oxycodone
- Other medicine

If oxycodone selected, show:

"Oxycodone is a strong pain medicine. Only select this if it was specifically prescribed."

Button:

**Continue**

If no medicines selected, allow continue but show:

"No medicines selected. You can continue, but the app will not create a medicine schedule."

**6.9 Medication Formulation / Concentration Screen**

For each selected medicine, ask formulation.

Formulation options:

- Liquid
- Tablet
- Capsule
- Other / not sure

For liquid:

Ask for concentration in mg/mL or allow common presets later.

MVP can allow manual entry.

Important rule:

If concentration is not entered or unknown, display mg dose only. Do not display mL.

Copy:

"We can only show mL doses if the liquid concentration is confirmed."

Button:

**Calculate medicine plan**

**6.10 Calculated Medication Plan Review Screen**

Show each medication card with:

- medication name
- calculated dose in mg
- calculated volume in mL if concentration known
- frequency
- maximum doses per 24 hours
- max single dose
- safety notes

Checkbox:

"I confirm these medicines were prescribed for my child and this plan matches my child's discharge instructions."

Button:

**Use this medicine plan**

Button disabled until checkbox ticked.

Secondary button:

**Edit medicines**

**6.11 Reminder Setup Screen**

Ask:

- Enable medication reminders?
- Enable reminder if dose not ticked?
- Set usual wake-up time?
- Enable pain check-in reminder?

Wake-up reminder copy:

"Reminder set for 1 hour before usual wake-up time. This does not add an extra dose."

Buttons:

- **Enable reminders**
- **Skip for now**

For MVP, implement reminder settings UI. Actual push notifications can be implemented using Expo Notifications if simple.

**6.12 Home Dashboard**

This is the main screen.

Show:

- child nickname
- current post-op day
- date
- emergency button

Main card:

**Day \[X\] after tonsillectomy**

Show short recovery message from recoveryTimeline.ts.

Sections:

**Next Medicine Due**

Card:

- medication name
- time
- dose mg
- dose mL if available
- button: **Mark as given**

**Today's Medicines**

List all scheduled doses:

- checkbox
- time
- medication
- dose

States:

- upcoming
- due
- given
- overdue
- skipped

**Pain Faces Check-In**

Prompt:

**How sore is your child today?**

Faces:

- no pain
- mild pain
- moderate pain
- bad pain
- very bad pain
- worst pain

Use emoji or simple face icons.

After selection, save pain check-in.

**Today's Recovery Tip**

Short tip from day content.

**6.13 Dose Confirmation Modal**

When parent taps a medication checkbox:

Title:

**Mark as given?**

Show:

- medication
- dose
- scheduled time
- actual time now

Buttons:

- **Yes, given**
- **Cancel**
- **Skip dose**

If given:

- record actual time
- update state to given
- store in dose log

If skipped:

show:

"Do not give extra or double doses unless advised by your doctor or pharmacist. Continue according to your discharge instructions or seek advice if unsure."

**6.14 Timeline Tab**

Show Day 0 to Day 14.

Each day card includes:

- title
- what you might notice
- what to focus on
- when to get help

Example Day 5:

Title:

**Day 5: Pain may be near its worst**

Content:

"Throat pain can be worse around this stage. Ear pain and bad breath can happen. White or yellow coating in the throat can be part of healing."

Focus:

"Keep giving medicines as prescribed. Stay alert for any fresh bleeding."

Get help:

"Call 000 if there is fresh bleeding, vomiting blood, or clots."

**6.15 Medicines Tab**

Show:

- child weight used for calculation
- active medication plan
- today's schedule
- PRN oxycodone card if selected
- dose history
- edit medicines button
- reminder settings button

If parent edits weight:

Show warning:

"Changing weight will recalculate medicine doses. Only continue if the previous weight was incorrect."

Then recalculate and require confirmation again.

**6.16 Oxycodone PRN Card**

Only show if oxycodone selected.

Do not include oxycodone in routine schedule.

Card:

**Oxycodone - only if needed and prescribed**

Show:

- calculated dose
- max 5 mg per dose
- max 4 doses per 24 hours
- minimum interval 6 hours unless discharge instructions differ
- last given time

Button:

**Record oxycodone dose given**

Confirmation modal:

"You are recording an oxycodone dose. Only give this medicine if it was prescribed and your child needs it. Oxycodone can cause sleepiness and breathing problems."

Buttons:

- **Yes, given now**
- **Cancel**

Before logging, check whether 4 doses have already been logged in the last 24 hours.

If exceeded:

"Maximum recorded oxycodone doses in 24 hours reached. Do not give another dose unless advised by a doctor."

**6.17 Questions Tab**

Searchable FAQ.

Categories:

- Pain
- Medicines
- Bleeding
- Eating and drinking
- Activity
- Throat appearance
- Follow-up

FAQ examples:

- Why is pain worse around Day 5?
- Is ear pain normal?
- Is bad breath normal?
- Is white coating normal?
- What if we miss a medicine dose?
- What if my child vomits after medicine?
- What if there is blood?
- When can they go back to school?
- When should I call 000?

Any bleeding FAQ must state:

"Fresh bleeding after tonsillectomy can be serious. If your child has fresh bleeding from the mouth, vomits blood, or brings up clots, call 000 immediately."

**6.18 Emergency Tab**

Primary question:

**Is your child bleeding from the mouth, vomiting blood, or bringing up clots?**

Buttons:

- **Yes**
- **No, but I am worried**

If Yes:

Navigate to Call 000 screen.

If No:

Show urgent concern options:

- Breathing difficulty
- Very drowsy or difficult to wake
- Severe pain not controlled
- Unable to take medicine
- Parent seriously worried

Show:

"If you think your child is seriously unwell, call 000 or attend an emergency department."

**6.19 Call 000 Bleeding Screen**

High contrast.

Large title:

**Call 000 now**

Subtitle:

"Fresh bleeding after tonsillectomy can be serious."

Instructions:

- Call 000 immediately
- Sit your child upright
- Encourage them to spit blood out if safe
- Do not give food or drink
- Bring medicines and discharge paperwork
- Go to the nearest appropriate emergency department

Button:

**Call 000**

Secondary:

**Show grab-and-go checklist**

**6.20 Grab-and-Go Checklist**

Checklist:

- discharge paperwork
- medicines
- child's Medicare details
- phone and charger
- spare clothes
- towel or bowl
- wallet/ID
- important medical information

Location advice:

"During the high-risk recovery period, stay within about 1 hour of an appropriate hospital, such as John Hunter Hospital, Tamworth Hospital, your treating hospital, or a suitable emergency department."

**6.21 Settings Screen**

Sections:

- Child profile
- Surgery details
- Medicine plan
- Reminders
- Medical disclaimer
- Emergency instructions
- Privacy
- Clinical content version

**7\. Medication Rules**

Create medicationRules.ts.

Use these rules:

export const medicationRules = {

paracetamol: {

id: "paracetamol",

displayName: "Paracetamol / Panadol",

calculationType: "mg_per_kg",

mgPerKg: 15,

maxSingleDoseMg: 1000,

maxDosesIn24Hours: 4,

maxDailyDoseMg: 4000,

frequencyLabel: "QID",

dosesPerDay: 4,

minIntervalHours: 6,

preferredScheduleTimes: \["06:00", "12:00", "18:00", "22:00"\],

scheduleType: "regular",

isHighRisk: false,

requiresPrescriptionConfirmation: true,

safetyWarnings: \[

"Do not give other medicines containing paracetamol unless advised.",

"Do not give more than 4 doses in 24 hours.",

"Do not exceed 1000 mg per dose."

\]

},

ibuprofen: {

id: "ibuprofen",

displayName: "Ibuprofen / Nurofen",

calculationType: "mg_per_kg",

mgPerKg: 10,

maxSingleDoseMg: 400,

maxDosesIn24Hours: 3,

maxDailyDoseMg: 1200,

frequencyLabel: "TDS",

dosesPerDay: 3,

minIntervalHours: 8,

preferredScheduleTimes: \["08:00", "14:00", "20:00"\],

scheduleType: "regular",

isHighRisk: false,

requiresPrescriptionConfirmation: true,

safetyWarnings: \[

"Only use ibuprofen if it was prescribed or recommended for your child.",

"Do not give more than 3 doses in 24 hours.",

"Do not exceed 400 mg per dose."

\]

},

celecoxib: {

id: "celecoxib",

displayName: "Celecoxib",

calculationType: "mg_per_kg",

mgPerKg: 4,

maxSingleDoseMg: 100,

maxDosesIn24Hours: 2,

maxDailyDoseMg: 200,

frequencyLabel: "BD",

dosesPerDay: 2,

minIntervalHours: 12,

preferredScheduleTimes: \["08:00", "20:00"\],

scheduleType: "regular",

isHighRisk: false,

requiresPrescriptionConfirmation: true,

safetyWarnings: \[

"Only give celecoxib if it was prescribed.",

"Do not give more than 2 doses in 24 hours.",

"Do not exceed 100 mg per dose.",

"Do not combine with other anti-inflammatory medicines unless advised."

\]

},

dexamethasone: {

id: "dexamethasone",

displayName: "Dexamethasone",

calculationType: "mg_per_kg",

mgPerKg: 0.1,

maxSingleDoseMg: 8,

maxDosesIn24Hours: 1,

maxDailyDoseMg: 8,

frequencyLabel: "OD",

dosesPerDay: 1,

minIntervalHours: 24,

preferredScheduleTimes: \["08:00"\],

scheduleType: "selected_days",

defaultPostOpDays: \[3, 5, 7\],

alternativePostOpDays: \[4, 5, 6\],

isHighRisk: false,

requiresPrescriptionConfirmation: true,

safetyWarnings: \[

"Only give dexamethasone if prescribed.",

"Give only on the days listed in your discharge instructions.",

"Do not give more than 1 dose in 24 hours.",

"Do not exceed 8 mg per dose."

\]

},

oxycodone: {

id: "oxycodone",

displayName: "Oxycodone",

calculationType: "mg_per_kg",

mgPerKg: 0.1,

maxSingleDoseMg: 5,

maxDosesIn24Hours: 4,

maxDailyDoseMg: 20,

frequencyLabel: "PRN",

dosesPerDay: 4,

minIntervalHours: 6,

preferredScheduleTimes: \[\],

scheduleType: "prn",

isHighRisk: true,

requiresPrescriptionConfirmation: true,

safetyWarnings: \[

"Oxycodone can cause sleepiness and breathing problems.",

"Only give oxycodone if it was specifically prescribed.",

"Give only as needed and exactly as prescribed.",

"Do not give more than 4 doses in 24 hours.",

"Do not exceed 5 mg per dose.",

"Seek urgent medical help if your child is excessively sleepy, difficult to wake, or has breathing difficulty."

\]

}

};

**8\. Dose Calculator**

Create doseCalculator.ts.

Logic:

rawDoseMg = weightKg \* mgPerKg;

doseMg = Math.min(rawDoseMg, maxSingleDoseMg);

If liquid concentration exists:

doseMl = doseMg / concentrationMgPerMl;

Do not display doseMl if concentrationMgPerMl is missing.

Return:

- medicationId
- displayName
- doseMg
- doseMl optional
- frequencyLabel
- maxSingleDoseMg
- maxDailyDoseMg
- maxDosesIn24Hours
- minIntervalHours
- scheduleType
- safetyWarnings

**9\. Schedule Generator**

Regular medicines:

- paracetamol: schedule QID using preferred times
- ibuprofen: schedule TDS using preferred times
- celecoxib: schedule BD using preferred times

Dexamethasone:

- schedule only on selected post-op days
- default \[3, 5, 7\]
- allow option \[4, 5, 6\]

Oxycodone:

- do not generate routine schedule
- show PRN card only
- allow parent to record dose if given
- enforce max 4 logged doses in rolling 24 hours
- show warning if last dose < 6 hours ago

**10\. Data Objects**

Use local storage.

**Child Profile**

type ChildProfile = {

id: string;

nickname?: string;

ageYears: number;

weightKg: number;

weightConfirmed: boolean;

surgeryDate: string;

surgeryType: "tonsillectomy" | "adenotonsillectomy" | "not_sure";

hospital: "JHH" | "Tamworth" | "Other";

};

**Medication Plan**

type MedicationPlan = {

id: string;

childId: string;

weightKgAtCalculation: number;

selectedMedicationIds: string\[\];

calculatedMedications: CalculatedMedication\[\];

parentConfirmed: boolean;

createdAt: string;

ruleVersion: string;

};

**Calculated Medication**

type CalculatedMedication = {

medicationId: string;

displayName: string;

doseMg: number;

doseMl?: number;

concentrationMgPerMl?: number;

frequencyLabel: string;

maxSingleDoseMg: number;

maxDailyDoseMg: number;

maxDosesIn24Hours: number;

minIntervalHours: number;

scheduleType: "regular" | "selected_days" | "prn";

safetyWarnings: string\[\];

};

**Scheduled Dose**

type ScheduledDose = {

id: string;

medicationId: string;

displayName: string;

scheduledDateTime: string;

postOpDay: number;

doseMg: number;

doseMl?: number;

status: "upcoming" | "due" | "given" | "skipped" | "missed" | "overdue";

actualGivenDateTime?: string;

};

**Dose Log**

type DoseLog = {

id: string;

medicationId: string;

displayName: string;

scheduledDoseId?: string;

scheduledDateTime?: string;

actualDateTime: string;

doseMg: number;

doseMl?: number;

status: "given" | "skipped" | "missed";

postOpDay: number;

};

**Pain Check-In**

type PainCheckIn = {

id: string;

childId: string;

date: string;

postOpDay: number;

painFaceValue: 0 | 1 | 2 | 3 | 4 | 5;

painCategory: "none" | "mild" | "moderate" | "bad" | "very_bad" | "worst";

};

**11\. Recovery Timeline Content**

Create recoveryTimeline.ts with Day 0-14.

Each day object:

type RecoveryDay = {

day: number;

title: string;

whatYouMightNotice: string\[\];

focus: string\[\];

getHelp: string\[\];

};

Include sensible default post-tonsillectomy recovery content.

High-yield timeline:

- Day 0-1: anaesthetic recovery, sore throat, reduced appetite
- Day 2-3: pain ongoing, regular meds important
- Day 4-7: pain often worsens/peaks, ear pain/bad breath/white coating common
- Day 7-10: scabs/slough may separate, bleeding vigilance
- Day 10-14: gradual improvement, return toward normal

Every day's "get help" section must include bleeding advice.

**12\. FAQ Content**

Create faqContent.ts.

Include FAQs for:

- pain worsening
- ear pain
- bad breath
- white/yellow throat coating
- missed medicine dose
- vomiting after medicine
- blood/bleeding
- eating and drinking
- school return
- activity
- when to seek help

Any bleeding FAQ must say:

"Fresh bleeding after tonsillectomy can be serious. If your child has fresh bleeding from the mouth, vomits blood, or brings up clots, call 000 immediately."

**13\. Emergency Content**

Create emergencyContent.ts.

Primary emergency copy:

Call 000 now.

Fresh bleeding after tonsillectomy can be serious.

1\. Call 000 immediately.

2\. Sit your child upright.

3\. Encourage them to spit blood out if safe.

4\. Do not give food or drink.

5\. Bring medicines and discharge paperwork.

6\. Go to the nearest appropriate emergency department.

Grab-and-go checklist:

- discharge paperwork
- medicines
- child's Medicare details
- phone and charger
- spare clothes
- towel or bowl
- wallet/ID
- important medical information

Location copy:

"During the high-risk recovery period, stay within about 1 hour of an appropriate hospital, such as John Hunter Hospital, Tamworth Hospital, your treating hospital, or a suitable emergency department."

**14\. UI Style**

Use:

- clean mobile-first layout
- rounded cards
- large readable text
- soft non-threatening palette
- obvious emergency colour for emergency buttons/screens
- simple icons
- no dense medical blocks on dashboard
- parent-friendly microcopy

Do not make it look like a hospital EMR.

It should feel closer to a pregnancy tracker or child health companion.

**15\. Acceptance Criteria**

The MVP is complete when a user can:

- open app
- accept disclaimer
- acknowledge emergency bleeding advice
- enter child age, weight, surgery date, hospital
- confirm weight
- select prescribed medicines
- enter liquid concentration if known
- view calculated medication plan
- confirm plan matches discharge instructions
- land on dashboard
- see current post-op day
- see next medicine due
- tick medicine as given
- view dose history
- record PRN oxycodone dose if selected
- complete pain faces check-in
- browse Day 0-14 timeline
- search/read FAQs
- access emergency bleeding screen within 5 seconds
- see "Call 000 now" when bleeding is selected

**16\. Do Not Build Yet**

Do not build:

- login
- account system
- cloud sync
- clinician dashboard
- AI chatbot
- EMR integration
- payment
- analytics
- multi-child support
- Android-specific work
- complex hydration tracking
- eating tracking
- urine tracking
- parent concern scoring

**17\. Clinical Behaviour Guardrail**

Where unsure, fail safely.

If medication data is incomplete:

Show:

"This medicine cannot be calculated yet. Please check your discharge instructions or speak to your pharmacist or treating team."

If concentration is missing:

Show mg only.

If bleeding is reported:

Show "Call 000 now."

If medication dose was missed:

Do not advise catch-up or double dose.

Show:

"Do not give extra or double doses unless advised by your doctor or pharmacist."

**18\. Build Order**

Build in this order:

- app navigation
- onboarding screens
- local storage
- child profile
- medication rules
- dose calculator
- medication plan review
- dashboard
- schedule generator
- dose tick-off log
- oxycodone PRN card
- emergency tab
- timeline
- pain faces
- FAQs
- settings
- polish UI