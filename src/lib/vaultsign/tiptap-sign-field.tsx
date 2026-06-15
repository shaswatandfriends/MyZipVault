/**
 * TipTap extension for styled sign field markers.
 *
 * Instead of inserting plain text like [SIGNATURE — Signer 1], this extension
 * creates a proper inline node with a styled appearance that looks like a
 * document signing field placeholder.
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React from "react";

// Color map for signer indices
const SIGNER_COLORS = [
  "var(--status-green-dark)", // green
  "var(--accent-teal)", // teal
  "#7C3AED", // purple
  "var(--status-red)", // red
  "var(--status-amber)", // amber
  "var(--status-blue)", // blue
  "#DB2777", // pink
  "var(--primary)", // emerald
];

// Field type display info
const FIELD_DISPLAY: Record<string, { icon: string; label: string }> = {
  signature: { icon: "✍", label: "Signature" },
  date: { icon: "📅", label: "Date" },
  full_name: { icon: "👤", label: "Full Name" },
  initials: { icon: "🔤", label: "Initials" },
  email: { icon: "📧", label: "Email" },
  text: { icon: "📝", label: "Text" },
  checkbox: { icon: "☑", label: "Checkbox" },
};

// React component for the sign field node view
function SignFieldComponent({ node }: { node: any }) {
  const fieldType = node.attrs.fieldType || "signature";
  const signerIndex = node.attrs.assignedToSignerIndex ?? 0;
  const signerLabel = node.attrs.signerLabel || `Signer ${signerIndex + 1}`;
  const color = SIGNER_COLORS[signerIndex % SIGNER_COLORS.length];
  const display = FIELD_DISPLAY[fieldType] || FIELD_DISPLAY.text;

  return (
    <NodeViewWrapper as="span" style={{ display: "inline" }}>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "3px",
          padding: "1px 6px",
          borderRadius: "4px",
          backgroundColor: `${color}12`,
          border: `1px solid ${color}40`,
          color: color,
          fontSize: "11px",
          fontWeight: 600,
          fontFamily: "inherit",
          verticalAlign: "middle",
          lineHeight: "1.6",
          whiteSpace: "nowrap",
        }}
        contentEditable={false}
      >
        <span style={{ fontSize: "12px" }}>{display.icon}</span>
        {display.label} — {signerLabel}
      </span>
    </NodeViewWrapper>
  );
}

// TipTap Node extension
export const SignFieldExtension = Node.create({
  name: "signField",
  group: "inline",
  inline: true,
  atom: true, // Acts as a single unit — can't edit inside it

  addAttributes() {
    return {
      fieldType: {
        default: "signature",
      },
      assignedToSignerIndex: {
        default: 0,
      },
      signerLabel: {
        default: "",
      },
      fieldId: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="sign-field"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-type": "sign-field",
        class: "sign-field-marker",
      }),
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SignFieldComponent);
  },

  addCommands() {
    return {
      insertSignField:
        (attrs: {
          fieldType: string;
          assignedToSignerIndex: number;
          signerLabel?: string;
          fieldId?: string;
        }) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs,
          });
        },
    } as any;
},
});
