**PRD Revision: Medication Calculator and Simplified Daily Check-In**

**1\. Updated Core Product Positioning**

The app is an iOS-first post-tonsillectomy recovery tool for parents. Its primary function is to help parents safely administer post-operative analgesia by calculating medication doses from the child's weight using an approved AMH/local hospital dosing protocol, creating a day-by-day medication schedule, and allowing parents to tick off medications as they are given.

The app also provides a simple day-by-day recovery pathway, pain faces score tracking, emergency bleeding instructions, FAQs, and follow-up advice.

**2\. Updated Core User Flow**

**Step 1: Parent Opens App**

Parent sees:

- Welcome screen
- Medical disclaimer
- Emergency warning: "If your child is bleeding after tonsillectomy, call 000 immediately."
- Explanation that the app supports the prescribed discharge plan and does not replace medical advice

**Step 2: Child Details**

Parent enters:

- Child nickname
- Age
- Weight in kg
- Surgery date
- Hospital / treating site

Weight is mandatory because medication dosing depends on it.

**Step 3: Prescribed Medication Selection**

Parent is shown a list:

- Paracetamol / Panadol
- Ibuprofen / Nurofen
- Celecoxib
- Dexamethasone
- Oxycodone
- Other medication

Parent ticks only the medications their child has actually been prescribed.

The app then generates a medication schedule using:

- Child weight
- Medication selected
- Standard AMH/local protocol dose rules
- Maximum dose limits
- Frequency limits
- Day-specific schedules where relevant

**Step 4: Review Medication Plan**

Before activation, parent sees:

- Medication name
- Calculated dose
- Frequency
- Maximum daily dose warning
- Dose times
- Duration
- Important safety notes

Parent must confirm:

"I confirm these medications were prescribed for my child and match my discharge instructions."

**Step 5: Recovery Dashboard**

Dashboard shows:

- Current recovery day
- Today's expected recovery message
- Today's pain faces check-in
- Medication schedule for today
- Next dose due
- Tick boxes for each medication dose
- Emergency button

**3\. Updated Medication Module**

**3.1 Purpose**

To help parents give prescribed medications on time and at the correct weight-based dose.

**3.2 Medication Selection**

Parent selects from:

- Paracetamol
- Ibuprofen
- Celecoxib
- Dexamethasone
- Oxycodone
- Other

Only selected medications appear in the active schedule.

**3.3 Dose Calculation**

The app calculates doses based on:

- Child's weight in kg
- AMH/local hospital protocol
- Medication-specific mg/kg dosing
- Maximum single dose
- Maximum daily dose
- Frequency restrictions
- Duration restrictions

The app should not allow users to exceed safety limits.

**3.4 Dose Display**

Each medication card should show:

- Medication name
- Dose in mg
- Dose volume in mL if liquid concentration is entered
- Frequency
- Next scheduled dose time
- Maximum doses per 24 hours
- Safety note

Example structure:

**Paracetamol**  
Dose: \[calculated dose\]  
Give: \[frequency\]  
Next dose: 12:00 pm  
Tick when given: ☐

Exact dose values must be populated from approved AMH/local protocol data.

**3.5 Liquid Concentration Handling**

For liquid medications, the app must know the concentration before giving mL instructions.

Example:

- Paracetamol liquid concentration
- Ibuprofen liquid concentration
- Oxycodone liquid concentration

If concentration is unknown, app should show dose in mg only and prompt parent to check bottle/discharge instructions.

Safety rule:

The app must not infer mL volume without a confirmed concentration.

**3.6 Dose Tick-Off**

Parents can tick each scheduled dose as:

- Given
- Skipped
- Missed

When "Given" is tapped, app records:

- Medication
- Scheduled time
- Actual time
- Dose
- Date
- Post-op day

The ticked dose should visually change state so the parent can quickly see what has already been given.

**3.7 Missed Dose Behaviour**

If a dose is missed, app should say:

"Do not give extra or double doses unless advised by your doctor or pharmacist. Check your discharge instructions or seek medical advice if unsure."

