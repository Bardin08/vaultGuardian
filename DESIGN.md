---
name: Vault Guardian
description: A prompt-injection game drawn as a bronze vault door with one tumbler per level.
colors:
  ground: "#173a35"
  deep: "#0f2824"
  soot: "#0c1c19"
  bronze: "#b0773a"
  bronze-dark: "#8c5e2c"
  bronze-light: "#dcae6c"
  bone: "#efe6d2"
  bone-dim: "#b9c4b4"
  patina: "#27504a"
  patina-line: "#3d6259"
  patina-ink: "#c4dad3"
  ember: "#ff6a2b"
typography:
  display:
    fontFamily: "Marcellus SC, Iowan Old Style, Georgia, serif"
    fontSize: "clamp(36px, 3.6vw, 52px)"
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: "0.02em"
  wordmark:
    fontFamily: "Marcellus SC, Iowan Old Style, Georgia, serif"
    fontSize: "22px"
    fontWeight: 400
    letterSpacing: "0.14em"
  label:
    fontFamily: "Marcellus SC, Iowan Old Style, Georgia, serif"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: "0.18em"
  button:
    fontFamily: "Marcellus SC, Iowan Old Style, Georgia, serif"
    fontSize: "15px"
    fontWeight: 400
    letterSpacing: "0.18em"
  speech-guardian:
    fontFamily: "Alegreya Sans, Gill Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1.5
  speech-player:
    fontFamily: "Alegreya Sans, Gill Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Alegreya Sans, Gill Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Alegreya Sans, Gill Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  sm: "3px"
spacing:
  hair: "6px"
  tight: "12px"
  base: "18px"
  loose: "28px"
  edge: "36px"
components:
  button-primary:
    backgroundColor: "{colors.bronze}"
    textColor: "{colors.soot}"
    typography: "{typography.button}"
    rounded: "{rounded.sm}"
    padding: "12px 22px"
  button-primary-hover:
    backgroundColor: "{colors.bronze-light}"
    textColor: "{colors.soot}"
  button-quiet:
    textColor: "{colors.bone-dim}"
    typography: "{typography.label}"
    rounded: "{rounded.sm}"
    padding: "9px 14px"
  button-quiet-hover:
    textColor: "{colors.bone}"
  input:
    backgroundColor: "{colors.deep}"
    textColor: "{colors.bone}"
    typography: "{typography.body}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
  input-hub:
    backgroundColor: "{colors.soot}"
    textColor: "{colors.bone}"
    rounded: "{rounded.sm}"
    padding: "12px 14px"
  tumbler-segment-solved:
    backgroundColor: "{colors.bronze}"
    textColor: "{colors.soot}"
    rounded: "{rounded.sm}"
    height: "44px"
  tumbler-segment-live:
    backgroundColor: "{colors.ember}"
    textColor: "{colors.soot}"
    rounded: "{rounded.sm}"
    height: "44px"
  tumbler-segment-open:
    backgroundColor: "{colors.patina-line}"
    textColor: "{colors.bone}"
    rounded: "{rounded.sm}"
    height: "44px"
  tumbler-segment-locked:
    backgroundColor: "{colors.patina}"
    textColor: "{colors.patina-ink}"
    rounded: "{rounded.sm}"
    height: "44px"
  breath-pip:
    backgroundColor: "{colors.bronze}"
    width: "14px"
    height: "22px"
  panel:
    backgroundColor: "{colors.deep}"
    textColor: "{colors.bone}"
    rounded: "{rounded.sm}"
    padding: "16px"
---

# Design System: Vault Guardian

## Overview

**Creative North Star: "The Vault Door"**

The game is one object: a round vault door of patinated bronze on a verdigris ground, with one tumbler ring per level. Progress is the door turning. A solved ring is bright bronze with a bone-white notch aligned at nine o'clock, the live ring burns ember, and the rings still to come sit in dull patina with their notches loose around the dial. The password field lives in the hub of the door, so guessing the word is speaking into the lock. Everything else on the player screen is the guardian's hall beside the door: the guardian's name engraved in capitals, the wards on this level, the conversation, the breaths left, and the composer.

