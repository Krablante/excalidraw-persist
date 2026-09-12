import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { normalizePath, type Plugin } from 'vite';
import { handToolFallback } from './handToolFallback';
import { touchGesturePatch } from './touchGesturePatch';

// Excalidraw ships bundled JS, not replaceable source components. Match the
// components' public prop names in the AST, never minified variable names.
export const editorUiPlugin = (): Plugin => ({
  name: 'doska-editor-ui',
  enforce: 'pre',
  configResolved(config) {
    const require = createRequire(path.join(config.root, 'package.json'));
    const entry = require.resolve('@excalidraw/excalidraw');
    const manifest = JSON.parse(readFileSync(path.resolve(entry, '../../../package.json'), 'utf8'));
    if (manifest.version !== '0.18.0') {
      throw new Error('Review the editor UI adapter before upgrading Excalidraw.');
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
    const chromeEdits: typeof popupEdits = [];
    const counts = { mobile: 0, desktop: 0, properties: 0 };
    const range = (node: unknown) => node as { start: number; end: number };
    const wrap = (node: unknown, component: string, bindings: Record<string, string>) => {
      const { start, end } = range(node);
      const props = Object.entries(bindings)
        .map(([key, value]) => `${key}:${value}`)
        .join(',');
      chromeEdits.push({
        start,
        end,
        text: `doskaElement(${component},{native:(${code.slice(start, end)}),${props}})`,
      });
    };
    const ast = this.parse(code);
    chromeEdits.push(...handToolFallback(code, ast));
    chromeEdits.push(...touchGesturePatch(code, ast));
    for (const statement of ast.body) {
      if (statement.type !== 'VariableDeclaration') continue;
      for (const declaration of statement.declarations) {
        const fn = declaration.init;
        if (fn?.type !== 'ArrowFunctionExpression' || fn.params[0]?.type !== 'ObjectPattern')
          continue;
        const keys = fn.params[0].properties.map(prop =>
          prop.type === 'Property' && prop.key.type === 'Identifier' ? prop.key.name : ''
        );
        const bindings: Record<string, string> = {};
        for (const prop of fn.params[0].properties) {
          if (
            prop.type === 'Property' &&
            prop.key.type === 'Identifier' &&
            prop.value.type === 'Identifier'
          ) {
            bindings[prop.key.name] = prop.value.name;
          }
        }
        const chromeProps = Object.fromEntries(
          ['appState', 'app', 'actionManager', 'setAppState', 'onHandToolToggle'].map(key => [
            key,
            bindings[key],
          ])
        );
        if (fn.body.type === 'BlockStatement') {
          const result = fn.body.body.filter(node => node.type === 'ReturnStatement').pop();
          if (
            keys.includes('renderSidebars') &&
            keys.includes('onHandToolToggle') &&
            result?.type === 'ReturnStatement' &&
            result.argument
          ) {
            wrap(result.argument, 'DoskaMobileChrome', chromeProps);
            counts.mobile++;
          }
          if (
            keys.includes('elementsMap') &&
            keys.includes('renderAction') &&
            keys.length === 4 &&
            result?.type === 'ReturnStatement' &&
            result.argument
          ) {
            wrap(result.argument, 'DoskaProperties', {});
            const start = range(fn.body).start + 1;
            chromeEdits.push({
              start,
              end: start,
              text: `${bindings.renderAction}=doskaTagAction(${bindings.renderAction});`,
            });
            counts.properties++;
          }
          if (keys.includes('generateLinkForSelection') && keys.includes('showExitZenModeBtn')) {
            for (const statement of fn.body.body) {
              if (statement.type !== 'VariableDeclaration') continue;
              for (const declaration of statement.declarations) {
                const local = declaration.init;
                if (
                  local?.type !== 'ArrowFunctionExpression' ||
                  local.body.type !== 'BlockStatement'
                )
                  continue;
                const r = range(local);
                if (!code.slice(r.start, r.end).includes('App-menu_top__left')) continue;
                const result = local.body.body
                  .filter(node => node.type === 'ReturnStatement')
                  .pop();
                if (result?.type === 'ReturnStatement' && result.argument) {
                  wrap(result.argument, 'DoskaDesktopChrome', chromeProps);
                  counts.desktop++;
                }
              }
            }
          }
        }
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
    if (Object.values(counts).some(count => count !== 1)) {
      this.error(`Editor UI component signatures changed: ${JSON.stringify(counts)}`);
    }
    const { start, end } = matches[0];
    let patched = code;
    for (const edit of [
      ...popupEdits,
      ...chromeEdits,
      { start, end, text: 'DoskaColorPicker' },
    ].sort((a, b) => b.start - a.start)) {
      patched = patched.slice(0, edit.start) + edit.text + patched.slice(edit.end);
    }
    const trigger = /"data-testid":\s*"main-menu-trigger"/g;
    if (Array.from(patched.matchAll(trigger)).length !== 1)
      this.error('Expected one main menu trigger.');
    patched = patched.replace(trigger, '$&,"aria-label":"Меню доски","title":"Меню доски"');
    // onResize may commit dimensions before ResizeObserver updates device context.
    // A breakpoint change still needs a render when updateDOMRect is then a no-op.
    const breakpoint = /this\.refreshEditorBreakpoints\(\)[;,]\s*this\.updateDOMRect\(\)/g;
    if (Array.from(patched.matchAll(breakpoint)).length !== 1)
      this.error('Expected one editor resize callback.');
    patched = patched.replace(
      breakpoint,
      'this.refreshEditorBreakpoints()&&this.setState({}),this.updateDOMRect()'
    );
    const component = normalizePath(path.resolve(__dirname, 'src/components/ColorPicker.tsx'));
    const chrome = normalizePath(path.resolve(__dirname, 'src/components/EditorChrome.tsx'));
    const actions = normalizePath(path.resolve(__dirname, 'src/components/editorActions.ts'));
    return {
      code:
        `import DoskaColorPicker from ${JSON.stringify(component)};\n` +
        `import {createElement as doskaElement} from 'react';\n` +
        `import {MobileChrome as DoskaMobileChrome, DesktopChrome as DoskaDesktopChrome, Properties as DoskaProperties} from ${JSON.stringify(chrome)};\n` +
        `import {tagAction as doskaTagAction} from ${JSON.stringify(actions)};\n` +
        patched,
      map: null,
    };
  },
});
