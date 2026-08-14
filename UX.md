**Tonsillectomy Recovery App**

**Screen-by-Screen UX Specification + User Flow Map**

**1\. Product UX Principle**

This app must feel like a calm, structured recovery companion for parents after paediatric tonsillectomy.

The parent may be tired, stressed, sleep-deprived, and worried. The UX should make the next action obvious.

The app should answer three questions quickly:

- **What day of recovery are we on?**
- **What medication is due next?**
- **Is this an emergency?**

Medication safety and bleeding escalation override all other design concerns.

**2\. Global Navigation Structure**

**2.1 Primary Navigation**

Bottom tab bar:

- **Home**
- **Timeline**
- **Medicines**
- **Questions**
- **Emergency**

Emergency should be visually distinct and accessible from every screen.

**2.2 Persistent Emergency Access**

A red or high-contrast **Emergency** button should be available:

- In the bottom tab bar
- On the Home dashboard
- On medication screens
- On pain check-in screens
- In the header or floating corner if feasible

Emergency access should never be hidden behind menus.

**3\. Overall User Flow Map**

**3.1 First-Time User Flow**

Open app

↓

Splash screen

↓

Welcome screen

↓

Medical disclaimer

↓

Emergency warning screen

↓

Child setup

↓

Weight confirmation

↓

Surgery details

↓

Medication selection

↓

Medication formulation/concentration selection

↓

Calculated medication plan

↓

Parent confirmation

↓

Notification permission

↓

Home dashboard

**3.2 Returning User Flow**

Open app

↓

Home dashboard

↓

See current post-op day

↓

See next medication due

↓

Tick medication as given

↓

Complete optional pain faces check-in

↓

Access timeline / questions / emergency if needed

**3.3 Medication Flow**

Medicines tab

↓

Today's medication schedule

↓

Medication dose card

↓

Parent taps "Given"

↓

Confirm dose given

↓

Dose recorded with actual time

↓

Card updates to "Given"

Alternative:

Dose overdue

↓

Card displays overdue state

↓

Parent taps "Given now" or "Skipped"

↓

App logs action

↓

If skipped/missed: show "Do not double dose" safety message

**3.4 Pain Check-In Flow**

Home dashboard

↓

Pain faces prompt

↓

Parent selects face

↓

App records pain category

↓

App gives simple day-appropriate message

↓

Return to dashboard

**3.5 Emergency Bleeding Flow**

Emergency tab OR bleeding prompt

↓

Question: "Is your child bleeding from the mouth or vomiting blood?"

↓

Yes

↓

CALL 000 NOW screen

↓

Grab-and-go checklist

↓

Nearest appropriate emergency care advice

**4\. App-Wide UI Rules**

**4.1 Tone**

Use calm, clear language.

Preferred tone:

- "Pain can be worse around this stage."
- "Keep giving medicines as prescribed."
- "Fresh bleeding after tonsillectomy can be serious. Call 000 now."

Avoid:

- Overly technical language
- Overly reassuring language during red flags
- Vague phrases like "monitor closely" without next action
- Alarmist wording unless emergency action is needed

**4.2 Visual Style**

General screens:

- Soft background
- Rounded cards
- Gentle colours
- Large readable text
- Minimal clutter
- Large buttons

Medication screens:

- Clear time blocks
- Checkbox/tick-off interaction
- Dose text prominent
- Safety warnings visible but not overwhelming

Emergency screens:

- High contrast
- Minimal content
- Large action text
- No decorative clutter
- Emergency instruction first

**4.3 Clinical Safety Design Rules**

- Emergency tab always visible
- Bleeding always escalates to 000 advice
- No dose displayed unless required data is present
- No mL dose displayed unless concentration is confirmed
- No double-dose advice
- Oxycodone always has a sedation/breathing warning
- Medication calculations must use central rules table only
- Parent must confirm medicines match discharge paperwork

**5\. Screen-by-Screen Specification**

**Screen 1: Splash Screen**

**Purpose**

Brief brand entry screen while app loads.

**UI Elements**

