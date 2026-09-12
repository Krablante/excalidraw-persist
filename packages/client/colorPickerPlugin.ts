import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { normalizePath, type Plugin } from 'vite';

// Excalidraw ships bundled JS, not replaceable source components. Match the
// Picker's public prop names in the AST, never minified variable names.
export const colorPickerPlugin = (): Plugin => ({
  name: 'doska-color-picker',
  enforce: 'pre',
  configResolved(config) {
    const require = createRequire(path.join(config.root, 'package.json'));
    const entry = require.resolve('@excalidraw/excalidraw');
    const manifest = JSON.parse(readFileSync(path.resolve(entry, '../../../package.json'), 'utf8'));
    if (manifest.version !== '0.18.0') {
      throw new Error('Review the color picker adapter before upgrading Excalidraw.');
    }
  },
  transform(code, id) {
    if (
      !/\/@excalidraw\/excalidraw\/dist\/(dev|prod)\/index\.js$/.test(
        normalizePath(id.split('?')[0])
      )
    ) {
      return;
    }
    const signature = [
      'color',
      'onChange',
      'label',
      'type',
      'elements',
      'palette',
      'updateData',
      'children',
      'onEyeDropperToggle',
      'onEscape',
    ]
      .sort()
      .join(',');
    const matches = [];
    const popupSignature = [
      'color',
      'onChange',
      'label',
      'type',
      'elements',
      'palette',
      'updateData',
    ]
      .sort()
      .join(',');
    const popupEdits: { start: number; end: number; text: string }[] = [];
    for (const statement of this.parse(code).body) {
      if (statement.type !== 'VariableDeclaration') continue;
      for (const declaration of statement.declarations) {
        const fn = declaration.init;
        if (fn?.type !== 'ArrowFunctionExpression' || fn.params[0]?.type !== 'ObjectPattern')
          continue;
        const keys = fn.params[0].properties.map(prop =>
          prop.type === 'Property' && prop.key.type === 'Identifier' ? prop.key.name : ''
        );
        if (keys.sort().join(',') === signature) matches.push(fn);
        if (keys.join(',') === popupSignature && fn.body.type === 'BlockStatement') {
          const palette = fn.params[0].properties.find(
            prop =>
              prop.type === 'Property' &&
              prop.key.type === 'Identifier' &&
              prop.key.name === 'palette'
          );
          if (
            palette?.type !== 'Property' ||
            palette.value.type !== 'AssignmentPattern' ||
            palette.value.left.type !== 'Identifier' ||
            palette.value.right.type !== 'Identifier'
          )
            this.error('Unexpected color palette binding.');
          const binding = palette.value.left.name;
          const fallback = palette.value.right.name;
          const position = (fn.body as typeof fn.body & { start: number }).start + 1;
          // Canvas background passes null to skip the legacy swatches. It should
          // use the same compact picker as stroke and fill instead of HEX alone.
          popupEdits.push({ start: position, end: position, text: `${binding} ??= ${fallback};` });
        }
      }
    }
    if (matches.length !== 1 || popupEdits.length !== 1)
      this.error('Expected one Excalidraw Picker and one color popup. Review the adapter.');
    const { start, end } = matches[0];
    let patched = code;
    for (const edit of [...popupEdits, { start, end, text: 'DoskaColorPicker' }].sort(
      (a, b) => b.start - a.start
    )) {
      patched = patched.slice(0, edit.start) + edit.text + patched.slice(edit.end);
    }
    const component = normalizePath(path.resolve(__dirname, 'src/components/ColorPicker.tsx'));
    return {
      code: `import DoskaColorPicker from ${JSON.stringify(component)};\n` + patched,
      map: null,
    };
  },
});
