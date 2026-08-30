/**
 * TipTap extension for styled sign field markers.
 *
 * Renders as a block-level dashed-border placeholder that looks like a
 * proper signature field (similar to DocuSign / Adobe Sign).
 *
 * Previously rendered as a tiny inline pill (11px font) which was nearly
 * invisible on the document. Now renders as a visible block element with:
 *   - Dashed colored border (color-coded by signer)
 *   - Clear label (Signature, Date, etc.) + signer name
 *   - Reasonable size (~200px wide, auto height)
 *   - "Click to sign" hint text
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React from "react";

// Color map for signer indices
const SIGNER_COLORS = [
  "#059669", // emerald-600
  "#0d9488", // teal-600
  "#7C3AED", // violet-600
  "#DC2626", // red-600
  "#D97706", // amber-600
  "#2563EB", // blue-600
  "#DB2777", // pink-600
  "#4F46E5", // indigo-600
];

// Field type display info
const FIELD_DISPLAY: Record<string, { icon: string; label: string; hint: string }> = {
  signature: { icon: "✍", label: "Signature", hint: "Sign here" },
  date: { icon: "📅", label: "Date", hint: "Auto-filled on sign" },
  full_name: { icon: "👤", label: "Full Name", hint: "Print name" },
  initials: { icon: "🔤", label: "Initials", hint: "Initial here" },
  email: { icon: "📧", label: "Email", hint: "Email address" },
  text: { icon: "📝", label: "Text", hint: "Enter text" },
  checkbox: { icon: "☑", label: "Checkbox", hint: "Check to agree" },
};

// React component for the sign field node view
function SignFieldComponent({ node }: { node: any }) {
  const fieldType = node.attrs.fieldType || "signature";
  const signerIndex = node.attrs.assignedToSignerIndex ?? 0;
  const signerLabel = node.attrs.signerLabel || `Signer ${signerIndex + 1}`;
  const color = SIGNER_COLORS[signerIndex % SIGNER_COLORS.length];
  const display = FIELD_DISPLAY[fieldType] || FIELD_DISPLAY.text;

  return (
    <NodeViewWrapper as="div" style={{ display: "block", margin: "8px 0" }}>
      <div
        style={{
          display: "inline-flex",
          flexDirection: "column",
          minWidth: "200px",
          padding: "8px 12px",
          borderRadius: "6px",
          border: `2px dashed ${color}`,
          backgroundColor: `${color}08`,
          color: color,
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "inherit",
          cursor: "default",
          userSelect: "none",
        }}
        contentEditable={false}
      >
        {/* Top row: icon + field type label */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "16px" }}>{display.icon}</span>
          <span>{display.label}</span>
        </div>
        {/* Bottom row: signer name + hint */}
        <div style={{
          fontSize: "11px",
          fontWeight: 400,
          opacity: 0.8,
          marginTop: "2px",
        }}>
          {signerLabel} · {display.hint}
        </div>
      </div>
    </NodeViewWrapper>
  );
}

// TipTap Node extension
export const SignFieldExtension = Node.create({
  name: "signField",
  group: "block", // Changed from "inline" to "block" — renders on its own line
  inline: false,
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
        tag: 'div[data-type="sign-field"]',
      },
      // Also parse old inline span format for backward compatibility
      {
        tag: 'span[data-type="sign-field"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
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
