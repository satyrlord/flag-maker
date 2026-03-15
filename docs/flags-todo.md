# Flag Template Review TODO

## Purpose

This file tracks the accuracy of every national flag template in `src/config/un-flags.json`
and every state-level flag template exposed through `src/config/substate-division-config.json`
and `src/templates.ts`, plus planned state-level additions tracked for future implementation,
against the reference flag on Wikipedia. It is designed for parallel work
by multiple AI agents.

## Workflow Rules

- **not started** — No agent has analyzed this entry yet. Any agent may pick it up.
- **pending** — An agent is currently working on this entry. Do NOT touch it until the working
  agent updates the status. The working agent must write its ID/name in the Agent column.
- **in review** — An agent believes the template matches Wikipedia. Only a human reviewer may
  change this status. Other agents may still read and analyze the entry and change it back to
  `not started` (or `pending` while doing so) if they find a defect — but must document the
  reason in the Notes column.
- **rejected** — A human reviewer found a defect. The entry is returned for rework. Any agent
  may pick it up again as if it were `not started`, but must read the Notes column first.
- **done** — A human has approved the entry. This entry must never be modified by any AI agent.

## Quality Standard

- The resulting template must be as close as possible to the official flag as depicted on Wikipedia.
  Prioritize correct proportions, exact colors (use official color values where documented), accurate
  overlay placement, and faithful reproduction of geometric elements.
- AI agents are allowed to fetch, import, and clean SVG symbols from Wikipedia, Wikimedia Commons,
  or any other reputable source in order to accomplish this. Cleaned SVGs should be placed in
  `public/emblems/` when used as runtime emblems, or in `src/config/symbols/svg/` with metadata in
  `src/config/symbols/metadata/*.json` when used as built-in symbols.

## Reference Priority

When sources conflict, use this order of precedence (highest first):

1. Official national or subnational specification (government-published color codes, proportions, construction sheets)
2. Wikipedia SVG source file (often based on official specs)
3. Wikipedia flag article image and description
4. Other reputable vexillological sources

For colors specifically: use officially published Pantone, RGB, or hex values when available
(many flag articles list these in an infobox or "Construction" section). Do not eyeball hex values
from a rendered image when an official value exists.

## SVG Cleaning Standards

When importing an SVG from an external source, clean it before committing:

- Remove all metadata: `<metadata>`, `<title>`, `<desc>`, editor namespaces (Inkscape, Illustrator, etc.)
- Normalize the `viewBox` to a simple origin (`0 0 W H`)
- Remove invisible or non-rendering elements (empty groups, zero-opacity paths, unused `<defs>`)
- Remove comments
- Flatten presentation attributes to inline `style` where the renderer requires it, or vice versa
  — be consistent with existing files in `public/emblems/`
- Before fetching a new SVG, always check `src/config/symbols/metadata/`, `src/config/symbols/svg/`,
  and `public/emblems/` first — the symbol may already exist under a different name

## Shared Resource Protocol

`src/config/symbols/metadata/*.json`, `src/config/symbols/svg/`, and `public/emblems/` are shared across all entries. To avoid conflicts
when multiple agents work in parallel:

- Check for an existing symbol before adding a new one
- Document every new file added to `public/emblems/` or `src/config/symbols/svg/` and every new
  symbol metadata entry in `src/config/symbols/metadata/*.json` in the Notes column of the relevant country entry
- Do not rename or delete existing symbols — other country entries may depend on them

## Renderer Capability Limits

The flag renderer supports: stripes, rectangles, circles, polygons, bands, stars, starfields,
and SVG symbols. It does NOT support gradients, drop shadows, or freeform raster textures.

If a flag element cannot be faithfully reproduced within these constraints:

- Approximate as best as possible (e.g. use the dominant solid color instead of a gradient)
- Document the limitation explicitly in the Notes column so the human reviewer is aware
- Do NOT leave the entry stuck in `pending` — approximate and submit for review

## Verification Before Submitting

Before changing a status to `in review`, an agent must verify that the template actually renders
correctly in the application:

1. Run `npm run build` (dev server on port 5173, do not start a second server if one is running)
2. Open the National and State Level template sections in the left sidebar
3. Confirm the flag preview visually matches the reference
4. Check that all emblems and symbols load and display (no broken/missing elements)

If the app cannot be run in the current environment, note this in the Notes column so the human
reviewer knows visual verification was skipped.

## Concurrency Protocol for AI Agents

