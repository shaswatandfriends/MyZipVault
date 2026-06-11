import { Node, mergeAttributes } from '@tiptap/core';

/**
 * PageBreak extension for TipTap editor.
 *
 * Renders as a visible divider with "Page Break" label in the editor,
 * and produces `<hr data-page-break class="page-break">` HTML that
 * carries through to the pdfmake converter as `{ text: "", pageBreak: "after" }`.
 */
export const PageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  inline: false,
  selectable: true,
  draggable: false,

  parseHTML() {
    return [
      { tag: 'hr[data-page-break]' },
      { tag: 'hr.page-break' },
      { tag: 'div[data-page-break]' },
      // Also match <hr style="page-break-after: always;"> from legacy converters
      { tag: 'hr[style*="page-break-after"]' },
      { tag: 'hr[style*="page-break"]' },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(HTMLAttributes, {
      'data-page-break': '',
      class: 'page-break',
      contenteditable: 'false',
    })];
  },

  addCommands() {
    return {
      insertPageBreak: () => ({ commands, state }) => {
        // Insert a paragraph before and after the page break for better cursor behavior
        return commands.insertContent([
          { type: 'pageBreak' },
          { type: 'paragraph' },
        ]);
      },
    };
  },

  addKeyboardShortcuts() {
    return {
      'Mod-Enter': () => this.editor.commands.insertPageBreak(),
    };
  },
});

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      insertPageBreak: () => ReturnType;
    };
  }
}
