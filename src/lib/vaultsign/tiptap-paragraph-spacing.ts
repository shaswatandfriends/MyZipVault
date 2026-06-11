/**
 * Custom TipTap ParagraphSpacing extension.
 * Handles inline styles `margin-top` and `margin-bottom` on paragraphs/headings,
 * preserving document spacing from the docx-to-html conversion.
 */
import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paragraphSpacing: {
      /**
       * Set paragraph margin
       */
      setParagraphSpacing: (spacing: { marginTop?: string; marginBottom?: string }) => ReturnType;
      /**
       * Unset paragraph margin
       */
      unsetParagraphSpacing: () => ReturnType;
    };
  }
}

export interface ParagraphSpacingOptions {
  types: string[];
}

export const ParagraphSpacing = Extension.create<ParagraphSpacingOptions>({
  name: "paragraphSpacing",

  addOptions() {
    return {
      types: ["heading", "paragraph"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          marginTop: {
            default: null,
            parseHTML: (element) => {
              const style = element.getAttribute("style");
              if (!style) return null;
              const match = style.match(/margin-top:\s*([^;]+)/i);
              return match ? match[1].trim() : null;
            },
            renderHTML: (attributes) => {
              if (!attributes.marginTop) return {};
              return { style: `margin-top: ${attributes.marginTop}` };
            },
          },
          marginBottom: {
            default: null,
            parseHTML: (element) => {
              const style = element.getAttribute("style");
              if (!style) return null;
              const match = style.match(/margin-bottom:\s*([^;]+)/i);
              return match ? match[1].trim() : null;
            },
            renderHTML: (attributes) => {
              if (!attributes.marginBottom) return {};
              return { style: `margin-bottom: ${attributes.marginBottom}` };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setParagraphSpacing:
        (spacing: { marginTop?: string; marginBottom?: string }) =>
        ({ commands }) => {
          return this.options.types.every((type: string) =>
            commands.updateAttributes(type, spacing)
          );
        },
      unsetParagraphSpacing:
        () =>
        ({ commands }) => {
          return this.options.types.every((type: string) =>
            commands.resetAttributes(type, ["marginTop", "marginBottom"])
          );
        },
    };
  },
});