- App logo
- App name
- Subtext: "Post-tonsillectomy recovery support"
- Loading indicator if needed

**Navigation**

Automatically proceeds to:

- Welcome screen if first use
- Home dashboard if setup completed

**Notes**

Keep loading time minimal.

**Screen 2: Welcome Screen**

**Purpose**

Introduce the app and set expectations.

**UI Elements**

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

Primary button:

**Get started**

Secondary link:

**I already set this up**

**Navigation**

- Get started → Medical disclaimer
- Existing setup → Home dashboard

**Screen 3: Medical Disclaimer Screen**

**Purpose**

Medicolegal safety and informed use.

**UI Elements**

Title:

**Before you start**

Body:

"This app provides general post-operative support and medicine scheduling based on approved clinical rules. It does not replace your child's discharge instructions or advice from your doctor, nurse, pharmacist, surgeon, or hospital."

Safety statement:

"Always follow your child's discharge paperwork. If anything in the app appears different, check with your treating team or pharmacist."

Checkbox:

☐ I understand this app does not replace medical advice.

Primary button:

**I understand**

Button disabled until checkbox ticked.

**Navigation**

- I understand → Emergency warning screen

**Screen 4: Emergency Warning Screen**

**Purpose**

Ensure parent knows bleeding pathway before using app.

**UI Elements**

Title:

**Important emergency advice**

High-contrast card:

**If your child has fresh bleeding from the mouth, vomits blood, or brings up clots after tonsillectomy, call 000 immediately.**

Body:

"Do not wait to see if it settles. Fresh bleeding after tonsillectomy can be serious."

Primary button:

**I understand**

Secondary link:

**View emergency instructions**

**Navigation**

- I understand → Child setup
- View emergency instructions → Emergency tab preview

**Screen 5: Child Setup Screen**

**Purpose**

Collect child details required for recovery tracking and dosing.

**Fields**

- Child nickname
  - Optional but encouraged
  - Placeholder: "e.g. Sam"
- Age
  - Required
  - Input type: number
  - Unit: years
  - Could allow months for younger children later
- Weight
  - Required
  - Input type: decimal
  - Unit: kg
  - Placeholder: "e.g. 18.5"

**UI Elements**

Title:

**Tell us about your child**

Helper text:

"We use weight to calculate medicine doses from approved clinical rules."

Primary button:

**Continue**

**Validation**

- Age required
- Weight required
- Weight must be positive
- Weight must be within clinically plausible paediatric range
- If weight is very low or very high, ask for confirmation:  
   "Please check this weight. Medicine doses depend on it."

**Navigation**

- Continue → Weight confirmation screen

**Screen 6: Weight Confirmation Screen**

**Purpose**

Reduce dosing error from incorrect weight entry.

**UI Elements**

Title:

**Confirm weight**

Body:

"You entered: **\[X\] kg**"

Warning card:

"Medicine doses are calculated from this weight. Please check this matches your child's recent hospital or clinic weight."

Buttons:

- **Yes, this is correct**
- **Edit weight**

**Navigation**

- Yes, this is correct → Surgery details screen
- Edit weight → Child setup screen

**Safety Requirement**

Do not skip this screen in MVP.

**Screen 7: Surgery Details Screen**

**Purpose**

Set recovery day and local hospital context.

**Fields**

- Surgery date
  - Required
  - Date picker
- Surgery type
  - Optional
  - Options:
    - Tonsillectomy
    - Adenotonsillectomy
    - Not sure
- Hospital
  - Required for localised advice
  - Options:
    - John Hunter Hospital
    - Tamworth Hospital
    - Other

**UI Elements**

Title:

**Surgery details**

Helper text:

"We use the surgery date to show the correct recovery day."

Primary button:

**Continue**

**Validation**

- Surgery date required
- Surgery date cannot be far in the future
- If surgery date is more than 14 days ago:  
   "This app is designed for the first 14 days after surgery. You can still continue, but some recovery guidance may no longer apply."

**Navigation**

- Continue → Medication selection screen

**Screen 8: Medication Selection Screen**

**Purpose**

