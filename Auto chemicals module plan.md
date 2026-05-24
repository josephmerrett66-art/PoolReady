# Auto Chemicals Module Plan

Prepared: 24 May 2026

## Working Idea

Technicians already test pool water using digital spin testers with 204 SpinDisks. The system should let a technician save each pool's volume once, then later take a photo of the test result screen. AI/OCR reads the results and the system calculates what chemicals should be added.

This should become the first major module of the pool service assistant.

## Equipment Assumption

The "204 spin disk" appears to refer to the LaMotte / WaterLink Spin Touch 204 disk, commonly listed as a chlorine/bromine plus phosphate and salt disk.

The 204 disk test parameters found in supplier documentation are:

- Free chlorine
- Total chlorine
- Bromine
- pH
- Total hardness
- Total alkalinity
- Cyanuric acid
- Copper
- Salt
- Phosphate

Sources:

- https://www.pool360.au/Product/waterlink-204-spin-disks-chlorine-bromine-100-disks-box-aus-lam-47-91005
- https://evident.co.nz/products/series-204-chlorine-bromine-plus-phosphate-salt-100-discs-box
- https://www.waterlinkspintouch.com/disks.html

## Best First Workflow

### 1. Select The Pool

The technician opens the tool and selects the customer/site/pool.

Later this can connect to ServiceM8, but the first version can start with a simple list of pools.

Each pool should store:

- Customer name
- Site address
- Pool volume
- Pool type
- Surface type
- Sanitiser type
- Salt/mineral/chlorine setup
- Filter type
- Access notes
- Preferred product set

### 2. Save Pool Volume Once

Pool volume should be entered once and saved to that pool profile.

The app should also allow later correction, because wrong pool volume will make every dose wrong.

Good options:

- Manual volume entry in litres
- Simple calculator from length, width, average depth
- Notes field for unusual shapes
- Confidence flag: estimated vs confirmed

### 3. Take Photo Of Spin Test Result

Technician takes a photo of the Spin Touch result screen or a result printout/report.

The app uses OCR/AI to extract readings such as:

- Free chlorine
- Total chlorine
- Combined chlorine if shown or calculated
- pH
- Alkalinity
- Hardness
- Cyanuric acid
- Copper
- Salt
- Phosphate

### 4. Confirm The Reading

Before calculating, the app should show the detected readings and ask the tech to confirm or edit them.

This is important. OCR can misread decimals, units, glare, screen reflections or abbreviations.

For example:

- `pH 7.8` could be misread as `pH 1.8`
- `PHOS 400 ppb` could be confused with `4000`
- `SALT 3200 ppm` could be clipped by glare

The confirmation step keeps the system useful without blindly trusting the photo.

### 5. Calculate Chemical Requirements

Once readings are confirmed, the system calculates:

- What to add
- How much to add
- Why it is needed
- Whether anything should wait until another chemical has circulated
- Whether the tech should retest
- Whether the customer should be warned or quoted for extra treatment

The calculation should use:

- Pool volume
- Current reading
- Target reading
- Product concentration
- Product form: liquid, granular, tablet, acid, buffer, salt, phosphate remover
- Company-approved dosing rules
- Maximum recommended dose per visit

### 6. Produce Technician Output

The output should be short and field-ready.

Example format:

```text
Add:
- 1.2 L liquid chlorine
- 650 g buffer
- 400 ml phosphate remover

Do not add acid this visit because alkalinity is low.
Run pump for 4 hours. Retest pH and chlorine next visit.
```

### 7. Produce Customer Note

The app should also generate a clean customer-facing note.

Example:

```text
Water test completed today. Chlorine was low and phosphate was elevated, so we treated the pool to restore sanitation and reduce algae risk. Please run the system as normal and avoid swimming until the chemicals have circulated.
```

### 8. Prepare ServiceM8 Job Note / Materials

Later, when connected to ServiceM8, the app should be able to prepare:

- Job diary note
- Customer note
- Materials/chemical line items
- Stock usage
- Follow-up task if required

The first connected version should draft these for approval before saving.

## Important Design Decisions

## Photo AI vs Direct Data Export

There are two possible ways to get the test results.

### Option A: Photo Of Result Screen

Pros:

- Works with how techs already behave on-site
- No special cable or software workflow
- Fast to prototype
- Works on phones
- Does not depend on LaMotte software access

Cons:

- OCR can misread results
- Requires a confirmation screen
- Lighting/glare can cause issues

### Option B: Export From WaterLink Software

Research found that WaterLink Connect 2 can collect test results from supported LaMotte meters over USB and export to CSV. The Spin Touch can also store test history and transfer results via Bluetooth/mobile workflows.

Pros:

- More accurate than photo reading
- Can preserve test history
- Better for bulk office review

Cons:

- More setup
- May not match field workflow
- Could depend on Windows software, subscriptions, or device pairing
- Harder to integrate immediately

Recommendation: start with **photo capture plus confirmation**, then later investigate direct import if it saves time.

Sources:

- https://softwarecenter.lamotte.com/waterlinkconnect.php
- https://www.waterlinkspintouch.com/support.html
- https://www.manualslib.com/manual/2200650/Waterlink-Spin-Touch.html

## Data To Store Per Pool

Minimum:

- Pool ID
- ServiceM8 client/company ID later
- ServiceM8 job/site ID later
- Customer name
- Address
- Pool volume in litres
- Volume confidence: estimated or confirmed
- Pool/spa flag
- Surface type
- Sanitiser type
- Salt cell/mineral system details

Recommended:

- Filter type
- Pump run time
- Usual service interval
- Usual chemical pattern
- Notes about dogs, gates, access or covers
- Preferred chemical products
- Special rules: do not use copper, avoid clarifier, customer supplies own chemicals, etc.

## Data To Store Per Test

- Pool ID
- Date and time
- Technician
- Photo file
- Raw OCR result
- Confirmed readings
- Calculated recommendations
- Actual chemicals added
- Customer note
- ServiceM8 job ID later

## First-Version Calculation Scope

Start with the most common pool service actions:

- Raise free chlorine
- Lower pH
- Raise pH
- Raise total alkalinity
- Raise calcium hardness
- Add cyanuric acid/stabiliser
- Add salt
- Treat phosphates

Do not start with every edge case. The first version should handle normal service dosing and clearly flag anything outside safe/normal limits for manual decision.

## Safety Rules Needed

The calculator should include guardrails:

- Never dose from an unconfirmed OCR result
- Flag readings outside the disk's measurable range
- Flag impossible-looking readings
- Respect maximum dose per visit
- Warn before combining incompatible products
- Warn when pH/chlorine levels are unsafe for swimming
- Warn when stabiliser/cyanuric acid is too high
- Warn when phosphate treatment should be explained to customer
- Keep a log of all recommendations and confirmations

## Suggested App Flow

```text
Open app
  -> Select today's job/pool
  -> Confirm saved pool volume
  -> Take/upload photo of Spin Touch results
  -> AI reads test results
  -> Technician confirms/edit readings
  -> App calculates chemical additions
  -> Technician confirms what was actually added
  -> App saves test history
  -> App drafts ServiceM8 note/materials
```

## What The AI Should Do

The AI should be used for:

- Reading the photo
- Understanding different result screen layouts
- Detecting missing/uncertain readings
- Drafting plain-English technician/customer notes
- Explaining why a treatment is recommended

The AI should not be the only thing doing the chemical maths.

The actual dosing calculations should be deterministic formulas using approved product data. This makes the system consistent and auditable.

## Product Setup Needed

Before accurate dosing can work, we need the exact products your business uses.

For each product:

- Product name
- ServiceM8 material name later
- Unit sold/used
- Active strength/concentration
- Dose rule from label/company procedure
- Cost
- Whether stock tracked

Examples:

- Liquid chlorine strength
- Hydrochloric acid strength
- Buffer / alkalinity increaser
- Soda ash / pH increaser
- Calcium hardness increaser
- Cyanuric acid / stabiliser
- Pool salt
- Phosphate remover strength

## Prototype Recommendation

The first prototype should be a small mobile-friendly web app:

1. Add/edit pool profile
2. Save pool volume
3. Take/upload result photo
4. AI extracts readings from the photo
5. Technician confirms the extracted readings, with the option to change any value if needed
6. Calculate treatment
7. Show technician recommended dosing
8. Automatically save test history in the background

Do ServiceM8 integration after that works reliably.

## Open Questions

1. Which exact digital spin tester model do you use?
2. Is it the LaMotte WaterLink Spin Touch?
3. Do all techs use the same 204 disk?
4. Are results normally read from the machine screen, printed, or shown in an app?
5. What chemical brands/products do you actually use?
6. Do you want recommendations based on ideal textbook ranges, your company standards, or product-label dosing?
7. Do you want the system to record what was recommended, what was actually added, or both?
8. Should it generate a customer-facing note every time?
9. Are most pools salt pools, chlorine pools, mineral pools, or mixed?
10. Do you want this as a phone web app first, or inside ServiceM8 eventually?

## Build Priority

Recommended first build:

1. Pool profile and saved volume
2. Photo result entry
3. Confirmation screen showing the extracted readings, with editable values before calculation
4. Basic dosing calculator
5. Technician recommended dosing
6. Automatic test history saved in the background
7. Optional customer-facing note
8. ServiceM8 connection later, if wanted

Manual result entry should still exist as a fallback, but it should not be the main workflow. The normal workflow should be photo first, then technician confirmation, then calculation.
