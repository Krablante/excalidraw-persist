import { createElement } from 'react';
import type { ActionManager } from '@excalidraw/excalidraw/actions/manager';

export const toolNames: Record<string, string> = {
  selection: 'Выделение',
  freedraw: 'Перо',
  rectangle: 'Прямоугольник',
  diamond: 'Ромб',
  ellipse: 'Эллипс',
  arrow: 'Стрелка',
  line: 'Линия',
  text: 'Текст',
  image: 'Изображение',
  eraser: 'Ластик',
  hand: 'Перемещение',
  frame: 'Рамка',
  embeddable: 'Встраивание',
  laser: 'Указка',
};

export function tagAction(
  renderAction: ActionManager['renderAction']
): ActionManager['renderAction'] {
  return (name, data) => {
    const node = renderAction(name, data);
    return node ? createElement('div', { 'data-doska-action': name }, node) : null;
  };
}