**3.8 Medication Reminder Notifications**

The app should allow reminders for each scheduled dose.

Features:

- Push notification at scheduled dose time
- Optional reminder 10-15 minutes later if not ticked
- Option to set first dose reminder 1 hour before usual wake-up time
- Option to edit medication times
- Option to pause reminders

**3.9 Medication Safety Warnings**

The app must include warnings for:

- Do not exceed maximum daily dose
- Do not double dose after a missed dose
- Avoid duplicate paracetamol-containing products
- Only use oxycodone if prescribed
- Oxycodone may cause sedation or breathing problems
- NSAIDs should only be used if prescribed and appropriate
- Follow discharge instructions if they differ from app defaults
- Contact doctor/pharmacist if unsure

**4\. Updated Daily Check-In**

**4.1 Remove Detailed Symptom Tracking**

The MVP should not include:

- Eating tracker
- Drinking tracker
- Urine output tracker
- Hydration status tracker
- Detailed symptom checklist

These can be educational content only, not daily input fields.

**4.2 Pain Faces Score**

Daily check-in should be a simple faces scale.

Parent sees:

"How sore is your child today?"

Options:

- No pain face
- Mild pain face
- Moderate pain face
- Bad pain face
- Very bad pain face
- Worst pain face

Each face can map internally to a score, but the parent-facing UI should use faces rather than numbers.

**4.3 Pain Check-In Output**

After the parent selects a face, the app shows simple guidance.

Examples:

**No/Mild Pain**

"Good. Keep following the medication plan as prescribed. Pain can still worsen over the next few days."

**Moderate Pain**

"This can be common after tonsillectomy, especially around days 4-7. Keep giving pain relief as prescribed and monitor closely."

**Bad/Very Bad Pain**

"Pain can be severe after tonsillectomy, but your child should still be able to take fluids and medications. Check that pain relief has been given as prescribed. Seek medical advice if pain remains uncontrolled or you are worried."

**Worst Pain**

"If your child's pain is not controlled despite prescribed medication, or they cannot take medications or fluids, seek urgent medical advice."

The app should still direct bleeding to emergency care regardless of pain score.

**5\. Updated Dashboard Requirements**

Dashboard should prioritise:

- Current post-op day
- Pain faces check-in
- Today's medication schedule
- Tick-off medication list
- Next dose due
- Emergency button
- Today's expected recovery card

Example dashboard:

**Day 5**  
Pain often peaks around this stage. Ear pain and bad breath can be common.

**How sore is your child today?**  
\[Faces scale\]

**Today's medications**  
☐ Panadol - 6:00 am  
☑ Nurofen - 8:00 am  
☐ Panadol - 12:00 pm  
☐ Celecoxib - 8:00 pm

**Next dose due:** Panadol at 12:00 pm

\[Emergency: Bleeding or very unwell\]

**6\. Updated Data Model**

**Child Profile**

- child_id
- nickname
- age
- weight_kg
- surgery_date
- hospital
- created_at
- updated_at

**Prescribed Medication**

- medication_id
- child_id
- medication_name
- selected_boolean
- dose_mg_per_kg
- calculated_dose_mg
- max_single_dose_mg
- max_daily_dose_mg
- frequency
- schedule_times
- start_day
- end_day
- liquid_concentration_mg_per_ml
- calculated_volume_ml
- safety_notes
- created_at
- updated_at

**Dose Log**

- dose_log_id
- medication_id
- child_id
- scheduled_datetime
- actual_datetime
- dose_mg
- dose_ml
- status: given / skipped / missed
- post_op_day
- created_at

**Pain Check-In**

- pain_checkin_id
- child_id
- date
- post_op_day
- pain_face_value
- pain_category
- created_at

**7\. Updated Clinical Logic**

**Medication Logic**

The app should:

- Calculate dose from weight
- Apply maximum single-dose limit
- Apply maximum daily-dose limit
- Apply frequency limit
- Display mg dose
- Display mL dose only when liquid concentration is confirmed
- Prevent scheduling too-frequent doses
- Warn if a dose would exceed a 24-hour maximum
- Record given doses
- Use dose history to prevent accidental double dosing

