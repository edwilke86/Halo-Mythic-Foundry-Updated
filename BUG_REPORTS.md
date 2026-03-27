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

## TOP PRIORITY: Characteristic Builder Reset Bug (2026-03-26)

- Reporter: F*** Hammer (Discord)
- Build/Version: 0.2.0-alpha.2
- Actor type / status: Character (newly created actors)
- Steps to reproduce:
  1. Create a new character.
  2. Choose a Soldier Type (reproven with ODST, Civilian, Colonial Militiaman).
  3. Open the Characteristics Builder and make any changes.
  4. Close the Characteristics Builder.
  5. Re-open the Characteristics Builder.
- Expected result: Creation Points allotment remains at 0 (no automatic additions to created character's custom points).
- Actual result: The builder shows added points — e.g. +25 or more are added to Characteristics on close/open (Creation Points reflect base characteristics as added values).
- Frequency: Consistent (reproducible every time in reported cases).
- Screenshot / Video: (none attached)
- Notes: Reporter describes workflow as: picks soldier type, closes builder, reopens and sees Creation Points set to base characteristics values (effectively adding points).
- I've been able to repoduce the issue, it's specifically when you click "disable builder" and then re-enable it. It is not exactly adding the base characteristics, because I did a Sanheili soldier and got all sorts of random creation points added. TOP PRIORITY.

---

- Date: 2026-03-26
  - Reporter: @agent washington
  - Summary: Upbringings not saving mechanics updates
  - Steps to reproduce: Create new upbringing, add mechanics, save, close sheet, reopen sheet
  - Expected: Upbringing mechanics should persist and be visible after reopening sheet, should also be user friendly to edit actual mechanical usage
  - Actual: Upbringing mechanics do not persist after reopening sheet, and are not user friendly to edit for actual mechanical usage
  - Notes: We need to make sure that upbringing mechanics are properly saved and displayed in the sheet, and that they are easy for users to edit and understand in terms of their mechanical effects. This is a critical part of the character creation process and needs to be addressed before we can consider this feature complete. Since upbringings are mechanically designed to modify characteristics, this should not be too difficult to implement, but it is currently a significant gap in functionality that needs to be resolved.

---

- Date: 2026-03-26
  - Reporter: @agent washington
  - Summary: Extraneous odd text characters in the various locations in teh sheet
  - Notes: Will need to sweep the entire system for these and remove them, they are likely artifacts of testing and development but they are distracting and unprofessional in the current state. This is a low priority issue but it should be addressed before we consider the sheet to be in a presentable state for wider testing or release. We should do a thorough review of the sheet and remove any placeholder text, test characters, or other extraneous text that may have been left in during development.
