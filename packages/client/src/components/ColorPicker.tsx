import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import '../styles/ColorPicker.scss';

type HSV = { h: number; s: number; v: number };
type PickerType = 'elementStroke' | 'elementBackground' | 'canvasBackground';

interface ColorPickerProps {
  color: string;
  label: string;
  type: PickerType;
  elements: readonly ExcalidrawElement[];
  onChange: (color: string) => void;
  onEyeDropperToggle: (force?: boolean) => void;
  onEscape: (event: KeyboardEvent) => void;
}

const clamp = (value: number, max = 100) => Math.max(0, Math.min(max, value));
const defaults = ['#1e1e1e', '#ffffff', '#e03131', '#2f9e44', '#1971c2'];

const toHSV = (color: string, fallbackHue = 0): HSV => {
  if (color === 'transparent') return { h: fallbackHue, s: 100, v: 100 };
  let hex = color.replace(/^#/, '');
  if (/^[\da-f]{3}$/i.test(hex)) hex = [...hex].map(n => n + n).join('');
  let rgb: number[];
  if (/^[\da-f]{6}$/i.test(hex)) {
    rgb = [0, 2, 4].map(offset => parseInt(hex.slice(offset, offset + 2), 16));
  } else {
    // Only legacy CSS colors need browser normalization; ordinary hex is pure math.
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const context = canvas.getContext('2d')!;
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    rgb = [...context.getImageData(0, 0, 1, 1).data];
  }
  const [r, g, b] = rgb.map(n => n / 255);
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  const hue = !delta
    ? fallbackHue
    : max === r
      ? 60 * (((g - b) / delta + 6) % 6)
      : max === g
        ? 60 * ((b - r) / delta + 2)
        : 60 * ((r - g) / delta + 4);
  return { h: hue, s: max ? (delta / max) * 100 : 0, v: max * 100 };
};

const toHex = ({ h, s, v }: HSV) => {
  const channel = (offset: number) => {
    const k = (offset + h / 60) % 6;
    return Math.round(((255 * v) / 100) * (1 - (s / 100) * Math.max(0, Math.min(k, 4 - k, 1))))
      .toString(16)
      .padStart(2, '0');
  };
  return `#${channel(5)}${channel(3)}${channel(1)}`;
};

const ColorPicker = ({
  color,
  label,
  type,
  elements,
  onChange,
  onEyeDropperToggle,
  onEscape,
}: ColorPickerProps) => {
  const [hsv, setHSV] = useState(() => toHSV(color));
  const [draft, setDraft] = useState(color);
  const [hex, setHex] = useState(color === 'transparent' ? '' : toHex(hsv).slice(1));
  const dragging = useRef(false);
  const latest = useRef({ hsv, draft, onEyeDropperToggle });
  latest.current = { hsv, draft, onEyeDropperToggle };
  const [swatches] = useState(() => {
    const property = type === 'elementBackground' ? 'backgroundColor' : 'strokeColor';
    const colors = new Set<string>();
    if (type !== 'canvasBackground') {
      for (let i = elements.length - 1; i >= 0 && colors.size < 5; i--) {
        const value = elements[i][property];
        if (!elements[i].isDeleted && value && value !== 'transparent') colors.add(value);
      }
    }
    for (const value of defaults) {
      if (colors.size === 5) break;
      colors.add(value);
    }
    return [...colors];
  });

  useEffect(() => {
    const next = toHSV(color, latest.current.hsv.h);
    setHSV(next);
    setDraft(color);
    setHex(color === 'transparent' ? '' : toHex(next).slice(1));
  }, [color]);

  useEffect(() => () => latest.current.onEyeDropperToggle(false), []);

  const preview = (next: HSV) => {
    const value = toHex(next);
    latest.current.hsv = next;
    latest.current.draft = value;
    setHSV(next);
    setDraft(value);
    setHex(value.slice(1));
  };

  const commit = (value = latest.current.draft) => {
    if (value !== color) onChange(value);
  };

  const cancel = () => {
    dragging.current = false;
    preview(toHSV(color, hsv.h));
    latest.current.draft = color;
    setDraft(color);
    if (color === 'transparent') setHex('');
  };

  const move = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    preview({
      ...latest.current.hsv,
      s: clamp(((event.clientX - rect.left) / rect.width) * 100),
      v: clamp((1 - (event.clientY - rect.top) / rect.height) * 100),
    });
  };

  const applyHex = () => {
    const value = hex.replace(/^#/, '').trim();
    if (/^(?:[\da-f]{3}|[\da-f]{6})$/i.test(value)) {
      const next = toHSV(`#${value}`, hsv.h);
      preview(next);
      commit(toHex(next));
    } else {
      setHex(draft === 'transparent' ? '' : toHex(hsv).slice(1));
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={`${label} color picker`}>
      <div
        className="color-picker-content doska-color-picker"
        tabIndex={-1}
        onKeyDown={event => {
          if (event.key === 'Escape') {
            event.preventDefault();
            onEscape(event);
          }
          event.stopPropagation();
        }}
      >
        <div
          className="doska-color-field"
          role="slider"
          tabIndex={0}
          aria-label="Saturation and brightness"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(hsv.s)}
          aria-valuetext={`Saturation ${Math.round(hsv.s)}%, brightness ${Math.round(hsv.v)}%. Use arrow keys.`}
          style={{ backgroundColor: `hsl(${hsv.h} 100% 50%)` }}
          onPointerDown={event => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.focus();
            event.currentTarget.setPointerCapture(event.pointerId);
            dragging.current = true;
            move(event);
          }}
          onPointerMove={event => {
            if (dragging.current) move(event);
          }}
          onPointerUp={event => {
            if (!dragging.current) return;
            move(event);
            dragging.current = false;
            commit();
          }}
          onPointerCancel={cancel}
          onKeyDown={event => {
            const step = event.shiftKey ? 10 : 1;
            const next = { ...hsv };
            if (event.key === 'ArrowLeft') next.s = clamp(hsv.s - step);
            else if (event.key === 'ArrowRight') next.s = clamp(hsv.s + step);
            else if (event.key === 'ArrowUp') next.v = clamp(hsv.v + step);
            else if (event.key === 'ArrowDown') next.v = clamp(hsv.v - step);
            else return;
            event.preventDefault();
            preview(next);
            commit(toHex(next));
          }}
        >
          <span
            className="doska-color-cursor"
            hidden={draft === 'transparent'}
            style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%`, background: draft }}
          />
        </div>
        <input
          className="doska-color-hue"
          type="range"
          min="0"
          max="360"
          step="1"
          aria-label="Hue"
          value={hsv.h}
          onPointerDown={event => {
            dragging.current = true;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onChange={event => {
            const next = { ...latest.current.hsv, h: Number(event.target.value) };
            preview(next);
            if (!dragging.current) commit(toHex(next));
          }}
          onPointerUp={() => {
            dragging.current = false;
            commit();
          }}
          onPointerCancel={cancel}
        />
        <div className="doska-color-value">
          <span
            className="doska-color-preview"
            data-transparent={draft === 'transparent'}
            style={{ backgroundColor: draft }}
            aria-hidden="true"
          />
          <span className="doska-color-hash" aria-hidden="true">
            #
          </span>
          <input
            className="doska-color-hex"
            aria-label="Hex color"
            value={hex}
            placeholder={draft === 'transparent' ? 'None' : '000000'}
            spellCheck={false}
            autoComplete="off"
            maxLength={7}
            onChange={event => setHex(event.target.value)}
            onFocus={event => event.target.select()}
            onBlur={applyHex}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                applyHex();
              }
              if (event.key === 'Escape')
                setHex(color === 'transparent' ? '' : toHex(toHSV(color)).slice(1));
            }}
          />
          <button
            type="button"
            className="doska-color-eyedropper excalidraw-eye-dropper-trigger"
            aria-label="Pick a color from the canvas"
            title="Pick a color from the canvas"
            onClick={() => onEyeDropperToggle()}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m14 5 5 5M12 7 4 15v5h5l8-8M15 6l3-3a2.1 2.1 0 0 1 3 3l-3 3M3 21l2-2" />
            </svg>
          </button>
        </div>
        <div className="doska-color-swatches" aria-label="Quick colors">
          {['transparent', ...swatches].map(value => (
            <button
              key={value}
              type="button"
              className="doska-color-swatch"
              aria-label={value === 'transparent' ? 'No color' : value}
              title={value === 'transparent' ? 'No color' : value}
              aria-pressed={color.toLowerCase() === value.toLowerCase()}
              data-transparent={value === 'transparent'}
              style={{ backgroundColor: value }}
              onClick={() => commit(value)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ColorPicker;