The world is dark, flat and metallic. There are no shadows, no glass and no imagery beyond the door itself; depth comes from three stepped greens and from bronze rules that divide the space. Type does the theatrical work: Marcellus SC, an engraved small-caps face, carries every name, label and button, and Alegreya Sans, a humanist sans with a true italic, carries speech. The guardian speaks in italic behind a bronze rule; the player speaks upright.

The operator console at `/admin` uses the same tokens in a dense tool layout: panels on the deep green, engraved uppercase headers in light bronze, and the same inputs and buttons. It has no door.

**Key Characteristics:**
- One object on the page: the door, drawn in SVG from level data, sized to `min(640px, 42vw, 78dvh)`.
- Three greens for ground and depth, bronze for structure and progress, bone for text, ember for the live tumbler and anything that stopped you.
- Engraved small caps for every label; humanist sans for speech, italic for the guardian.
- Square-ish metal: a single 3px radius everywhere, 1.5px to 2px strokes.
- Dark only (`color-scheme: dark`); there is no light theme.

## Colors

A verdigris-and-bronze palette: three greens carry the ground, one bronze family carries structure and progress, two bone tones carry text, and one hot ember carries what is live or what fired.

### Primary
- **Patinated Bronze** (bronze): Solved tumbler rings and strip segments, the primary button, the divider between door and hall, the guardian's speech rule, the ward diamonds, filled breath pips, focused input borders, and text selection.
- **Burnished Bronze** (bronze-light): Engraved text that names things: the wordmark, the "Speak the word" and "Turn the key" labels in the hub, panel headers in the console. Also links, the input caret, the focus ring, and the primary button's hover.
- **Dark Bronze** (bronze-dark): The outer rim of the door plate only.

### Secondary
- **Ember** (ember): The live tumbler (its ring on the door, its segment on the strip), the speaker label and dashed rule on a reply a ward blocked, and in the console, error text, the Delete action, the blocked verdict and the failure toast. It never fills a surface larger than a ring or a 44px segment.

### Neutral
- **Verdigris Ground** (ground): The page background and the hall. In the console, the hover and selected state of a level row.
- **Deep Verdigris** (deep): The door's backdrop, every input, console panels, and the plate and hub of the door.
- **Soot** (soot): The hub's password field, text on bronze and ember fills, and the console toast. The darkest step.
- **Patina** (patina): Locked tumbler rings and strip segments.
- **Patina Line** (patina-line): Open (unlocked, unsolved) tumblers, every hairline border (inputs, quiet buttons, panels, tabs, fieldsets), and the scrollbar thumb.
- **Patina Ink** (patina-ink): Numerals and outlined notches on open and locked tumblers.
- **Bone** (bone): Primary text and the notch on a solved ring.
- **Faded Bone** (bone-dim): Secondary text: speaker labels, ward names, the hint, the legend, the breath count, quiet buttons, placeholders.

### Named Rules
**The Door State Rule.** Every tumbler is in exactly one of four states and each state owns its colors: solved is bronze with a bone notch, live is ember with a soot notch, open is patina line with an outlined patina-ink notch, locked is patina with an outlined notch. The ring and the narrow-screen strip segment use the same mapping.

**The Ember Rule.** Ember marks the tumbler you are on and anything that stopped you. It is never decoration, never a hover color and never a background for text blocks.

**The Bronze Text Rule.** Bronze-light is for engraved labels that name a place or an action. Running text is bone or bone-dim, never bronze.

## Typography

**Display Font:** Marcellus SC (with Iowan Old Style, Georgia, serif)
**Body Font:** Alegreya Sans (with Gill Sans, Segoe UI, system-ui, sans-serif)
**Label/Mono Font:** Marcellus SC for labels; `ui-monospace` only for prompt text areas in the console.

**Character:** Marcellus SC reads as letters cut into metal, so it names things and never runs as prose. Alegreya Sans is warm and calligraphic, and its italic gives the guardian a voice distinct from the player's. Both faces are self-hosted under `public/fonts/`; Marcellus SC ships one weight (400), Alegreya Sans ships 400, 400 italic, 500 and 700.

