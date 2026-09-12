type AstNode = { type: string; start: number; end: number; [key: string]: unknown };
type Edit = { start: number; end: number; text: string };

function walk(value: unknown, visit: (node: AstNode) => boolean | void) {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) {
    value.forEach(item => walk(item, visit));
    return;
  }
  const node = value as AstNode;
  if (visit(node)) return;
  Object.values(node).forEach(item => walk(item, visit));
}

// Keep Excalidraw's pointer tracking and zoom limits, but calculate the camera
// from a stable scene anchor instead of accumulating two separately batched moves.
export function touchGesturePatch(code: string, ast: unknown): Edit[] {
  const edits: Edit[] = [];
  let starts = 0;
  let moves = 0;
  walk(ast, node => {
    if (
      node.type === 'MethodDefinition' &&
      (node.key as AstNode)?.name === 'updateGestureOnPointerDown'
    ) {
      starts++;
      const body = (node.value as AstNode).body as AstNode;
      const gesture = code.slice(body.start, body.end).match(/([\w$]+)\.pointers\.set\(/)?.[1];
      if (!gesture) throw new Error('Missing native gesture pointer map');
      const g = gesture;
      edits.push({
        start: body.end - 1,
        end: body.end - 1,
        text: `
        if (${g}.pointers.size === 2) {
          ${g}.doskaAnchor = {
            x: (${g}.lastCenter.x - this.state.offsetLeft) / this.state.zoom.value - this.state.scrollX,
            y: (${g}.lastCenter.y - this.state.offsetTop) / this.state.zoom.value - this.state.scrollY
          };
          ${g}.doskaLastTouch = new Map(${g}.pointers);
          ${g}.doskaResume = null;
          ${g}.doskaCamera = {zoom: this.state.zoom, scrollX: this.state.scrollX, scrollY: this.state.scrollY};
        } else if (${g}.pointers.size === 1) {
          ${g}.doskaAnchor = ${g}.doskaLastTouch = ${g}.doskaResume = ${g}.doskaCamera = null;
        }
      `,
      });
      return true;
    }
    if (node.type !== 'CallExpression' || !Array.isArray(node.arguments)) return;
    const args = node.arguments as AstNode[];
    if (args[0]?.type !== 'ThisExpression' || args[1]?.value !== 'handleCanvasPointerMove') return;
    moves++;
    const fn = args[2];
    const event = (fn.params as AstNode[])[0].name;
    if (typeof event !== 'string') throw new Error('Unknown native pointer event binding');
    let branches = 0;
    walk(fn.body, branch => {
      if (branch.type !== 'IfStatement') return;
      const test = branch.test as AstNode;
      const condition = code.slice(test.start, test.end);
      const g = condition.match(/([\w$]+)\.pointers\.size\s*===?\s*2/)?.[1];
      if (!g || !condition.includes('.initialDistance')) return;
      branches++;
      let cameraCalls = 0;
      walk(branch.consequent, call => {
        if (call.type !== 'CallExpression') return;
        const source = code.slice(call.start, call.end);
        if (!source.startsWith('this.setState(') || !source.includes('shouldCacheIgnoreZoom'))
          return;
        cameraCalls++;
        let zoom: string | undefined;
        walk(call, property => {
          if (property.type === 'Property' && (property.key as AstNode)?.name === 'nextZoom') {
            const value = property.value as AstNode;
            if (value.type === 'Identifier') zoom = value.name as string;
          }
        });
        if (!zoom) throw new Error('Missing native pinch zoom binding');
        edits.push({
          start: call.start,
          end: call.end,
          text: `(
          ${g}.doskaCamera = {
            zoom: {value: ${zoom}},
            scrollX: (${g}.lastCenter.x - this.state.offsetLeft) / ${zoom} - ${g}.doskaAnchor.x,
            scrollY: (${g}.lastCenter.y - this.state.offsetTop) / ${zoom} - ${g}.doskaAnchor.y
          },
          this.translateCanvas({...${g}.doskaCamera, shouldCacheIgnoreZoom: true})
        )`,
        });
        return true;
      });
      if (cameraCalls !== 1) throw new Error('Native pinch camera calculation changed');
      const alternate = branch.alternate as AstNode;
      if (!alternate) throw new Error('Missing native pinch cleanup');
      edits.push({
        start: alternate.start,
        end: alternate.end,
        text: `{
        if (${g}.pointers.size === 1 && ${g}.doskaAnchor && ${event}.pointerType === "touch" &&
            (this.state.activeTool.type === "hand" || this.state.viewModeEnabled)) {
          const previous = ${g}.doskaLastTouch.get(${event}.pointerId);
          if (previous && (!${g}.doskaResume || ${g}.doskaResume.id !== ${event}.pointerId)) {
            ${g}.doskaResume = {id: ${event}.pointerId, point: previous, camera: ${g}.doskaCamera};
          }
          const resume = ${g}.doskaResume;
          if (resume) this.translateCanvas({
            scrollX: resume.camera.scrollX + (${event}.clientX - resume.point.x) / resume.camera.zoom.value,
            scrollY: resume.camera.scrollY + (${event}.clientY - resume.point.y) / resume.camera.zoom.value
          });
        } else if (${g}.pointers.size === 0) {
          ${g}.doskaAnchor = ${g}.doskaLastTouch = ${g}.doskaResume = ${g}.doskaCamera = null;
        }
        ${code.slice(alternate.start, alternate.end)}
      }`,
      });
      edits.push({
        start: branch.end,
        end: branch.end,
        text: `;
        if (${g}.doskaLastTouch && ${g}.pointers.has(${event}.pointerId)) {
          ${g}.doskaLastTouch.set(${event}.pointerId, {x: ${event}.clientX, y: ${event}.clientY});
        }
      `,
      });
      return true;
    });
    if (branches !== 1) throw new Error('Native pinch branch changed');
    return true;
  });
  if (starts !== 1 || moves !== 1) throw new Error('Native gesture handler signatures changed');
  return edits;
}
