/**
 * Custom TipTap FontSize extension.
 * Handles inline style `font-size` on spans, preserving it as a mark attribute.
 * This ensures that when HTML from our docx-to-html converter (which includes
 * inline font-size styles) is loaded via `setContent()`, the font sizes are
 * preserved and editable in the TipTap editor.
 */
import { Extension } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      /**
       * Set the font size
       */
      setFontSize: (size: string) => ReturnType;
      /**
       * Unset the font size
       */
      unsetFontSize: () => ReturnType;
    };
  }
}

export interface FontSizeOptions {
  types: string[];
}

export const FontSize = Extension.create<FontSizeOptions>({
  name: "fontSize",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => {
              // Parse font-size from inline style
              const style = element.getAttribute("style");
              if (!style) return null;

              const fontSizeMatch = style.match(/font-size:\s*([^;]+)/i);
              if (fontSizeMatch) {
                return fontSizeMatch[1].trim();
              }

              // Also check for a direct fontSize attribute (TipTap internal)
              const attr = element.getAttribute("data-font-size");
              if (attr) return attr;

              return null;
            },
            renderHTML: (attributes) => {
              if (!attributes.fontSize) {
                return {};
              }

              return {
                style: `font-size: ${attributes.fontSize}`,
                "data-font-size": attributes.fontSize,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }) => {
          return chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run();
        },
    };
  },
});
