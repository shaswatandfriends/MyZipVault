/**
 * TipTap extension for styled sign field markers.
 *
 * Renders as a block-level dashed-border placeholder that looks like a
 * proper signature field (similar to DocuSign / Adobe Sign).
 *
 * Layout: Signers are arranged in a grid (2 per row, left-right).
 * Each signer's block contains:
 *   1. Signature field (top)
 *   2. Date (auto-fetched, shown automatically — not a separate field)
 *   3. Other fields (full_name, initials, etc.) stacked below
 */
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import React from "react";

// Color map for signer indices
const SIGNER_COLORS = [
  "#174A43", // brand teal
  "#D98F78", // terracotta
  "#8FA99C", // sage
  "#0d9488", // teal-600
  "#DB2777", // pink-600
  "#4F46E5", // indigo-600
  "#D97706", // amber-600
  "#DC2626", // red-600
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
function SignFieldComponent({ node, deleteNode, getPos, editor }: any) {
  const fieldType = node.attrs.fieldType || "signature";
  const signerIndex = node.attrs.assignedToSignerIndex ?? 0;
  const signerLabel = node.attrs.signerLabel || `Signer ${signerIndex + 1}`;
  const color = SIGNER_COLORS[signerIndex % SIGNER_COLORS.length];
  const display = FIELD_DISPLAY[fieldType] || FIELD_DISPLAY.text;

  // For signature fields, automatically show date below
  const showAutoDate = fieldType === "signature";

  // Drag state
  const [isDragging, setIsDragging] = React.useState(false);
  const dragRef = React.useRef<HTMLDivElement>(null);

  // Make the node draggable within the TipTap editor
  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    // Set the drag data to the node's position so TipTap knows what to move
    const pos = getPos();
    e.dataTransfer.setData("application/x-tiptap-drag", JSON.stringify({ pos }));
    e.dataTransfer.effectAllowed = "move";

    // Create a drag image
    if (dragRef.current) {
      const dragImage = dragRef.current.cloneNode(true) as HTMLElement;
      dragImage.style.opacity = "0.8";
      dragImage.style.position = "absolute";
      dragImage.style.top = "-1000px";
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, 20, 20);
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <NodeViewWrapper
      as="div"
      style={{
        display: "inline-block",
        margin: "12px 12px 12px 0",
        verticalAlign: "top",
        opacity: isDragging ? 0.5 : 1,
        cursor: "grab",
      }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      data-drag-handle
    >
      <div
        ref={dragRef}
        style={{
          display: "flex",
          flexDirection: "column",
          minWidth: "220px",
          maxWidth: "300px",
          padding: "12px 16px",
          borderRadius: "8px",
          border: `2px dashed ${color}`,
          backgroundColor: `${color}08`,
          color: color,
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "inherit",
          cursor: "default",
          userSelect: "none",
          transition: "box-shadow 0.2s, transform 0.2s",
          boxShadow: isDragging ? "0 8px 24px rgba(0,0,0,0.15)" : "none",
          transform: isDragging ? "scale(0.95)" : "scale(1)",
        }}
        contentEditable={false}
      >
        {/* Top row: drag handle + icon + field type label + signer name + delete */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", cursor: "grab", opacity: 0.5 }}>⠿</span>
            <span style={{ fontSize: "16px" }}>{display.icon}</span>
            <span>{display.label}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "11px", fontWeight: 400, opacity: 0.7 }}>{signerLabel}</span>
            <button
              onClick={deleteNode}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: color,
                opacity: 0.4,
                fontSize: "14px",
                padding: "0 2px",
              }}
              title="Remove field"
              contentEditable={false}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Signature line */}
        <div
          style={{
            marginTop: "10px",
            marginBottom: "6px",
            height: "1px",
            borderBottom: `1px solid ${color}60`,
            width: "100%",
          }}
        />

        {/* Hint text */}
        <div style={{ fontSize: "11px", fontWeight: 400, opacity: 0.6, fontStyle: "italic" }}>
          {display.hint}
        </div>

        {/* Auto date — shown automatically below signature */}
        {showAutoDate && (
          <div style={{ marginTop: "8px", paddingTop: "8px", borderTop: `1px solid ${color}30` }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "14px" }}>📅</span>
              <span style={{ fontSize: "12px", fontWeight: 500 }}>Date</span>
            </div>
            <div style={{ fontSize: "10px", fontWeight: 400, opacity: 0.5, marginTop: "2px", fontStyle: "italic" }}>
              Auto-filled on sign
            </div>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}

// TipTap Node extension
export const SignFieldExtension = Node.create({
  name: "signField",
  group: "block",
  inline: false,
  atom: true,

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
