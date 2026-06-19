import { useCallback, useEffect, useRef, useState } from "react";
import { FONT } from "../constants.js";

const BG = "#0f1419";
const INK = "#e8ecf1";
const BRUSH_SIZES = [
  { id: "s", label: "Fino", size: 2 },
  { id: "m", label: "Médio", size: 4 },
  { id: "l", label: "Grosso", size: 7 },
];

export default function TabDrawCanvas({ value, onChange, className }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);
  const saveTimerRef = useRef(null);
  const loadedValueRef = useRef(null);
  const [tool, setTool] = useState("pen");
  const [brushId, setBrushId] = useState("m");

  const brushSize = BRUSH_SIZES.find((b) => b.id === brushId)?.size ?? 4;

  const exportDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || canvas.width === 0 || canvas.height === 0) return;
    onChange?.(canvas.toDataURL("image/png"));
  }, [onChange]);

  const scheduleSave = useCallback(() => {
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(exportDrawing, 350);
  }, [exportDrawing]);

  const setupContext = useCallback((ctx) => {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const paintImage = useCallback((dataUrl, ctx, w, h) => {
    if (!dataUrl) {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);
      return;
    }
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
    };
    img.src = dataUrl;
  }, []);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const displayW = rect.width;
    const displayH = rect.height;

    const prevUrl =
      canvas.width > 0 && canvas.height > 0
        ? canvas.toDataURL("image/png")
        : loadedValueRef.current || null;

    canvas.width = Math.round(displayW * dpr);
    canvas.height = Math.round(displayH * dpr);
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    setupContext(ctx);

    if (prevUrl) {
      paintImage(prevUrl, ctx, displayW, displayH);
    } else {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, displayW, displayH);
    }
  }, [paintImage, setupContext]);

  useEffect(() => {
    resizeCanvas();
    const container = containerRef.current;
    if (!container) return undefined;
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(container);
    return () => ro.disconnect();
  }, [resizeCanvas]);

  useEffect(() => {
    if (loadedValueRef.current === value) return;
    loadedValueRef.current = value;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    const ctx = canvas.getContext("2d");
    const w = rect.width;
    const h = rect.height;

    if (value) {
      paintImage(value, ctx, w, h);
    } else {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, w, h);
    }
  }, [value, paintImage]);

  useEffect(
    () => () => {
      clearTimeout(saveTimerRef.current);
    },
    []
  );

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const strokeWidth = (e) => {
    const pressure =
      e.pointerType === "pen" && e.pressure > 0 ? e.pressure : 0.55;
    const base = tool === "eraser" ? brushSize * 3 : brushSize;
    return base * (0.65 + pressure * 0.9);
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType !== "pen" && e.pointerType !== "touch") {
      return;
    }
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    lastPointRef.current = getPoint(e);

    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
    ctx.lineTo(lastPointRef.current.x + 0.01, lastPointRef.current.y + 0.01);
    ctx.strokeStyle = tool === "eraser" ? "rgba(0,0,0,1)" : INK;
    ctx.lineWidth = strokeWidth(e);
    ctx.globalCompositeOperation =
      tool === "eraser" ? "destination-out" : "source-over";
    ctx.stroke();
  };

  const handlePointerMove = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();

    const pt = getPoint(e);
    const last = lastPointRef.current;
    if (!last) return;

    const ctx = canvasRef.current.getContext("2d");
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(pt.x, pt.y);
    ctx.strokeStyle = tool === "eraser" ? "rgba(0,0,0,1)" : INK;
    ctx.lineWidth = strokeWidth(e);
    ctx.globalCompositeOperation =
      tool === "eraser" ? "destination-out" : "source-over";
    ctx.stroke();

    lastPointRef.current = pt;
  };

  const finishStroke = (e) => {
    if (!drawingRef.current) return;
    e?.preventDefault?.();
    drawingRef.current = false;
    lastPointRef.current = null;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
    scheduleSave();
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, rect.width, rect.height);
    loadedValueRef.current = "";
    onChange?.("");
  };

  return (
    <div className={`tab-draw ${className ?? ""}`}>
      <div className="tab-draw__toolbar" style={{ fontFamily: FONT }}>
        <DrawToolBtn
          label="✏️ Caneta"
          active={tool === "pen"}
          onClick={() => setTool("pen")}
          title="Desenhar com dedo ou caneta"
        />
        <DrawToolBtn
          label="◻ Borracha"
          active={tool === "eraser"}
          onClick={() => setTool("eraser")}
          title="Apagar traços"
        />
        {BRUSH_SIZES.map((b) => (
          <DrawToolBtn
            key={b.id}
            label={b.label}
            active={brushId === b.id}
            onClick={() => setBrushId(b.id)}
            title={`Espessura ${b.label.toLowerCase()}`}
            small
          />
        ))}
        <DrawToolBtn
          label="Limpar"
          onClick={clearCanvas}
          title="Apagar todo o desenho"
          danger
        />
      </div>
      <div ref={containerRef} className="tab-draw__surface">
        <canvas
          ref={canvasRef}
          className="tab-draw__canvas"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishStroke}
          onPointerCancel={finishStroke}
          onPointerLeave={finishStroke}
          aria-label="Desenho da tab de percussão"
        />
      </div>
    </div>
  );
}

function DrawToolBtn({ label, active, onClick, title, small, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        padding: small ? "4px 7px" : "5px 9px",
        border: `1px solid ${
          danger
            ? "rgba(181,74,74,.5)"
            : active
              ? "#FF7700"
              : "rgba(255,255,255,.2)"
        }`,
        borderRadius: 4,
        background: danger
          ? "rgba(181,74,74,.2)"
          : active
            ? "rgba(255,119,0,.25)"
            : "rgba(255,255,255,.08)",
        color: danger ? "#f0a0a0" : "#ddd",
        fontSize: small ? 10 : 11,
        fontWeight: 600,
        cursor: "pointer",
        fontFamily: FONT,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}
