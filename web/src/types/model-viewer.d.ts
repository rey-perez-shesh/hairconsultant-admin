import type { DetailedHTMLProps, HTMLAttributes } from "react";

// <model-viewer> web component from @google/model-viewer (loaded client-side for GLB previews).
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement> & {
        src?: string;
        alt?: string;
        "camera-controls"?: boolean | "";
        "auto-rotate"?: boolean | "";
        "shadow-intensity"?: string;
      };
    }
  }
}
