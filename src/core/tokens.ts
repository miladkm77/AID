/**
 * Foundation tokens of the AID design system: colour, type, space, radius, control sizes.
 * Injected once by define() with zero specificity (:where), so any author rule overrides them.
 * Theme follows prefers-color-scheme; data-aid-theme="light" | "dark" on any element forces one.
 *
 * Semantic colours are r,g,b triplets because the engine reads them as light (--aid-excitation-color).
 */
const LIGHT = `--aid-color-bg:#EEF0F3;--aid-color-surface:#FAFBFC;--aid-color-ink:#13171B;--aid-color-ink-muted:#56606B;--aid-color-line:#D5DAE0;
--aid-danger:214,69,61;--aid-success:38,160,105;--aid-warning:224,150,24;--aid-info:56,128,232;
--aid-scene-light:246,248,251;--aid-membrane-color:24,34,52;--aid-membrane-alpha:.14;color-scheme:light`;
const DARK = `--aid-color-bg:#0B0E11;--aid-color-surface:#12171C;--aid-color-ink:#E8ECF0;--aid-color-ink-muted:#97A3AE;--aid-color-line:#252C33;
--aid-danger:240,100,90;--aid-success:70,200,140;--aid-warning:240,180,70;--aid-info:110,165,245;
--aid-scene-light:150,162,182;--aid-membrane-color:225,232,240;--aid-membrane-alpha:.14;color-scheme:dark`;

export const TOKENS_CSS = `
:where(:root){
--aid-font:"Inter","Vazirmatn",system-ui,-apple-system,"Segoe UI",sans-serif;
--aid-text-xs:12px;--aid-text-sm:14px;--aid-text-md:16px;--aid-text-lg:20px;--aid-text-xl:24px;--aid-text-2xl:32px;
--aid-space-1:4px;--aid-space-2:8px;--aid-space-3:12px;--aid-space-4:16px;--aid-space-5:24px;--aid-space-6:32px;--aid-space-7:48px;
--aid-radius-sm:8px;--aid-radius-md:14px;--aid-radius-lg:20px;--aid-radius-xl:24px;--aid-radius-pill:999px;
--aid-size-sm:36px;--aid-size-md:44px;--aid-size-lg:52px;
${LIGHT}}
@media (prefers-color-scheme:dark){:where(:root){${DARK}}}
:where([data-aid-theme="light"]){${LIGHT}}
:where([data-aid-theme="dark"]){${DARK}}
`;