Parent selects only medicines prescribed at discharge.

**UI Elements**

Title:

**Which medicines were prescribed?**

Helper text:

"Only select medicines that are written on your child's discharge instructions or were prescribed by your doctor."

Medication checklist:

☐ Paracetamol / Panadol  
☐ Ibuprofen / Nurofen  
☐ Celecoxib  
☐ Dexamethasone  
☐ Oxycodone  
☐ Other medicine

Primary button:

**Continue**

Secondary link:

**I'm not sure**

**Behaviour**

- Parent can select multiple medications
- If no medicine selected, show confirmation:  
   "No medicines selected. You can continue, but the app will not create a medicine schedule."

**Navigation**

- Continue → Medication formulation screen
- I'm not sure → Safety advice modal

**"I'm Not Sure" Modal**

Text:

"Only select medicines that were prescribed or recommended for your child. If you are unsure, check your discharge paperwork or contact your pharmacist, GP, or treating team."

Buttons:

- **Go back**
- **Continue without medicines**

**Screen 9: Medication Formulation / Concentration Screen**

**Purpose**

Collect formulation details needed for safe dose display.

**Display Logic**

Shown only for selected medications.

Each medication has a card.

**Example Card: Paracetamol**

Title:

**Paracetamol / Panadol**

Fields:

- Form
  - Liquid
  - Tablet
  - Other / not sure
- If liquid selected:
  - Concentration
  - Options:
    - Common concentration option 1
    - Common concentration option 2
    - Enter manually
    - Not sure
- If tablet selected:
  - Tablet strength, if needed

Warning:

"We can only show mL doses if the liquid concentration is confirmed."

**Required Behaviour**

- If concentration confirmed → app may display mg and mL
- If concentration not confirmed → app displays mg only
- For oxycodone, require extra confirmation:  
   "Oxycodone should only be used if specifically prescribed for your child."

**Primary Button**

**Calculate medicine plan**

**Navigation**

- Calculate medicine plan → Calculated medication plan screen

**Validation**

- Medication selected but no formulation: allowed, but display mg only
- Liquid selected but concentration unknown: allowed, but no mL dose
- Manual concentration must be positive and plausible
- High-risk medication manual concentration should prompt confirmation

**Screen 10: Calculated Medication Plan Screen**

**Purpose**

Show the generated medication plan before activation.

**UI Elements**

Title:

**Review medicine plan**

Helper text:

"This plan is calculated from your child's weight and the medicines you selected. Check it against your discharge paperwork."

For each selected medication, show card:

- Medication name
- Dose in mg
- Dose in mL if concentration confirmed
- Frequency
- Minimum interval
- Maximum doses per 24 hours
- Duration / post-op days used
- Safety notes

Example layout:

**Paracetamol / Panadol**  
Dose: \[X mg\]  
Volume: \[Y mL\]  
Give: \[frequency from protocol\]  
Maximum: \[max per 24 hours\]  
Safety: Do not give other medicines containing paracetamol.

**Confirmation Checkbox**

☐ I confirm these medicines were prescribed for my child and this plan matches my discharge instructions.

**Buttons**

Primary:

**Use this medicine plan**

Secondary:

**Edit medicines**

**Validation**

- Primary button disabled until confirmation ticked
- If any medicine has missing concentration:  
   "mL dose not shown because concentration was not confirmed."

**Navigation**

- Use this medicine plan → Notification permission screen
- Edit medicines → Medication selection screen

**Screen 11: Notification Permission Screen**

**Purpose**

Enable medication reminders.

**UI Elements**

Title:

**Set reminders**

Body:

"Medicine reminders can help you stay on top of pain relief, especially overnight and early in the morning."

Options:

☐ Remind me when medicines are due  
☐ Remind me if a medicine has not been ticked off  
☐ Set first reminder before usual wake-up time

If wake-up reminder selected:

Field:

"Usual wake-up time"  
Time picker

Helper:

"We can remind you 1 hour before this time if a medicine is scheduled."

Buttons:

- **Enable reminders**
- **Skip for now**

**Navigation**