### Hierarchy
- **Display** (Marcellus SC 400, clamp(36px, 3.6vw, 52px), 1.05, 0.02em): The guardian's name in the hall, the only `h1`. Fixed at 36px below 900px.
- **Wordmark** (Marcellus SC 400, 22px, 0.14em, uppercase): "Vault Guardian" at the top left of the door, 18px on narrow screens; the console header uses 24px.
- **Button** (Marcellus SC 400, 15px, 0.18em, uppercase): Primary buttons. Quiet buttons drop to 13px.
- **Label** (Marcellus SC 400, 12px to 14px, 0.16em to 0.22em, uppercase): Speaker labels on turns, the hub labels, the Operator link, console panel headers, tabs, field labels and fieldset legends. Tracking widens as size falls.
- **Guardian speech** (Alegreya Sans italic 400, 21px, 1.5): Replies from the guardian, behind a 2px bronze rule with 18px inset.
- **Player speech** (Alegreya Sans 400, 19px, 1.5): The player's own turns.
- **Body** (Alegreya Sans 400, 17px, 1.5): The base size; blocked replies, inputs (18px in the composer).
- **Meta** (Alegreya Sans 400, 12.5px to 15px): Ward names (14px), the italic hint (15px), notes (14.5px italic), the breath row (13.5px), the legend (13px), guess status (12.5px). Counters use `tabular-nums`.

### Named Rules
**The Engraving Rule.** Marcellus SC is always uppercase-tracked or small caps, and never sets a sentence. If it would wrap past two lines, it is the wrong face.

**The Two Voices Rule.** The guardian is italic, the player is upright, and the size step between them (21px against 19px) stays.

## Layout

On screens wider than 900px the player screen is a fixed viewport grid with no page scroll: the door takes 47% on the left and the hall 53% on the right, split by a 2px bronze rule. The door is centred in its column; the wordmark, Operator link, new-game button and progress legend are pinned to its four corners at a 36px side inset and 28px top and bottom inset. The password form is placed in the same grid cell as the door and centred on the hub, at 28% of the door's width. The hall is a column with 40px top, 56px sides and 28px bottom padding; the conversation log takes the remaining height and scrolls on its own, and the breath row, composer and "Forget this conversation" link sit at the bottom.

At 900px and below the page scrolls and stacks: door band, hall, then the password field. The SVG door is hidden and replaced by a strip of equal segments, one per level (`repeat(auto-fit, minmax(38px, 1fr))`, 44px tall), so the door keeps its states on a phone. The corner items become a small grid above and below the strip, and the password form moves to the end of the page behind a patina hairline. Side gutters are 16px.

The console is a centred column at up to 1180px with a 260px level list beside the editor, collapsing to one column at 900px.

Spacing is set in literal pixels, not variables. The recurring steps are 6px (hairline gaps: pips, wards, strip, form rows), 12px, 18px, 28px, and 36px for the door's corner inset. The conversation uses a 22px gap between turns.

## Elevation & Depth

The system is flat. There is no `box-shadow` anywhere. Depth comes from stepping the greens (ground, deep, soot, from lightest to darkest), so an input or the hub reads as a recess cut into the surface around it, and from the door backdrop, a radial gradient that lightens the green at the centre of the door and falls to deep at 70%. The only other depth cue is the tumbler rings themselves, drawn as concentric strokes separated by 4px of plate.

### Named Rules
**The Recess Rule.** Things you type into are darker than what surrounds them: inputs are deep on ground, and the hub field is soot inside a deep hub. Nothing is raised.

## Shapes

One radius, 3px, on every button, input, panel, segment and toast. Borders are 1px for structure (panels, quiet buttons, tabs), 1.5px for inputs and pips, 2px for the bronze dividers and speech rules. The door is all circles: a plate, one ring per level, a hub of 106 units in a 640-unit viewBox, and one rectangular notch per ring. An unsolved notch sits at an angle derived from the level id, somewhere across the lower right of the dial; a solved notch turns home to nine o'clock, so a finished door shows a straight line of bone notches. Breath pips are 14 by 22px parallelograms skewed 12 degrees, outlined in bronze and filled when the breath is still available. Ward markers are 6px bronze squares turned 45 degrees.

## Components

