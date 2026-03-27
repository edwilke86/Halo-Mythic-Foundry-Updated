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

- Date: 2026-03-26
  - Reporter: @agent washington
  - Summary: Upbringings not saving mechanics updates
  - Steps to reproduce: Create new upbringing, add mechanics, save, close sheet, reopen sheet
  - Expected: Upbringing mechanics should persist and be visible after reopening sheet, should also be user friendly to edit actual mechanical usage
  - Actual: Upbringing mechanics do not persist after reopening sheet, and are not user friendly to edit for actual mechanical usage
  - Notes: We need to make sure that upbringing mechanics are properly saved and displayed in the sheet, and that they are easy for users to edit and understand in terms of their mechanical effects. This is a critical part of the character creation process and needs to be addressed before we can consider this feature complete. Since upbringings are mechanically designed to modify characteristics, this should not be too difficult to implement, but it is currently a significant gap in functionality that needs to be resolved.

---

- Date: 2026-03-27
  - Reporter: @agent washington
  - Character size should be able to be manually changed as well as automatically set from various mechanics. Right now the sheet logic determines the size category and does not let the user confirm. This should be a drop down menu. Not a text input to ensure the value also validates. 

- Date: 2026-03-27
  - Reporter: @agent washington
  - Build/version: 0.2.0-alpha.2
  - Actor type and whether newly created or existing: Newly created character
  - Exact steps to reproduce: Type 2 or more lines of text in a big text box such as GM notes and possibly other boxes, then click out of the box to confirm the text.
  - Expected result: All lines of text remain as typed.
  - Actual result: Instead, all lines of text after the first one get indented and anytime you type more text then click out of it, it gets further indented.
  - Whether issue is consistent or intermittent: Consistent.

- Date: 2026-03-27
  - Reporter: @agent washington
  - "Other" fields in the characteristics builder need to allow negative numbers to account for custom upbringings environment and lifestyle options that can reduce characteristics. Right now they only allow positive numbers which is a problem for accurately reflecting the mechanics of certain upbringings. This should be a simple fix to allow negative values in those fields, and it is important for ensuring that the sheet can properly represent the full range of character creation options available in the system. This is a medium priority issue that should be addressed before we consider the sheet to be feature complete. 
