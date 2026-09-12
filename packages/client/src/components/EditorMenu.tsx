import { memo, useState } from 'react';
import { MainMenu } from '@excalidraw/excalidraw';
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types';
import Dialog from './Dialog';
import UiIcon from './UiIcon';

function EditorMenu({
  api,
  readOnly,
}: {
  api: ExcalidrawImperativeAPI | null;
  readOnly?: boolean;
}) {
  const [about, setAbout] = useState(false);
  return (
    <>
      <MainMenu>
        <MainMenu.DefaultItems.SearchMenu />
        <MainMenu.DefaultItems.SaveAsImage />
        {!readOnly && (
          <MainMenu.Item
            icon={<UiIcon name="library" />}
            onSelect={() => api?.toggleSidebar({ name: 'default', tab: 'library' })}
          >
            Библиотека
          </MainMenu.Item>
        )}
        <MainMenu.Separator />
        <MainMenu.DefaultItems.ToggleTheme />
        <MainMenu.DefaultItems.ChangeCanvasBackground />
        {!readOnly && (
          <MainMenu.Item
            icon={<UiIcon name="hand" />}
            onSelect={() => api?.setActiveTool({ type: 'hand' })}
          >
            Перемещение холста
          </MainMenu.Item>
        )}
        {!readOnly && (
          <MainMenu.Item
            icon={<UiIcon name="freedraw" />}
            onSelect={() => {
              if (api) api.updateScene({ appState: { penMode: !api.getAppState().penMode } });
            }}
          >
            Режим пера: вкл. / выкл.
          </MainMenu.Item>
        )}
        <MainMenu.DefaultItems.Help />
        <MainMenu.Item onSelect={() => setAbout(true)}>О приложении</MainMenu.Item>
        {!readOnly && (
          <>
            <MainMenu.Separator />
            <MainMenu.DefaultItems.ClearCanvas />
          </>
        )}
      </MainMenu>
      {about && (
        <Dialog title="О приложении" onClose={() => setAbout(false)}>
          <p>Доска — личное пространство для заметок, изображений и рисунков.</p>
          <p>
            Редактор основан на Excalidraw и Excalidraw Persist. Исходный код распространяется по
            лицензии MIT.
          </p>
          <p>
            <a
              href="https://github.com/Krablante/excalidraw-persist"
              target="_blank"
              rel="noreferrer"
            >
              Исходный код Доски
            </a>{' '}
            ·{' '}
            <a
              href="https://github.com/excalidraw/excalidraw/blob/v0.18.0/LICENSE"
              target="_blank"
              rel="noreferrer"
            >
              Лицензия Excalidraw
            </a>
          </p>
        </Dialog>
      )}
    </>
  );
}
export default memo(EditorMenu);