**Pain Logic**

The app should:

- Record daily faces score
- Provide reassurance for mild/moderate pain
- Encourage medical advice for uncontrolled severe pain
- Avoid detailed triage unless red flags are present
- Always keep emergency pathway visible

**Bleeding Logic**

Any report of fresh bleeding, active bleeding, vomiting blood, or clots should trigger:

**Call 000 now.**

This must override all other advice.

**8\. Updated MVP Scope**

**Included in MVP**

- iOS app
- Child profile
- Age and weight entry
- Surgery date entry
- Medication selection
- Weight-based dose calculation using approved AMH/local rules
- Medication schedule
- Medication reminders
- Dose tick-off
- Medication history
- Pain faces daily check-in
- Day 0-14 recovery timeline
- Emergency bleeding tab
- Grab-and-go checklist
- FAQ
- Follow-up/disclaimer page

**Removed from MVP**

- Eating tracker
- Drinking tracker
- Urine output tracker
- Detailed symptom diary
- Complex hydration scoring
- Parent concern scoring
- AI medical advice
- Cloud sync
- EMR integration
- Clinician messaging

**9\. Critical Build Notes for Vibe Coding**

When building this app, the medication calculator must be treated as a controlled clinical logic module.

The app needs a central dosing rules file or table, not hard-coded scattered calculations.

Suggested structure:

- medication_rules
- dose_calculator
- schedule_generator
- dose_log
- safety_validator

All dose rules should be editable by a clinician/developer and versioned.

Each medication rule should include:

- medication name
- dose mg/kg
- minimum dose, if applicable
- maximum single dose
- maximum daily dose
- frequency
- minimum interval
- allowed post-op days
- liquid concentration options
- safety warnings

The UI should never show dose calculations unless the required inputs are complete.

Required inputs:

- weight
- selected medication
- route/formulation
- liquid concentration if mL dosing is shown

**10\. Updated Vibe Coding Prompt**

Build an iOS-first mobile app called TonsilTrack for parents managing their child after tonsillectomy.

The app should help parents:

- Understand the expected 14-day recovery pathway
- Calculate medication doses from the child's weight using an approved AMH/local dosing protocol
- Select which medications were prescribed
- See a medication schedule
- Receive reminders
- Tick medications when given
- Track daily pain using a child-friendly faces scale
- Access emergency bleeding instructions immediately

Core flow:

- Welcome screen
- Medical disclaimer
- Emergency warning
- Enter child nickname, age, weight in kg, surgery date, hospital
- Select prescribed medications from paracetamol, ibuprofen, celecoxib, dexamethasone, oxycodone, other
- App calculates weight-based doses using a central medication rules table
- Parent reviews calculated medication plan and confirms it matches discharge instructions
- Home dashboard shows current recovery day, pain faces check-in, today's medication schedule, next dose due, and emergency button
- Parent ticks each medication dose when given
- App logs actual dose time
- Parent receives reminders for medication times
- Emergency tab provides bleeding instructions and says call 000 immediately

Do not include detailed daily tracking for eating, drinking, urine output, or hydration in the MVP. The only daily check-in should be pain score using faces.

Medication safety:

- Dose calculations must use child weight
- Dose rules must come from a central approved medication table
- Apply maximum single dose and maximum daily dose
- Do not show mL dose unless liquid concentration is known
- Warn against double dosing
- Warn against duplicate paracetamol-containing products
- Oxycodone should only appear if prescribed
- Parent must confirm medications match discharge instructions
- If bleeding is reported, show emergency screen: "Call 000 now"

Design:

- Calm, parent-friendly, similar to pregnancy/fertility tracking apps
- Soft rounded cards
- Clear daily timeline
- Persistent emergency button
- High-contrast emergency screens
- Simple medication tick boxes
- Faces-based pain scale rather than numbers

Store data locally for MVP.