### Buttons
Engraved and quiet: every button label is Marcellus SC, uppercase and tracked.
- **Shape:** Slightly softened square ({rounded.sm}).
- **Primary:** Bronze fill with soot text, 12px 22px padding, 15px type at 0.18em. Used for Speak, Continue, Save changes, Run through pipeline.
- **Hover / Focus:** Hover lightens the fill to bronze-light over 0.15s. Focus is a 2px bronze-light outline offset 3px, shared by every focusable element. Disabled drops to 45% opacity.
- **Quiet:** Transparent with a 1px patina-line border and bone-dim text, 9px 14px, 13px type. Hover turns the text bone and the border bronze. Used for "Seal the vault · new game", Log out, and secondary console actions.
- **Text actions:** "Turn the key" is an unboxed engraved label in bronze-light under the hub field; "Forget this conversation" is a bone-dim underlined link-button. Both brighten to bone on hover.

### Inputs / Fields
- **Style:** Deep fill, 1.5px patina-line border, 3px radius, 12px 14px padding, bone text, bronze-light caret. Placeholder is bone-dim at 70%.
- **Focus:** The border turns bronze. There is no glow.
- **Hub field:** Soot fill with a bronze border at rest, centred text tracked 0.12em at weight 500. A wrong guess shakes it horizontally for 0.4s.
- **Disabled:** 55% opacity.
- **Console fields:** Engraved 12px uppercase labels above; prompt text areas switch to a 13px monospace stack.

### Conversation turns
Each turn is a speaker label in engraved bone-dim caps above the text. The guardian's reply is italic behind a 2px bronze rule. A reply a ward blocked has its label in ember, naming the ward that fired ("Stopped at the word ward · he never heard you"), and a 2px dashed ember rule, with upright bone-dim text. While a reply streams, a bronze-light caret blinks at its end.

### Breath counter
A row reading "Breaths left", then one skewed pip per remaining prompt (up to 24), then "5 of 12" in tabular figures. Filled pips are available breaths. It is hidden on levels with no prompt budget.

### Tumbler strip (narrow screens)
One 44px segment per level carrying its Roman numeral, colored by the Door State Rule, with a 14 by 5px notch bar at its foot: left and bone when solved, centred and soot when live, right and outlined when open or locked. Locked segments show a not-allowed cursor.

### The door (signature)
An SVG built from level data. Ring width adapts to the level count (up to 46 units per band, 4-unit gap); each ring carries its Roman numeral and, where it fits, the guardian's short name on an arc across the top, in Marcellus SC, sized between 11 and 16 units, and dropped entirely below 8. Rings for reachable levels are buttons; hover brightens the band 15%, focus strokes it bronze-light. Band color changes ease over 0.6s and a solved notch turns home over 1.2s.

### Console panels
Deep panels with a 1px patina-line border and 3px radius, a header strip in 13px engraved bronze-light caps over a patina hairline, and 16px body padding. Tabs are engraved labels on a hairline; the active tab turns bone with a 2px ember underline, the one ember use that falls outside the Ember Rule. Tags are 11.5px sans in a 1px hairline pill, bronze-bordered when on and half opacity when off. Toasts are soot with a 1px border that is bronze by default, bone for success and ember for failure.

## Do's and Don'ts

### Do:
- **Do** show level progress on the door or the strip using the Door State Rule; the same four states and colors in both.
- **Do** set every name, label and button in Marcellus SC uppercase with 0.12em to 0.22em tracking, and every sentence in Alegreya Sans.
- **Do** keep the guardian italic behind a 2px bronze rule and the player upright.
- **Do** use 3px corners, 1px to 2px strokes and the tokens in `public/tokens.css`; both screens load that file.
- **Do** make typing surfaces darker than their surroundings (deep on ground, soot in the hub).
- **Do** collapse the door to the segment strip at 900px and keep 44px touch targets there.

### Don't:
- **Don't** add shadows, glass, blur or glow; depth is the three greens.
- **Don't** use ember for anything that is not the live tumbler or a stop, error or destructive action.
- **Don't** set running text in bronze or in Marcellus SC.
- **Don't** introduce a second radius or a light theme.
- **Don't** add imagery, illustration or a logo; PRODUCT.md records that none exists and none may be fabricated.
