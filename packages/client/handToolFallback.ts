type AstNode = { type: string; start: number; end: number; [key: string]: unknown };
type Edit = { start: number; end: number; text: string };

// These are native completion/cancellation paths, not explicit tool selection.
export function handToolFallback(code: string, ast: unknown): Edit[] {
  const edits: Edit[] = [];
  const seen = new Set<string>();
  const selection = /type:\s*"selection"/g;
  const patch = (name: string, node: AstNode) => {
    if (seen.has(name)) throw new Error(`Duplicate hand fallback scope: ${name}`);
    seen.add(name);
    let text = code.slice(node.start, node.end);
    const replace = (pattern: RegExp, replacement: string, count: number) => {
      if (Array.from(text.matchAll(pattern)).length !== count) {
        throw new Error(`Excalidraw hand fallback changed in ${name}`);
      }
      text = text.replace(pattern, replacement);
    };
    if (name === 'handleTextWysiwyg') {
      // Keep the native selection tool while typing. Switch only on submission,
      // and do not override a different tool chosen while the textarea blurs.
      replace(
        /editingTextElement:\s*null/g,
        'editingTextElement:null,activeTool:!this.state.activeTool.locked&&["selection","text"].includes(this.state.activeTool.type)?{...this.state.activeTool,type:"hand",lastActiveTool:null}:this.state.activeTool',
        1
      );
    } else if (name === 'onPointerUpFromPointerDownHandler') {
      // This handler also finishes selection drags: preserve explicit selection.
      replace(
        selection,
        'type:this.state.editingTextElement||["selection","text"].includes(this.state.activeTool.type)?"selection":"hand"',
        2
      );
    } else if (name === 'finalize') {
      replace(selection, 'type:"hand"', 2);
      // Cancelling the eraser must not resurrect selection from lastActiveTool.
      replace(
        /lastActiveToolBeforeEraser:\s*null/g,
        'type:"hand",lastActiveToolBeforeEraser:null',
        1
      );
    } else {
      replace(selection, 'type:"hand"', 1);
    }
    edits.push({ start: node.start, end: node.end, text });
  };
  const methods = new Set(['onPointerUpFromPointerDownHandler', 'handleTextWysiwyg']);
  const fields = new Set([
    'toggleLock',
    'onImageAction',
    'onKeyDown',
    'pasteFromClipboard',
    'addElementsFromPasteOrLibrary',
  ]);
  const visit = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    const node = value as AstNode;
    if (node.type === 'MethodDefinition') {
      const name = (node.key as AstNode)?.name;
      if (typeof name === 'string' && methods.has(name)) {
        patch(name, node);
        return;
      }
    }
    if (node.type === 'CallExpression' && Array.isArray(node.arguments)) {
      const args = node.arguments as AstNode[];
      if (
        args[0]?.type === 'ThisExpression' &&
        typeof args[1]?.value === 'string' &&
        fields.has(args[1].value)
      ) {
        patch(args[1].value, args[2]);
        return;
      }
    }
    if (node.type === 'ObjectExpression' && Array.isArray(node.properties)) {
      const name = (node.properties as AstNode[]).find(
        prop => (prop.key as AstNode)?.name === 'name'
      );
      if ((name?.value as AstNode)?.value === 'finalize') {
        patch('finalize', node);
        return;
      }
    }
    Object.values(node).forEach(visit);
  };
  visit(ast);
  if (seen.size !== methods.size + fields.size + 1) {
    throw new Error(`Missing Excalidraw hand fallback scopes: ${Array.from(seen).join(',')}`);
  }
  return edits;
}
