"use client";

import Image from "@tiptap/extension-image";
import { ReactNodeViewRenderer, NodeViewWrapper } from "@tiptap/react";
import { useCallback, useRef, useState } from "react";

function ImageNodeView(props: any) {
  const { node, updateAttributes, selected } = props;
  const { src, alt, title, width } = node.attrs;
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const startW = useRef(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const img = imgRef.current;
      if (!img) return;
      startX.current = e.clientX;
      startW.current = img.offsetWidth;
      setDragging(true);

      const onMouseMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX.current;
        const newWidth = Math.max(60, startW.current + delta);
        if (img) img.style.width = `${newWidth}px`;
      };

      const onMouseUp = (ev: MouseEvent) => {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
        setDragging(false);
        const delta = ev.clientX - startX.current;
        const finalWidth = Math.max(60, startW.current + delta);
        updateAttributes({ width: finalWidth });
      };

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    },
    [updateAttributes]
  );

  return (
    <NodeViewWrapper
      as="div"
      style={{
        display: "inline-block",
        position: "relative",
        margin: "8px 0",
        lineHeight: 0,
      }}
      className="nb-img-wrap"
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt || ""}
        title={title || ""}
        style={{
          width: width ? `${width}px` : undefined,
          maxWidth: "100%",
          height: "auto",
          borderRadius: 6,
          display: "block",
          outline: selected || dragging ? "2px solid #FD79A8" : "none",
          outlineOffset: 2,
        }}
        draggable={false}
      />
      {/* Corner drag handle */}
      <div
        onMouseDown={onMouseDown}
        style={{
          position: "absolute",
          right: -4,
          bottom: -4,
          width: 12,
          height: 12,
          background: "#FD79A8",
          borderRadius: 2,
          cursor: "nwse-resize",
          opacity: selected || dragging ? 1 : 0,
          transition: "opacity 0.15s",
        }}
        className="nb-resize-handle"
      />
    </NodeViewWrapper>
  );
}

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.getAttribute("width");
          return w ? parseInt(w, 10) : null;
        },
        renderHTML: (attrs) => {
          if (!attrs.width) return {};
          return { width: attrs.width };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});

export default ResizableImage;
