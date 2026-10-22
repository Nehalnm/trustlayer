# TrustLayer dark interface

Direction chosen by the user: charcoal throughout, luminous blue actions, mint
verification/payment accents. The existing Next.js application and workflows
are retained.

## Foundation

- Background: #0d0f13; raised surfaces: #13161c through #171a21.
- Blue: #6487f5 / #8baaff. Mint: #69e6b7.
- Geist typography; strong heading hierarchy, generous whitespace, restrained
  monospace labels for step numbers and evidence identifiers.
- Shared Brand/Glyph components and surface, button, badge, and spacing classes.
- High-contrast functional text, visible keyboard focus, reduced-motion support.

## Screens

- Landing: dark grid/accent lighting, clear primary action, an explicitly
  illustrative trust-console example, agreement/verification/payment cards.
- Workspace: persistent desktop project sidebar, horizontal mobile navigation,
  rounded milestone cards, amount/progress summaries, and evidence panels.
- Account: coherent dark login and project-list surfaces, project cards, sign-out.
- Payment controls: styled hosted card fields, real milestone amount passed to
  the SDK, paused release for locked operations, explicit status reconciliation.

Marketing examples are labelled illustrative. No fake account metrics or
verification claims have been added to real project data.

## QA boundary

Server-rendered landing/login and authenticated redirects were checked via HTTP.
The build and lint validate code and styles. Browser screenshot, responsive
viewport, keyboard, and signed-in visual verification still require a connected
browser; no browser surface was available in this session. Do not present these
visual checks as completed.