- Enable reminders → iOS permission prompt → Home dashboard
- Skip for now → Home dashboard

**Notes**

If notifications denied:

Show:

"You can still use the medicine schedule. Reminders can be turned on later in Settings."

**Screen 12: Home Dashboard**

**Purpose**

Main daily control centre.

**UI Hierarchy**

Top:

- Child nickname
- Current post-op day
- Date
- Emergency button

Main card:

**Day \[X\] after tonsillectomy**

Short day-specific message.

Example:

"Pain can be worse around this stage. Keep giving medicines as prescribed and use the emergency tab if there is any fresh bleeding."

**Sections**

**1\. Next Medicine Due**

Card:

**Next due**  
\[Medication name\]  
\[Time\]  
\[Dose mg ± mL\]

Button:

**Mark as given**

**2\. Today's Medicines**

List of scheduled doses:

☐ 6:00 am - Paracetamol - \[dose\]  
☑ 8:00 am - Ibuprofen - \[dose\]  
☐ 12:00 pm - Paracetamol - \[dose\]  
☐ 8:00 pm - Celecoxib - \[dose\]

Each item can be tapped for details.

**3\. Pain Faces Check-In**

Prompt:

**How sore is your child today?**

Faces row:

🙂 😐 😣 😢 😭

Button appears after selection:

**Save pain check-in**

**4\. Today's Recovery Tip**

Small card:

"Ear pain and bad breath can be common after tonsillectomy. Fresh bleeding is not normal - use Emergency if this happens."

**Navigation**

- Mark as given → Dose confirmation modal
- Medicine item → Dose detail modal
- Pain face → Pain result message
- Emergency button → Emergency tab
- Timeline tab → Timeline screen
- Medicines tab → Medicines screen

**Screen 13: Dose Confirmation Modal**

**Purpose**

Prevent accidental tick-off.

**UI Elements**

Title:

**Mark as given?**

Body:

"You are marking this dose as given now."

Display:

- Medication
- Scheduled time
- Actual time
- Dose mg
- Dose mL if available

Buttons:

- **Yes, given**
- **Cancel**
- **Skip dose**

**Behaviour**

If Yes:

- Record actual time
- Update dose state to given
- Return to previous screen

If Skip:

- Show skipped dose safety message

**Skipped Dose Message**

"Do not give extra or double doses unless advised by your doctor or pharmacist. Continue according to your discharge instructions or seek advice if unsure."

**Screen 14: Dose Detail Modal**

**Purpose**

Let parent review dose information.

**UI Elements**

- Medication name
- Dose
- Scheduled time
- Status:
  - Upcoming
  - Given
  - Missed
  - Skipped
- Safety notes
- Maximum dose reminder
- Edit time option if allowed

Buttons:

- Mark as given
- Skip dose
- Close

**Notes**

Editing dose amount should not be allowed from this modal in MVP. Dose changes require medicine plan edit.

**Screen 15: Pain Faces Check-In Result**

**Purpose**

Give simple response based on pain face selected.

**UI Elements**

Title:

**Pain check-in saved**

Message varies by severity.

**Mild**

"Good. Keep following the medicine plan as prescribed. Pain can still worsen over the next few days."

**Moderate**

"This can be common after tonsillectomy, especially around days 4-7. Keep giving medicines as prescribed."

**Severe**

"Pain can be severe after tonsillectomy. Check that medicines have been given as prescribed. Seek medical advice if pain remains uncontrolled or you are worried."

**Worst**

"If your child's pain is not controlled despite prescribed medicine, or they cannot take medicine, seek urgent medical advice."

Persistent note:

"If there is any fresh bleeding, use Emergency or call 000."

Button:

**Back to Home**

**Screen 16: Timeline Tab**

**Purpose**

Day-by-day recovery guide from Day 0 to Day 14.

**UI Elements**

Title:

**Recovery timeline**

Horizontal or vertical day selector:

Day 0, Day 1, Day 2 ... Day 14

Current day highlighted.

Each day card includes:

- Title
- What you might notice
- What to focus on
- When to get help
- Medicine reminder summary

