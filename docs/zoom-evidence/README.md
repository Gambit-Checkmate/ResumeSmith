# Preview zoom review evidence

Captured on 2026-10-06 with synthetic resume data (Alex Sample, example.test email and fictional projects). No personal resume data is included.

- [Desktop: default whole-page fit](01-desktop-whole-page.png)
- [150% after editing and recompiling](02-edited-at-150-percent.png)
- [Code view](03-code-view.png)
- [Second page at 150% after returning to Preview](04-second-page-at-150-percent.png)
- [Fit width after resizing to 1100 x 850](05-fit-width-resized.png)
- [Mobile: whole-page fit at 390 x 844](06-mobile-whole-page.png)
- [Recording of the review sequence](zoom-review.webm)

The browser review used a two-page synthetic resume at 1440 x 1000, selected 150%, edited the Full Name field, switched to Code and back, navigated to page 2, selected Fit width and resized, then selected Fit page at a mobile viewport. Assertions checked that whole-page mode needs no vertical scrolling within the preview, 150% survives recompilation and the Code/Preview remount, navigation selects page 2, and resized Fit width needs no horizontal scrolling within the preview. Mobile controls wrap into two rows to remain usable.

Automated coverage in `web/src/lib/preview-zoom.test.ts` checks whole-page aspect-ratio fitting, the natural-size cap, zero available space and explicit percentage independence from panel height.
