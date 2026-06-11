/**
 * Custom TipTap LineHeight extension.
 * Handles inline style `line-height` on paragraphs, preserving it as a node attribute.
 * This ensures that when HTML from our docx-to-html converter (which includes
 * inline line-height styles on <p> tags) is loaded via `setContent()`, the line
 * heights are preserved in the TipTap editor.
 */
import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    lineHeight: {
      /**
       * Set the line height
       */
      setLineHeight: (lineHeight: string) => ReturnType;
      /**
       * Unset the line height
       */
      unsetLineHeight: () => ReturnType;
    };
  }
}

export interface LineHeightOptions {
  types: string[];
  defaultLineHeight: string;
}

export const LineHeight = Extension.create<LineHeightOptions>({
  name: "lineHeight",

  addOptions() {
    return {
      types: ["heading", "paragraph"],
      defaultLineHeight: "1.5",
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: this.options.defaultLineHeight,
            parseHTML: (element) => {
              const style = element.getAttribute("style");
              if (!style) return null;

              const lineHeightMatch = style.match(/line-height:\s*([^;]+)/i);
              if (lineHeightMatch) {
                return lineHeightMatch[1].trim();
              }

              return null;
            },
            renderHTML: (attributes) => {
              if (!attributes.lineHeight) {
                return {};
              }

              return {
                style: `line-height: ${attributes.lineHeight}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setLineHeight:
        (lineHeight: string) =>
        ({ commands }) => {
          return this.options.types.every((type: string) =>
            commands.updateAttributes(type, { lineHeight })
          );
        },
      unsetLineHeight:
        () =>
        ({ commands }) => {
          return this.options.types.every((type: string) =>
            commands.resetAttributes(type, "lineHeight")
          );
        },
    };
  },
});
