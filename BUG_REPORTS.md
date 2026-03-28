# Bug Reports Log

Use this file to paste or write short bug reports for later review.

- Date: 2026-03-26
  - Reporter:
  - Summary:
  - Steps to reproduce:
  - Expected:
  - Actual:
  - Notes:

---

(Add new reports below this line — keep entries brief.)

---

- Date: 2026-03-27
  - Reporter: @agent washington
  - Build/version: 0.2.0-alpha.2
  - Actor type and whether newly created or existing: Newly created character
  - Exact steps to reproduce: Type 2 or more lines of text in a big text box such as GM notes and possibly other boxes, then click out of the box to confirm the text.
  - Expected result: All lines of text remain as typed.
  - Actual result: Instead, all lines of text after the first one get indented and anytime you type more text then click out of it, it gets further indented.
  - Whether issue is consistent or intermittent: Consistent.
  - Status: **Unresolved.** Multiple fix attempts made (submit-path normalization, blur-path normalization in `_onChangeForm`). Root cause suspected to be Handlebars re-render injecting whitespace from HBS template indentation context into `<textarea>` content. Possible fix: strip all whitespace between `>` and `{{` / `}}` and `</textarea>` in every actor HBS textarea. Deferred.

- Date: 2026-03-27
  - Reporter: @agent washington
  - "Other" fields in the characteristics builder need to allow negative numbers to account for custom upbringings environment and lifestyle options that can reduce characteristics. Right now they only allow positive numbers which is a problem for accurately reflecting the mechanics of certain upbringings. This should be a simple fix to allow negative values in those fields, and it is important for ensuring that the sheet can properly represent the full range of character creation options available in the system. This is a medium priority issue that should be addressed before we consider the sheet to be feature complete.
  - Status: **Resolved (2026-03-28).** Added `toWholeNumber` helper; removed `Math.max(0, ...)` clamp from the `misc` row in `normalization.mjs`; updated all `charBuilder.misc` read sites in `actor-sheet.mjs` to use `toWholeNumber` so negative values round-trip correctly through apply/remove of soldier-type bonuses (aptitude, imposing).

- Date: 2026-03-28
  - Reporter: @agent washington
  - Build/version: 0.2.0-alpha.3
  - Actor type and whether newly created or existing: Newly created group actor
  - Exact steps to reproduce: Add any amount of characters to the group
  - Expected result: It shows the correct average of the group's credits
  - Actual result: Instead, it always shows the average credits as 350 regardless of what the actual credits are.
  - Whether issue is consistent or intermittent: Consistent
  - Status: **Resolved (2026-03-28).** Group average cR calculation now uses each member's `system.equipment.credits` value correctly.

- Date: 2026-03-28
  - Reporter: @agent washington
  - Build/version: 0.2.0-alpha.3
  - Summary: Intimidation skill characteristic options updated from Special to Strength / Charisma / Leadership / Intellect.
  - Status: implemented

- Date: 2026-03-28
  - Reporter: Neo Shain
  - Build/version: 0.2.0-alpha.3
  - Actor type and whether newly created or existing: Existing and newly created group actors
  - Exact steps to reproduce: Open group sheet inventory, then drop the same item onto the inventory area multiple times.
  - Expected result: Existing inventory row stacks quantity automatically.
  - Actual result: In some flows, duplicate rows are created instead of stacking onto one row.
  - Whether issue is consistent or intermittent: Intermittent.
  - Workaround: Increase Qty manually on the existing inventory row instead of dropping duplicate copies.
  - Status: **Open.**

---