**Example Day 5**

Title:

**Day 5: Pain may be near its worst**

What you might notice:

- Throat pain may be worse
- Ear pain can happen
- Bad breath can happen
- White/yellow coating in the throat can be part of healing

Focus:

- Keep giving medicines as prescribed
- Use reminders
- Stay alert for bleeding

Get help:

- Fresh bleeding
- Pain not controlled
- Unable to take medicines
- Parent seriously worried

Button:

**Go to today's medicines**

**Navigation**

- Day card medicine button → Medicines tab
- Emergency mention → Emergency tab
- User can manually browse any day

**Screen 17: Medicines Tab**

**Purpose**

Dedicated medication schedule and log.

**UI Sections**

**Header**

**Medicines**

Subtext:

"Calculated using your child's weight: \[X kg\]"

Link:

**Edit child weight**

If edit weight tapped, strong warning:

"Changing weight will recalculate medicine doses. Only change this if the previous weight was incorrect."

**Today's Schedule**

List all medication times for today.

States:

- Upcoming
- Due now
- Given
- Overdue
- Skipped

**Medication Cards**

Each selected medicine has expandable card:

- Dose
- Frequency
- Max per 24 hours
- Safety note
- Concentration status
- Active days

**Dose History**

Simple chronological log:

- 6:02 am - Paracetamol - Given
- 8:15 am - Ibuprofen - Given
- 12:30 pm - Paracetamol - Missed

**Buttons**

- Add/edit prescribed medicines
- Change reminder times
- View medicine safety notes

**Navigation**

- Add/edit medicines → Medication selection screen
- Change reminder times → Reminder settings screen
- Dose log item → Dose detail modal

**Screen 18: Edit Medicines Screen**

**Purpose**

Allow parent to update selected medications if discharge plan changes or setup was wrong.

**UI Elements**

Warning card:

"Only change medicines if your doctor, pharmacist, or discharge paperwork says to."

Medication checklist as before.

Button:

**Recalculate plan**

**Behaviour**

After changes, app shows Calculated medication plan screen again.

**Safety**

Previous dose logs should remain stored but tagged to old medication plan version.

**Screen 19: Reminder Settings Screen**

**Purpose**

Adjust medication notification preferences.

**UI Elements**

Options:

☐ Medicine due reminders  
☐ Follow-up reminder if not ticked  
☐ Wake-up reminder  
☐ Daily pain check-in reminder

Time controls:

- Default medicine times
- Wake-up time
- Reminder offset

Buttons:

- Save reminders
- Turn off all reminders

**Validation**

- Reminders cannot be scheduled closer than medication minimum interval
- Reminder times should follow generated medication schedule

**Screen 20: Questions Tab**

**Purpose**

Parent FAQ and reassurance content.

**UI Elements**

Title:

**Common questions**

Search bar:

"Search questions"

Categories:

- Pain
- Medicines
- Bleeding
- Eating and drinking
- Activity
- Throat appearance
- Follow-up

FAQ list examples:

- Why is pain worse on Day 5?
- Is ear pain normal?
- Is bad breath normal?
- Is white coating normal?
- What if my child refuses medicine?
- What if we miss a dose?
- What if my child vomits after medicine?
- What foods are okay?
- When can they go back to school?
- When should I call 000?

**FAQ Detail Page**

Each FAQ has:

- Short answer
- What is usually expected
- When to get help
- Emergency warning if relevant

Example:

Question:

**What if there is blood?**

Answer:

"Fresh bleeding after tonsillectomy can be serious. If your child has fresh bleeding from the mouth, vomits blood, or brings up clots, call 000 immediately."

Button:

**Open Emergency Instructions**

**Screen 21: Emergency Tab**

**Purpose**

Immediate action pathway.

**UI Elements**

Title:

**Emergency**

Primary question:

**Is your child bleeding from the mouth, vomiting blood, or bringing up clots?**

Buttons:

- **Yes**
- **No, but I am worried**

**If Yes**

Navigate to Call 000 screen.

**If No**

Show other urgent concern options:

