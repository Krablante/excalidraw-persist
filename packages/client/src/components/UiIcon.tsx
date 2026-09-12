const paths: Record<string, string> = {
  selection: 'm5 3 14 9-7 1-3 7-4-17Z',
  freedraw: 'm4 16-1 5 5-1L20 8l-4-4L4 16Zm10-10 4 4',
  rectangle: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z',
  diamond: 'm12 2 10 10-10 10L2 12 12 2Z',
  ellipse: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0',
  arrow: 'M3 12h18m-6-6 6 6-6 6',
  line: 'm4 19 16-14',
  text: 'M4 5V3h16v2M12 3v18m-4 0h8',
  image: 'M4 3h16v18H4V3Zm0 13 5-5 4 4 3-3 4 4M9 7h.01',
  eraser: 'm3 14 10-11 8 7L10 21H7l-4-4v-3Zm4-4 8 7m-5 4h11',
  hand: 'M8 12V5a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-6a2 2 0 0 1 4 0v10c0 4-3 7-7 7-3 0-4-1-6-3l-4-5a2 2 0 0 1 3-3l2 2Z',
  frame: 'M7 2v20M17 2v20M2 7h20M2 17h20',
  embeddable: 'm8 6-6 6 6 6m8-12 6 6-6 6',
  laser: 'm4 20 8-8m1-8 1 4m6 3-4-1m1-7-2 3M3 8l4 2',
  plus: 'M12 4v16M4 12h16',
  close: 'm6 6 12 12M6 18 18 6',
  chevron: 'm7 10 5 5 5-5',
  menu: 'M4 6h16M4 12h16M4 18h16',
  more: 'M4 12h.01M12 12h.01M20 12h.01',
  settings: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  library: 'M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3V4Zm9 2v16',
  lock: 'M6 10h12v11H6V10Zm2 0V6a4 4 0 0 1 8 0v4',
  share: 'M12 16V3m-4 4 4-4 4 4M5 12v9h14v-9',
  archive: 'M3 3h18v5H3V3Zm2 5v13h14V8M9 12h6',
  check: 'm5 12 4 4L19 6',
};

export default function UiIcon({ name, size = 20 }: { name: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={paths[name] || paths.settings} />
    </svg>
  );
}
