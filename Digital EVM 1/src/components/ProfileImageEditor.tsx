import React, { useRef, useState, useEffect } from "react";

interface ProfileImageEditorProps {
  initialImage: string;
  onApply: (croppedImage: string) => void;
}

const ProfileImageEditor: React.FC<ProfileImageEditorProps> = ({
  initialImage,
  onApply,
}) => {
  const containerSize = 240;
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [start, setStart] = useState({ x: 0, y: 0 });

  // Handle drag
  const handleMouseDown = (e: React.MouseEvent) => {
    setStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    setDragging(true);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (dragging) {
      setPosition({
        x: e.clientX - start.x,
        y: e.clientY - start.y,
      });
    }
  };

  const handleMouseUp = () => setDragging(false);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  });

  // Handle crop and apply
  const handleApply = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = containerSize;
    canvas.height = containerSize;

    ctx.clearRect(0, 0, containerSize, containerSize);
    ctx.save();
    // RECTANGULAR crop only
    ctx.drawImage(
      img,
      position.x,
      position.y,
      img.width * zoom,
      img.height * zoom
    );
    ctx.restore();
    const dataUrl = canvas.toDataURL("image/png");
    onApply(dataUrl);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative"
        style={{
          width: containerSize,
          height: containerSize,
          overflow: "hidden",
          border: "2px solid #aaa",
          cursor: "grab",
        }}
        onMouseDown={handleMouseDown}
      >
        <img
          ref={imgRef}
          src={initialImage}
          alt="Preview"
          draggable={false}
          style={{
            position: "absolute",
            top: position.y,
            left: position.x,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
            userSelect: "none",
          }}
        />
      </div>

      <input
        type="range"
        min="0.5"
        max="2"
        step="0.01"
        value={zoom}
        onChange={(e) => setZoom(parseFloat(e.target.value))}
        className="w-3/4"
      />

      <button
        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        onClick={handleApply}
      >
        Apply
      </button>

      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
};

export default ProfileImageEditor; 