- Breathing difficulty
- Very drowsy or difficult to wake
- Severe pain not controlled
- Unable to take medicine
- Parent seriously worried

Button:

**Get urgent medical help**

Text:

"If you think your child is seriously unwell, call 000 or attend an emergency department."

**Screen 22: Call 000 Bleeding Screen**

**Purpose**

Clear emergency instruction.

**UI Elements**

Large title:

**Call 000 now**

Subtitle:

"Fresh bleeding after tonsillectomy can be serious."

Action list:

- Call 000 immediately
- Sit your child upright
- Encourage them to spit blood out if safe
- Do not give food or drink
- Bring medicines and discharge paperwork
- Go to the nearest appropriate emergency department

Primary button:

**Call 000**

Secondary button:

**Show grab-and-go checklist**

**Behaviour**

Call 000 button should open phone dialler if technically allowed.

**Safety**

No reassurance message on this screen.

**Screen 23: Grab-and-Go Checklist**

**Purpose**

Help parent leave quickly.

**UI Elements**

Title:

**Grab-and-go bag**

Checklist:

☐ Discharge paperwork  
☐ Medicines  
☐ Child's Medicare details  
☐ Phone and charger  
☐ Water bottle for parent  
☐ Spare clothes  
☐ Towel or bowl  
☐ Wallet/ID  
☐ Any important medical information

Location advice card:

"During the high-risk recovery period, stay within about 1 hour of an appropriate hospital, such as John Hunter Hospital, Tamworth Hospital, your treating hospital, or a suitable emergency department."

Button:

**Back to Emergency**

**Screen 24: Follow-Up / Help Screen**

**Purpose**

Non-emergency help and disclaimer.

Could sit under Questions or Settings rather than bottom tab.

**UI Elements**

Title:

**Follow-up and help**

Sections:

- Treating hospital
- Follow-up instructions
- When to see your GP
- When to contact your surgical team
- When to use Emergency
- Disclaimer

**"See Your GP" Section**

Text:

"Some concerns can be reviewed by your GP or treating team, such as medicine questions, ongoing pain concerns, nausea, or uncertainty about recovery."

Warning:

"Bleeding after tonsillectomy is not a GP-only issue. If your child has fresh bleeding, vomiting blood, or clots, call 000."

**Screen 25: Settings Screen**

**Purpose**

Edit profile, medication plan, reminders, and app information.

**UI Elements**

Sections:

**Child profile**

- Nickname
- Age
- Weight
- Surgery date
- Hospital

**Medicines**

- Edit selected medicines
- Recalculate medicine plan
- View medication rules version

**Reminders**

- Notification settings
- Wake-up time
- Pain check-in reminder

**Safety**

- Medical disclaimer
- Emergency instructions
- Privacy policy

**App**

- About
- Version
- Clinical content version

**6\. Key Edge Cases**

**6.1 Weight Changed After Medication Plan Created**

Trigger warning:

"Changing weight will recalculate medicine doses. Only continue if the previous weight was incorrect."

Actions:

- Continue and recalculate
- Cancel

After recalculation:

- Show new medication plan
- Require parent confirmation again

**6.2 Parent Selects Medication but No Concentration**

App behaviour:

- Show mg dose only
- Do not show mL dose
- Show warning:  
   "Check the bottle or ask your pharmacist before measuring a liquid dose."

**6.3 Parent Tries to Mark Same Dose Twice**

App behaviour:

- Show:  
   "This dose has already been marked as given at \[time\]."
- Options:
  - Keep as recorded
  - Edit actual time
  - Mark as not given

**6.4 Dose Is Overdue**

App behaviour:

- Highlight overdue
- Parent can mark:
  - Given now
  - Skipped
- If skipped/missed:  
   "Do not give extra or double doses unless advised."

**6.5 Surgery Date More Than 14 Days Ago**

App behaviour:

- Allow use but warn:  
   "This app is designed for the first 14 days after surgery. If your child is still having significant symptoms, seek medical advice."

**6.6 No Medications Selected**

App behaviour:

