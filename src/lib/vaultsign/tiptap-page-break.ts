import { Node, mergeAttributes } from '@tiptap/core';

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
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['hr', mergeAttributes(HTMLAttributes, { 'data-page-break': '', class: 'page-break' })];
  },

  addCommands() {
    return {
      insertPageBreak: () => ({ commands }) => {
        return commands.insertContent({ type: 'pageBreak' });
      },
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
