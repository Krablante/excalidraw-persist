import {
  Children,
  Fragment,
  isValidElement,
  useEffect,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import type { AppClassProperties, AppState, UIAppState } from '@excalidraw/excalidraw/types';
import type { ActionManager } from '@excalidraw/excalidraw/actions/manager';
import UiIcon from './UiIcon';
import { toolNames } from './editorActions';

type NodeProps = { children?: ReactNode; className?: string; 'data-doska-action'?: string };
const children = (node: ReactNode) =>
  isValidElement<NodeProps>(node) ? Children.toArray(node.props.children) : [];
const className = (node: ReactNode) =>
  isValidElement<NodeProps>(node) ? node.props.className || '' : '';
const flatten = (nodes: ReactNode): ReactNode[] =>
  Children.toArray(nodes).flatMap(node =>
    isValidElement(node) && node.type === Fragment ? flatten(node.props.children) : [node]
  );

function portal(node: ReactNode, id: string, theme: string, name: string) {
  const target = document.getElementById(id);
  return target
    ? createPortal(
        <div
          className={`excalidraw doska-native-host ${name} ${theme === 'dark' ? 'theme--dark' : ''}`}
        >
          {node}
        </div>,
        target
      )
    : null;
}

type ChromeProps = {
  native: ReactElement<NodeProps>;
  appState: UIAppState;
  app: AppClassProperties;
  actionManager: ActionManager;
  setAppState: (state: Partial<AppState>) => void;
};

export function DesktopChrome({ native, appState, setAppState }: ChromeProps) {
  const menu = children(native)[0];
  const [left, ...menuItems] = children(menu);
  const right = menuItems.find(node => className(node).includes('layer-ui__wrapper__top-right'));
  const tools = menuItems.find(node => node !== right);
  const [commands, properties] = children(left);
  const key = Object.keys(appState.selectedElementIds).join(',') + ':' + appState.activeTool.type;
  const [dismissed, dismiss] = useState<string | null>(null);
  const hidden = appState.zenModeEnabled;
  return (
    <>
      {portal(commands, 'doska-menu-slot', appState.theme, 'doska-command-menu')}
      {!hidden && portal(tools, 'doska-tools-slot', appState.theme, 'doska-desktop-tools')}
      {portal(right, 'doska-library-slot', appState.theme, 'doska-library-host')}
      {properties &&
        !hidden &&
        (dismissed === key ? (
          <button
            className="doska-reopen doska-bubble"
            aria-label="Открыть свойства"
            title="Свойства"
            onClick={() => dismiss(null)}
          >
            <UiIcon name="settings" />
          </button>
        ) : (
          <aside className="doska-inspector" aria-label="Свойства объекта">
            <header className="doska-panel-heading">
              <h2>Свойства</h2>
              <button
                className="doska-icon-button"
                aria-label="Закрыть свойства"
                onClick={() => {
                  dismiss(key);
                  setAppState({ openPopup: null });
                }}
              >
                <UiIcon name="close" />
              </button>
            </header>
            {properties}
          </aside>
        ))}
    </>
  );
}

export function MobileChrome({ native, appState, actionManager, setAppState, app }: ChromeProps) {
  const parts = children(native);
  const bottom = parts.find(node => className(node) === 'App-bottom-bar');
  const toolbar = parts.find(node => className(node).includes('App-top-bar'));
  const sidebars = parts.filter(node => node !== bottom && node !== toolbar);
  const island = children(bottom)[0];
  const islandParts = children(island);
  const settings = islandParts.find(node => className(node).includes('App-mobile-menu'));
  const footer = islandParts.find(node => className(node) === 'App-toolbar');
  const [commands, returnButton] = children(footer);
  const mainMenu = children(commands)[0];
  const [adding, setAdding] = useState(false);
  const selection = Object.keys(appState.selectedElementIds).join(',');
  const previousSelection = useRef(selection);
  const previousTool = useRef(appState.activeTool.type);
  const editable = !appState.viewModeEnabled && appState.openDialog?.name !== 'elementLinkSelector';

  useEffect(() => {
    if (previousTool.current !== appState.activeTool.type) {
      previousTool.current = appState.activeTool.type;
      setAdding(false);
    }
  }, [appState.activeTool.type]);
  useEffect(() => {
    if (selection !== previousSelection.current) {
      previousSelection.current = selection;
      if (selection && editable) {
        setAdding(false);
        setAppState({ openMenu: 'shape' });
      }
    }
  }, [selection, editable, setAppState]);
  useEffect(() => {
    if (appState.openSidebar || appState.openDialog || appState.openMenu === 'canvas')
      setAdding(false);
  }, [appState.openSidebar, appState.openDialog, appState.openMenu]);

  const close = () => {
    setAdding(false);
    setAppState({ openMenu: null, openPopup: null });
  };
  const styleAvailable =
    !!selection || !['selection', 'hand', 'eraser', 'laser'].includes(appState.activeTool.type);
  const openTools = () => {
    setAppState({ openMenu: null, openPopup: null });
    setAdding(!adding);
  };
  const heading = toolNames[appState.activeTool.type] || 'Инструмент';

  return (
    <>
      {sidebars}
      {portal(
        mainMenu,
        'doska-menu-slot',
        appState.theme,
        'doska-command-menu doska-command-menu--mobile'
      )}
      {(adding || appState.openMenu === 'canvas') && (
        <button
          className="doska-chrome-dismiss"
          aria-label="Закрыть панель"
          onClick={close}
          tabIndex={-1}
        />
      )}
      {adding && editable && (
        <section className="doska-mobile-sheet doska-add-sheet" aria-label="Добавить на доску">
          <header className="doska-panel-heading">
            <h2>Инструменты</h2>
            <button className="doska-icon-button" aria-label="Закрыть инструменты" onClick={close}>
              <UiIcon name="close" />
            </button>
          </header>
          <div
            onClick={event => {
              if (event.target instanceof HTMLInputElement && event.target.type === 'radio')
                setAdding(false);
            }}
          >
            {toolbar}
          </div>
        </section>
      )}
      {settings && editable && !adding && (
        <section className="doska-mobile-sheet" aria-label="Свойства объекта">
          <header className="doska-panel-heading">
            <h2>Свойства</h2>
            <button className="doska-icon-button" aria-label="Закрыть свойства" onClick={close}>
              <UiIcon name="close" />
            </button>
          </header>
          <div className="doska-sheet-scroll">{settings}</div>
          {selection && (
            <div className="doska-object-actions">
              {actionManager.renderAction('duplicateSelection')}
              {actionManager.renderAction('deleteSelectedElements')}
            </div>
          )}
        </section>
      )}
      {returnButton && <div className="doska-return">{returnButton}</div>}
      {editable && (
        <footer className="doska-mobile-dock" aria-label="Управление доской">
          <div className="doska-bubble doska-history">
            {actionManager.renderAction('undo')}
            {actionManager.renderAction('redo')}
          </div>
          <button
            className="doska-bubble doska-current-tool"
            aria-label={`${heading}: ${styleAvailable ? 'свойства' : 'выбрать инструмент'}`}
            title={heading}
            aria-expanded={!!settings || adding}
            onClick={() => {
              if (styleAvailable) {
                setAdding(false);
                setAppState({ openMenu: settings ? null : 'shape' });
              } else openTools();
            }}
          >
            <UiIcon name={appState.activeTool.type} size={23} />
          </button>
          {appState.multiElement ? (
            <div className="doska-bubble doska-add">{actionManager.renderAction('finalize')}</div>
          ) : (
            <button
              className="doska-bubble doska-add"
              aria-label="Добавить"
              title="Добавить"
              aria-expanded={adding}
              onClick={openTools}
            >
              <UiIcon name={adding ? 'close' : 'plus'} size={25} />
            </button>
          )}
        </footer>
      )}
      {!editable && (
        <div className="doska-view-zoom">
          <button
            className="doska-bubble"
            aria-label="Показать всю доску"
            onClick={() => app.scrollToContent(undefined, { fitToViewport: true })}
          >
            <UiIcon name="frame" />
          </button>
        </div>
      )}
    </>
  );
}

const primary = new Set([
  'changeStrokeColor',
  'changeBackgroundColor',
  'changeStrokeWidth',
  'changeFontFamily',
  'changeFontSize',
  'changeTextAlign',
  'changeOpacity',
]);
function actionName(node: ReactNode): string | undefined {
  if (!isValidElement<NodeProps>(node)) return;
  return node.props['data-doska-action'] || children(node).map(actionName).find(Boolean);
}

export function Properties({ native }: { native: ReactElement<NodeProps> }) {
  const nodes = flatten(native.props.children);
  const basic: ReactNode[] = [];
  const advanced: ReactNode[] = [];
  for (const node of nodes) {
    const name = actionName(node);
    if (!name) continue;
    (primary.has(name) ? basic : advanced).push(node);
  }
  return (
    <div className="panelColumn doska-properties">
      <div className="doska-properties-grid">
        {basic.map(node => (
          <Fragment key={actionName(node)}>{node}</Fragment>
        ))}
      </div>
      {!!advanced.length && (
        <details className="doska-more-properties">
          <summary>Ещё параметры</summary>
          <div className="doska-properties-advanced">
            {advanced.map(node => (
              <Fragment key={actionName(node)}>{node}</Fragment>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