- Allow app use
- No medication schedule
- Home dashboard focuses on timeline, pain check-in, and emergency access
- Remind:  
   "If your child was prescribed medicines, add them in the Medicines tab."

**6.7 Oxycodone Selected**

App behaviour:

- Require confirmation:  
   "Oxycodone should only be used if specifically prescribed."
- Show warning:  
   "Can cause sleepiness and breathing problems. Follow the prescribed dose exactly."
- Dose tick-off should be especially clear

**6.8 Bleeding Reported Anywhere**

If any screen has a bleeding-related prompt and parent selects fresh bleeding/clots/vomiting blood:

- Immediate navigation to Call 000 screen
- Do not show standard symptom advice first

**7\. MVP Information Architecture**

App

├── Onboarding

│ ├── Welcome

│ ├── Disclaimer

│ ├── Emergency Warning

│ ├── Child Setup

│ ├── Weight Confirmation

│ ├── Surgery Details

│ ├── Medication Selection

│ ├── Formulation / Concentration

│ ├── Calculated Plan Review

│ └── Notification Permission

│

├── Home

│ ├── Current Day Card

│ ├── Next Medicine Due

│ ├── Today's Medicines

│ ├── Pain Faces Check-In

│ └── Emergency Button

│

├── Timeline

│ ├── Day 0

│ ├── Day 1

│ ├── Day 2

│ ├── Day 3

│ ├── Day 4

│ ├── Day 5

│ ├── Day 6

│ ├── Day 7

│ ├── Day 8

│ ├── Day 9

│ ├── Day 10

│ ├── Day 11

│ ├── Day 12

│ ├── Day 13

│ └── Day 14

│

├── Medicines

│ ├── Today's Schedule

│ ├── Medication Cards

│ ├── Dose Detail

│ ├── Dose Log

│ ├── Edit Medicines

│ └── Reminder Settings

│

├── Questions

│ ├── FAQ Search

│ ├── Pain FAQs

│ ├── Medicine FAQs

│ ├── Bleeding FAQs

│ ├── Food/Drink FAQs

│ ├── Activity FAQs

│ └── Follow-Up Advice

│

├── Emergency

│ ├── Bleeding Question

│ ├── Call 000 Screen

│ ├── Other Urgent Concerns

│ └── Grab-and-Go Checklist

│

└── Settings

├── Child Profile

├── Medicine Plan

├── Reminders

├── Disclaimer

├── Privacy

└── Clinical Content Version

**8\. Build Priority**

**Must Build First**

- Onboarding
- Child weight confirmation
- Medication selection
- Dose calculation structure
- Medication plan review
- Home dashboard
- Medication tick-off
- Emergency bleeding screen

**Build Second**

- Notifications
- Timeline content
- Pain faces check-in
- FAQ
- Reminder settings

**Build Third**

- Dose history polish
- Settings
- Hospital-specific links
- Analytics
- Admin/content versioning

**9\. Prototype Success Criteria**

A clickable prototype is successful if a test parent can:

- Enter child details
- Confirm weight
- Select prescribed medicines
- Review calculated doses
- Understand that doses must match discharge paperwork
- Land on the dashboard
- See the next medicine due
- Tick a medicine as given
- Complete a pain faces check-in
- Find what Day 5 recovery might look like
- Find emergency bleeding instructions within 5 seconds
- Understand that bleeding means call 000

**10\. Developer Notes**

The medication engine should be isolated from UI.

Suggested modules:

/clinical

medicationRules.ts

doseCalculator.ts

scheduleGenerator.ts

safetyValidator.ts

/data

childProfile.ts

medicationPlan.ts

doseLog.ts

painCheckIn.ts

/screens

onboarding/

home/

timeline/

medicines/

emergency/

questions/

settings/

/components

MedicationCard

DoseCheckbox

PainFacesScale

EmergencyButton

DayCard

SafetyWarningCard

Clinical logic must be versioned.

Each generated medication plan should store:

- rule version
- child weight at time of calculation
- selected medicines
- calculated dose
- schedule
- timestamp
- parent confirmation

This allows later audit and safer debugging.