1. Before picking up a `not started` (or `rejected`) entry, change its status to `pending`,
   write your agent name in the Agent column, and set the Last Updated date. Save the file
   before doing any analysis.
2. Compare the template in `un-flags.json` or the relevant state-level template in
  `substate-division-config.json` and `templates.ts` against the Wikipedia article for that flag.
  Key fields to verify: `ratio`, `orientation`, `sections`, `colors`, `weights`, `overlays`
  (type, position, size, fill, shape accuracy).
3. After correcting the JSON (or confirming it is already correct) and verifying rendering,
   update the status to `in review`, clear the Agent column, and update the Last Updated date.
   Document any changes made (or "no changes needed") in the Notes column.
4. If you abandon a task mid-way, reset the status to `not started` and clear the Agent column.

## Reference

- National JSON file: `src/config/un-flags.json`
- State-level catalog: `src/config/substate-division-config.json`
- State-level factory implementations: `src/templates.ts`
- Each entry's `id` field is the JSON key for that country or state-level template.
- Wikipedia flag articles follow the pattern: `https://en.wikipedia.org/wiki/Flag_of_<Country>`

---

## Entries

| # | Country | JSON ID | Status | Agent | Last Updated | Notes |
| --- | --------- | --------- | -------- | ------- | -------------- | ------- |
| 1 | Afghanistan | `afghanistan` | done | | 2026-03-14 | No changes needed. Ratio [1,2] (2:1), vertical tricolor black/red/green, afghanistan_emblem in gold. Matches Islamic Republic flag (last government recognized by UN). |
| 2 | Albania | `albania` | done | | 2026-03-14 | Fixed: replaced albania_emblem (coat of arms) with new albania_eagle (plain double-headed eagle). Extracted eagle paths from File:Flag_of_Albania.svg on Wikimedia Commons; added albania_eagle to symbols-config.json. Updated overlay w:80,h:90. |
| 3 | Algeria | `algeria` | done | | 2026-03-14 | Fixed: replaced 3-overlay circle+star hack with single algeria_crescent_star symbol extracted from Wikimedia Flag_of_Algeria.svg. Updated colors to official Pantone green #006633, red #D21034. |
| 4 | American Samoa | `american_samoa` | rejected | | 2026-03-14 | american_samoa_eagle symbol is correct but should be closer to the right side |
| 5 | Andorra | `andorra` | done | | 2026-03-14 | Fixed: created andorra_coa symbol from fresh Wikimedia Flag_of_Andorra.svg with CSS classes inlined as SVG attributes (fixes mangled colors from runtime-loaded emblem). Removed fill override. |
| 6 | Angola | `angola` | done | | 2026-03-14 | Fixed: created angola_flag_emblem symbol (machete+cogwheel+star) extracted from Wikimedia Flag_of_Angola.svg. Replaced angola_emblem (full coat of arms) reference. ViewBox cropped to emblem bounds, fill=currentColor for yellow. |
| 7 | Anguilla | `anguilla` | done | | 2026-03-14 | Fixed: rebuilt union_jack SVG symbol using filled polygons instead of strokes+clip-paths. Eliminates document-scoped ID conflicts and fixes diagonal cross rendering. Mathematically computed counterchanged diagonal polygon vertices. |
| 8 | Antigua and Barbuda | `antigua_and_barbuda` | rejected | | 2026-03-14 | The sun is eating a bit of the blue bar |
| 9 | Argentina | `argentina` | done | | 2026-03-14 | Fixed: ratio [5,8] -> [9,14] (official Argentine flag ratio per Law 23208). |
| 10 | Armenia | `armenia` | done | | 2026-03-14 | No changes needed. Ratio [1,2], horizontal tricolor red/blue/orange (#D90012/#0033A0/#F2A800). Colors are close to official Pantone values. |
| 11 | Australia | `australia` | rejected | | 2026-03-14 | Union jack is completely incorrect and all the stars are flattened. Also, the stars should be symbols instead of overlays. Add the correct symbols to our symbol collection and try again |
| 12 | Austria | `austria` | done | | 2026-03-14 | No changes needed. Ratio 2:3, horizontal tricolor red/white/red (#ED2939). |
| 13 | Azerbaijan | `azerbaijan` | done | | 2026-03-14 | Fixed: replaced 3-overlay circle+star hack with single azerbaijan_crescent_star symbol (crescent path + 8-pointed star). Updated colors to Pantone 2013 specs: blue #00B5E2, red #EF3340, green #509E2F. |
| 14 | Bahamas | `bahamas` | done | | 2026-03-14 | No changes needed. Ratio [1,2], horizontal tricolor aquamarine/gold/aquamarine with black triangle polygon at hoist. |
| 15 | Bahrain | `bahrain` | rejected | | 2026-03-14 | Use the construction sheet <https://en.wikipedia.org/wiki/Flag_of_Bahrain#/media/File:Flag_of_Bahrain_(construction_sheet).svg> for drawing the correct shape of the peaks |
| 16 | Bangladesh | `bangladesh` | done | | 2026-03-14 | Fixed circle aspect ratio: added h:66.67 (was h:40 same as w, causing oval on 3:5 ratio flag). Circle now renders as perfect circle. Offset x:45 matches official specification. |
| 17 | Barbados | `barbados` | done | | 2026-03-14 | Fixed: replaced barbados_emblem (coat of arms) with new barbados_trident symbol extracted from Wikimedia Flag_of_Barbados.svg. Trident uses path+use mirror, w:22 h:55. |
| 18 | Belarus | `belarus` | rejected | | 2026-03-14 | belarus_ornament symbol is not scaled correctly in relation to the top and bottom of the flag (too much white space) |
| 19 | Belgium | `belgium` | done | | 2026-03-14 | No changes needed. Ratio [13,15], vertical tricolor black/yellow/red (#000000/#FDDA24/#EF3340). |
| 20 | Belize | `belize` | done | | 2026-03-14 | Added white circle overlay (w:37,h:55 for perfect circle on 2:3 flag) behind the belize_emblem symbol. |
| 21 | Benin | `benin` | done | | 2026-03-14 | No changes needed: green base + yellow/red rectangles covering right 2/3 correctly reproduce the vertical green stripe; colors match official values (#008751, #FCD116, #E8112D). Visual verification skipped (no dev server). |
| 22 | Bermuda | `bermuda` | rejected | | 2026-03-14 | Wrong Union Jack. You inserted Portugal emblem instead of British Union Jack. |
| 23 | Bhutan | `bhutan` | rejected | | 2026-03-14 | The actual Bhutan flag has a dragon on it, not the official emblem |
| 24 | Bolivia | `bolivia` | done | | 2026-03-14 | Fixed ratio from [22,15] to [2,3] (civil flag); removed state emblem overlay (civil flag has no emblem). Colors #D52B1E/#F9E300/#007934 unchanged. Visual verification skipped. |
| 25 | Bosnia and Herzegovina | `bosnia_and_herzegovina` | rejected | | 2026-03-14 | stars have the wrong orientation |
| 26 | Botswana | `botswana` | done | | 2026-03-14 | No changes needed: 5 stripes light-blue/white/black/white/light-blue, weights 9:1:4:1:9, ratio 2:3 all correct. Color #6DA9E4 approximates Pantone 542. Visual verification skipped. |
| 27 | Brazil | `brazil` | rejected | | 2026-03-14 | Flag text is 'ORDEM E PROGRESSO' not AI slop |
| 28 | British Virgin Islands | `british_virgin_islands` | in review | | 2026-03-14 | Wrong Union Jack. You inserted Portugal emblem instead of British Union Jack. |
| 29 | Brunei | `brunei` | rejected | | 2026-03-14 | Stripes are wrong and emblem has been mangled badly. |
| 30 | Bulgaria | `bulgaria` | done | | 2026-03-14 | No changes needed: ratio 3:5, three horizontal stripes white/green/red with correct colors (#FFFFFF, #00966E, #D62612). Visual verification skipped. |
| 31 | Burkina Faso | `burkina_faso` | rejected | agent-4 | 2026-03-14 | |
| 32 | Burundi | `burundi` | rejected | agent-4 | 2026-03-14 | |
| 33 | Cabo Verde | `cabo_verde` | rejected | agent-4 | 2026-03-14 | |
| 34 | Cambodia | `cambodia` | rejected | agent-4 | 2026-03-14 | |
| 35 | Cameroon | `cameroon` | rejected | agent-4 | 2026-03-14 | |
| 36 | Canada | `canada` | rejected | agent-4 | 2026-03-14 | |
| 37 | Cayman Islands | `cayman_islands` | rejected | agent-4 | 2026-03-14 | |
| 38 | Central African Republic | `central_african_republic` | rejected | agent-4 | 2026-03-14 | |
| 39 | Chad | `chad` | rejected | agent-4 | 2026-03-14 | |
| 40 | Chile | `chile` | rejected | agent-4 | 2026-03-14 | |
| 41 | China | `china` | rejected | agent-5 | 2026-03-14 | |
| 42 | Colombia | `colombia` | rejected | agent-5 | 2026-03-14 | |
| 43 | Comoros | `comoros` | rejected | agent-5 | 2026-03-14 | |
| 44 | Congo | `congo` | rejected | agent-5 | 2026-03-14 | |
| 45 | Cook Islands | `cook_islands` | rejected | agent-5 | 2026-03-14 | |
| 46 | Costa Rica | `costa_rica` | rejected | agent-5 | 2026-03-14 | |
| 47 | Cote d'Ivoire | `cote_divoire` | rejected | agent-5 | 2026-03-14 | |
| 48 | Croatia | `croatia` | rejected | agent-5 | 2026-03-14 | |
| 49 | Cuba | `cuba` | rejected | agent-5 | 2026-03-14 | |
| 50 | Cyprus | `cyprus` | rejected | agent-5 | 2026-03-14 | |
| 51 | Czechia | `czechia` | not started | | | |
| 52 | Democratic Republic of the Congo | `democratic_republic_of_the_congo` | not started | | | |
| 53 | Denmark | `denmark` | not started | | | |
| 54 | Djibouti | `djibouti` | not started | | | |
| 55 | Dominica | `dominica` | not started | | | |
| 56 | Dominican Republic | `dominican_republic` | not started | | | |
| 57 | Ecuador | `ecuador` | not started | | | |
| 58 | Egypt | `egypt` | not started | | | |
| 59 | El Salvador | `el_salvador` | not started | | | |
| 60 | Equatorial Guinea | `equatorial_guinea` | not started | | | |
| 61 | Eritrea | `eritrea` | not started | | | |
| 62 | Estonia | `estonia` | not started | | | |
| 63 | Eswatini | `eswatini` | not started | | | |
| 64 | Ethiopia | `ethiopia` | not started | | | |
| 65 | Falkland Islands | `falkland_islands` | not started | | | |
| 66 | Fiji | `fiji` | not started | | | |
| 67 | Finland | `finland` | not started | | | |
| 68 | France | `france` | not started | | | |
| 69 | French Polynesia | `french_polynesia` | not started | | | |
| 70 | Gabon | `gabon` | not started | | | |
| 71 | Gambia | `gambia` | not started | | | |
| 72 | Georgia | `georgia` | not started | | | |
| 73 | Germany | `germany` | not started | | | |
| 74 | Ghana | `ghana` | not started | | | |
| 75 | Gibraltar | `gibraltar` | not started | | | |
| 76 | Greece | `greece` | not started | | | |
| 77 | Grenada | `grenada` | not started | | | |
| 78 | Guam | `guam` | not started | | | |
| 79 | Guatemala | `guatemala` | not started | | | |
| 80 | Guinea | `guinea` | not started | | | |
| 81 | Guinea-Bissau | `guinea_bissau` | not started | | | |
| 82 | Guyana | `guyana` | not started | | | |
| 83 | Haiti | `haiti` | not started | | | |
| 84 | Holy See | `holy_see` | not started | | | |
| 85 | Honduras | `honduras` | not started | | | |
| 86 | Hungary | `hungary` | not started | | | |
| 87 | Iceland | `iceland` | not started | | | |
| 88 | India | `india` | not started | | | |
| 89 | Indonesia | `indonesia` | not started | | | |
| 90 | Iran | `iran` | not started | | | |
| 91 | Iraq | `iraq` | not started | | | |
| 92 | Ireland | `ireland` | not started | | | |
| 93 | Israel | `israel` | not started | | | |
| 94 | Italy | `italy` | not started | | | |
| 95 | Jamaica | `jamaica` | not started | | | |
| 96 | Japan | `japan` | not started | | | |
| 97 | Jordan | `jordan` | not started | | | |
| 98 | Kazakhstan | `kazakhstan` | not started | | | |
| 99 | Kenya | `kenya` | not started | | | |
| 100 | Kiribati | `kiribati` | not started | | | |
| 101 | Kuwait | `kuwait` | not started | | | |
| 102 | Kyrgyzstan | `kyrgyzstan` | not started | | | |
| 103 | Laos | `laos` | not started | | | |
| 104 | Latvia | `latvia` | not started | | | |
| 105 | Lebanon | `lebanon` | not started | | | |
| 106 | Lesotho | `lesotho` | not started | | | |
| 107 | Liberia | `liberia` | not started | | | |
| 108 | Libya | `libya` | not started | | | |
| 109 | Liechtenstein | `liechtenstein` | not started | | | |
| 110 | Lithuania | `lithuania` | not started | | | |
| 111 | Luxembourg | `luxembourg` | not started | | | |
| 112 | Madagascar | `madagascar` | not started | | | |
| 113 | Malawi | `malawi` | not started | | | |
| 114 | Malaysia | `malaysia` | not started | | | |
| 115 | Maldives | `maldives` | not started | | | |
| 116 | Mali | `mali` | not started | | | |
| 117 | Malta | `malta` | not started | | | |
| 118 | Marshall Islands | `marshall_islands` | not started | | | |
| 119 | Mauritania | `mauritania` | not started | | | |
| 120 | Mauritius | `mauritius` | not started | | | |
| 121 | Mexico | `mexico` | not started | | | |
| 122 | Micronesia | `micronesia` | not started | | | |
| 123 | Moldova | `moldova` | not started | | | |
| 124 | Monaco | `monaco` | not started | | | |
| 125 | Mongolia | `mongolia` | not started | | | |
| 126 | Montenegro | `montenegro` | not started | | | |
| 127 | Montserrat | `montserrat` | not started | | | |
| 128 | Morocco | `morocco` | not started | | | |
| 129 | Mozambique | `mozambique` | not started | | | |
| 130 | Myanmar | `myanmar` | not started | | | |
| 131 | Namibia | `namibia` | not started | | | |
| 132 | Nauru | `nauru` | not started | | | |
| 133 | Nepal | `nepal` | not started | | | |
| 134 | Netherlands | `netherlands` | not started | | | |
| 135 | New Caledonia | `new_caledonia` | not started | | | |
| 136 | New Zealand | `new_zealand` | not started | | | |
| 137 | Nicaragua | `nicaragua` | not started | | | |
| 138 | Niger | `niger` | not started | | | |
| 139 | Nigeria | `nigeria` | not started | | | |
| 140 | Niue | `niue` | not started | | | |
| 141 | North Korea | `north_korea` | not started | | | |
| 142 | North Macedonia | `north_macedonia` | not started | | | |
| 143 | Norway | `norway` | not started | | | |
| 144 | Oman | `oman` | not started | | | |
| 145 | Pakistan | `pakistan` | not started | | | |
| 146 | Palau | `palau` | not started | | | |
| 147 | Palestine | `palestine` | not started | | | |
| 148 | Panama | `panama` | not started | | | |
| 149 | Papua New Guinea | `papua_new_guinea` | not started | | | |
| 150 | Paraguay | `paraguay` | not started | | | |
| 151 | Peru | `peru` | not started | | | |
| 152 | Philippines | `philippines` | not started | | | |
| 153 | Pitcairn | `pitcairn` | not started | | | |
| 154 | Poland | `poland` | not started | | | |
| 155 | Portugal | `portugal` | not started | | | |
| 156 | Qatar | `qatar` | not started | | | |
| 157 | Romania | `romania` | not started | | | |
| 158 | Russia | `russia` | not started | | | |
| 159 | Rwanda | `rwanda` | not started | | | |
| 160 | Saint Helena | `saint_helena` | not started | | | |
| 161 | Saint Kitts and Nevis | `saint_kitts_and_nevis` | not started | | | |
| 162 | Saint Lucia | `saint_lucia` | not started | | | |
| 163 | Saint Vincent and the Grenadines | `saint_vincent_and_the_grenadines` | not started | | | |
| 164 | Samoa | `samoa` | not started | | | |
| 165 | San Marino | `san_marino` | pending | GitHub Copilot | 2026-03-14 | Rendered in app; still needs official 2011 coat-of-arms size and light-blue color pass. |
| 166 | Sao Tome and Principe | `sao_tome_and_principe` | in review | | 2026-03-14 | Adjusted band ratio to 2:3:2 and shifted the two stars right; browser render checked. |
| 167 | Saudi Arabia | `saudi_arabia` | pending | GitHub Copilot | 2026-03-14 | Corrected field green to #005430; shahada and sword still need a construction-sheet pass. |
| 168 | Senegal | `senegal` | in review | | 2026-03-14 | Verified vertical tricolor with centered green star in browser; no changes needed. |
| 169 | Serbia | `serbia` | in review | | 2026-03-14 | Updated red and blue to cited values and moved the arms to the hoist-shifted state-flag position; browser render checked. |
| 170 | Seychelles | `seychelles` | pending | GitHub Copilot | 2026-03-14 | Still needs a geometric reconstruction from the construction sheet and official color pass. |
| 171 | Sierra Leone | `sierra_leone` | in review | | 2026-03-14 | Verified simple tricolor render in browser; no changes needed. |
| 172 | Singapore | `singapore` | pending | GitHub Copilot | 2026-03-14 | Updated red to #EE2536 and improved canton geometry, but the crescent and stars still need a construction-sheet pass. |
| 173 | Slovakia | `slovakia` | pending | GitHub Copilot | 2026-03-14 | Updated colors to official values; coat-of-arms size and vertical placement still need refinement. |
| 174 | Slovenia | `slovenia` | in review | | 2026-03-14 | Updated colors to official values and adjusted emblem placement; browser render checked. |
| 175 | Solomon Islands | `solomon_islands` | in review | | 2026-03-14 | Replaced the generic canton starfield with five explicit stars in the correct X pattern and verified the browser render. |
| 176 | Somalia | `somalia` | in review | | 2026-03-14 | Updated the field to the lighter official blue `#418FDE`; centered white star render checked in browser. |
| 177 | South Africa | `south_africa` | in review | | 2026-03-14 | Moved the Y junction to the flag center and verified the updated geometry in browser; template test was updated to match the corrected construction. |
| 178 | South Korea | `south_korea` | in review | | 2026-03-14 | Corrected taegeuk sizing plus trigram scale, placement, and rotation; browser render now matches the standard layout much more closely. |
| 179 | South Sudan | `south_sudan` | in review | | 2026-03-14 | Updated the hoist triangle to a lighter blue equilateral construction and checked the live render with the upright gold star. |
| 180 | Spain | `spain` | in review | | 2026-03-14 | Updated the red and yellow to official values and enlarged/repositioned the coat of arms; browser render checked. |
| 181 | Sri Lanka | `sri_lanka` | pending | GitHub Copilot | 2026-03-14 | Corrected the field colors, stripe order, and gold border layout, but the current symbol is still the national emblem rather than the lion-flag device and needs a dedicated replacement. |
| 182 | Sudan | `sudan` | in review | | 2026-03-14 | Browser render checked; current red-white-black triband with green hoist triangle already matches the modern flag well. |
| 183 | Suriname | `suriname` | in review | | 2026-03-14 | Verified the existing stripe proportions, centered yellow star, and official colors in browser; no changes needed. |
| 184 | Sweden | `sweden` | in review | | 2026-03-14 | Updated the blue and yellow plus the Nordic cross proportions to the official 5:2:9 by 4:2:4 construction and verified the browser render. |
| 185 | Switzerland | `switzerland` | in review | | 2026-03-14 | Tightened the Swiss cross to the modern 20:32 field ratio on a square flag and verified the corrected render in browser. |
| 186 | Syria | `syria` | in review | | 2026-03-14 | Updated the template to the current green-white-black flag with three red stars and checked the live browser render. |
| 187 | Tajikistan | `tajikistan` | pending | GitHub Copilot | 2026-03-14 | |
| 188 | Tanzania | `tanzania` | pending | GitHub Copilot | 2026-03-14 | |
| 189 | Thailand | `thailand` | pending | GitHub Copilot | 2026-03-14 | |
| 190 | Timor-Leste | `timor_leste` | pending | GitHub Copilot | 2026-03-14 | |
| 191 | Togo | `togo` | pending | GitHub Copilot | 2026-03-14 | |
| 192 | Tokelau | `tokelau` | pending | GitHub Copilot | 2026-03-14 | |
| 193 | Tonga | `tonga` | pending | GitHub Copilot | 2026-03-14 | |
| 194 | Trinidad and Tobago | `trinidad_and_tobago` | pending | GitHub Copilot | 2026-03-14 | |
| 195 | Tunisia | `tunisia` | pending | GitHub Copilot | 2026-03-14 | |
| 196 | Turkey | `turkey` | pending | GitHub Copilot | 2026-03-14 | |
| 197 | Turkmenistan | `turkmenistan` | pending | GitHub Copilot | 2026-03-14 | |
| 198 | Turks and Caicos Islands | `turks_and_caicos_islands` | pending | GitHub Copilot | 2026-03-14 | |
| 199 | Tuvalu | `tuvalu` | pending | GitHub Copilot | 2026-03-14 | |
| 200 | Uganda | `uganda` | pending | GitHub Copilot | 2026-03-14 | |
| 201 | Ukraine | `ukraine` | pending | GitHub Copilot | 2026-03-14 | |
| 202 | United Arab Emirates | `united_arab_emirates` | pending | GitHub Copilot | 2026-03-14 | |
| 203 | United Kingdom | `united_kingdom` | pending | GitHub Copilot | 2026-03-14 | |
| 204 | United States | `united_states` | pending | GitHub Copilot | 2026-03-14 | |
| 205 | United States Virgin Islands | `united_states_virgin_islands` | pending | GitHub Copilot | 2026-03-14 | |
| 206 | Uruguay | `uruguay` | pending | GitHub Copilot | 2026-03-14 | |
| 207 | Uzbekistan | `uzbekistan` | pending | GitHub Copilot | 2026-03-14 | |
| 208 | Vanuatu | `vanuatu` | pending | GitHub Copilot | 2026-03-14 | |
| 209 | Venezuela | `venezuela` | pending | GitHub Copilot | 2026-03-14 | |
| 210 | Vietnam | `vietnam` | pending | GitHub Copilot | 2026-03-14 | |
| 211 | Western Sahara | `western_sahara` | pending | GitHub Copilot | 2026-03-14 | |
| 212 | Yemen | `yemen` | pending | GitHub Copilot | 2026-03-14 | |
| 213 | Zambia | `zambia` | pending | GitHub Copilot | 2026-03-14 | |
| 214 | Zimbabwe | `zimbabwe` | pending | GitHub Copilot | 2026-03-14 | |
| 215 | England | `england` | done | GitHub Copilot | 2026-03-14 | The thickness and proportions of the cross are all wrong |
| 216 | Scotland | `scotland` | done | GitHub Copilot | 2026-03-14 | Updated the Saltire to the modern Pantone 300 web color (`#005EB8`) with a fuller common-width diagonal on the 3:5 ratio. |
| 217 | Wales | `wales` | done | GitHub Copilot | 2026-03-14 | The dragon is facing the wrong way and it looks different from the official version <https://en.wikipedia.org/wiki/Flag_of_Wales#/media/File:Flag_of_Wales.svg> |
| 218 | Northern Ireland | `northern_ireland` | done | GitHub Copilot | 2026-03-14 | Replaced the placeholder saltire with an Ulster Banner-based template; note that Northern Ireland has no current official local-only flag, so this uses the historical flag still seen in some sporting contexts. |
| 219 | Catalunya | `catalunya` | done | GitHub Copilot | 2026-03-14 | Reviewed against the Senyera reference; the existing 2:3 four-bars implementation was already correct. |
| 220 | Euskadi | `euskadi` | done | GitHub Copilot | 2026-03-14 | The thickness and proportions of the white cross are all wrong |
| 221 | Bavaria | `bavaria` | done | GitHub Copilot | 2026-03-14 | Fixed lozengy SVG: corrected blue color (#75AADB to #0077B6) and changed pattern width from 200 to 285.714 for proper 7-column layout matching the standard Bavarian flag. |
| 222 | Aland | `aland` | done | GitHub Copilot | 2026-03-14 | Added the official 17:26 yellow-fimbriated red Nordic cross on blue using the Wikimedia SVG geometry; focused tests and browser render checked. |
| 223 | Guernsey | `guernsey` | done | GitHub Copilot | 2026-03-14 | Cross is not accurate <https://en.wikipedia.org/wiki/Guernsey#/media/File:Flag_of_Guernsey.svg> |
| 224 | Jersey | `jersey` | done | GitHub Copilot | 2026-03-15 | Replaced the placeholder saltire with the current full-flag Jersey SVG so the crown shield above the red saltire now renders with the source proportions intact. |
| 225 | Faroe Islands | `faroe_islands` | done | GitHub Copilot | 2026-03-14 | Added the official 8:11 blue-fimbriated red Nordic cross on white from the current Wikimedia SVG construction; focused tests and browser render checked. |
| 226 | Greenland | `greenland` | done | GitHub Copilot | 2026-03-14 | Added the official 2:3 white-red bicolour with the off-centre counterchanged disk using normalized custom paths from the Wikimedia SVG geometry; focused tests and browser render checked. |
| 227 | Isle of Man | `isle_of_man` | done | GitHub Copilot | 2026-03-15 | Switched the template to the full current Wikimedia flag artwork so the central golden triskelion now renders instead of the plain red field placeholder. |
| 228 | Baden-Wurttemberg | `baden_wurttemberg` | done | GitHub Copilot | 2026-03-14 | Added the civil black-gold bicolor from the current Wikimedia SVG colors; focused tests and browser render checked. |
| 229 | Berlin | `berlin` | done | GitHub Copilot | 2026-03-15 | Replaced the stripe-only placeholder with the full Berlin flag artwork so the central bear shield is included at the source 3:5 proportions. |
| 230 | Brandenburg | `brandenburg` | done | GitHub Copilot | 2026-03-15 | Replaced the red-white bicolor placeholder with the full Brandenburg flag SVG so the red eagle shield is rendered from the source artwork. |
| 231 | Bremen | `bremen` | done | GitHub Copilot | 2026-03-14 | |
| 232 | Hamburg | `hamburg` | done | GitHub Copilot | 2026-03-15 | Replaced the placeholder bicolor with the current full Hamburg flag SVG so the white castle now renders with the source 2:3 layout. |
| 233 | Hesse | `hesse` | done | GitHub Copilot | 2026-03-14 | Added the current civil red-white bicolor from the Wikimedia SVG; focused tests and browser render checked. |
| 234 | Lower Saxony | `lower_saxony` | done | GitHub Copilot | 2026-03-15 | Replaced the German tricolor placeholder with the current full Lower Saxony flag SVG so the centered horse shield is rendered from the source artwork. |
| 235 | Mecklenburg-Vorpommern | `mecklenburg_vorpommern` | done | GitHub Copilot | 2026-03-14 | Added civil flag: 5-stripe blue-white-yellow-white-red with weights [4,3,1,3,4] (3:5 ratio). Colors from CMYK official spec. |
| 236 | North Rhine-Westphalia | `north_rhine_westphalia` | done | GitHub Copilot | 2026-03-14 | Added the current civil green-white-red tricolor using the Wikimedia SVG colors; focused tests and browser render checked. |
| 237 | Rhineland-Palatinate | `rhineland_palatinate` | done | GitHub Copilot | 2026-03-15 | Replaced the plain tricolor template with the full Rhineland-Palatinate flag SVG so the upper hoist coat of arms is included at the source 2:3 ratio. |
| 238 | Saarland | `saarland` | done | GitHub Copilot | 2026-03-15 | Replaced the placeholder tricolor with the full Saarland flag SVG so the central coat of arms now renders from the source artwork. |
| 239 | Saxony | `saxony` | done | GitHub Copilot | 2026-03-14 | Added civil flag: white-green bicolor (3:5 ratio). Green #006B3F from Wikimedia reference. |
| 240 | Saxony-Anhalt | `saxony_anhalt` | done | GitHub Copilot | 2026-03-15 | Replaced the yellow-black placeholder with the current full Saxony-Anhalt flag SVG so the striped shield and green crancelin motif are rendered from source artwork. |
| 241 | Schleswig-Holstein | `schleswig_holstein` | done | GitHub Copilot | 2026-03-14 | Added the current civil blue-white-red tricolor from the Wikimedia SVG colors; focused tests and browser render checked. |
| 242 | Thuringia | `thuringia` | done | GitHub Copilot | 2026-03-14 | Added civil flag: white-red bicolor (3:5 ratio). Red #E2001A. |
| 243 | Corsica | `corsica` | done | GitHub Copilot | 2026-03-14 | Added the current white field with Moor's Head from the official SVG-backed symbol asset; focused tests and browser render checked. |
| 244 | Sardinia | `sardinia` | done | GitHub Copilot | 2026-03-14 | Fixed: changed SVG viewBox from 895x600 to 900x600 (matching 2:3 ratio), extended cross path to full width, and set template ratio to [2,3]. Cross now extends to all margins. |
| 245 | Genoa | `genoa` | done | GitHub Copilot | 2026-03-14 | Added the St George cross state-level template using the centered-cross geometry fix; focused tests and browser render checked. |
| 246 | Venice | `venice` | done | GitHub Copilot | 2026-03-14 | Added the current winged Lion of Saint Mark flag from the official SVG-backed symbol asset; focused tests and browser render checked. |
