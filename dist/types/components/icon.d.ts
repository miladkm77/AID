/**
 * <aid-icon name="plus"> — line icons on a 24 px grid, 1.75 px stroke, round caps and joins, drawn in currentColor.
 * Icons are not gas containers. Directional icons mirror in right-to-left text unless the `fixed` attribute is set.
 * Give a `label` for an icon that carries meaning on its own; otherwise it is hidden from assistive technology.
 */
export declare const ICONS: Record<string, string>;
export declare class AidIcon extends HTMLElement {
    static get observedAttributes(): string[];
    private path;
    constructor();
    connectedCallback(): void;
    attributeChangedCallback(): void;
    private sync;
    /** re-check the text direction (call after changing `dir` on an ancestor) */
    refresh(): void;
}
