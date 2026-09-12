import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Header.scss';
import ArchivePopup from './ArchivePopup';
import SharePopup from './SharePopup';
import { useBoardContext } from '../contexts/BoardProvider';
import FullscreenButton from './FullscreenButton';
import UiIcon from './UiIcon';
import Dialog from './Dialog';

export default function Header() {
  const [boardsOpen, setBoardsOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState('');
  const navigate = useNavigate();
  const { boards, activeBoardId, handleCreateBoard, handleRenameBoard, handleArchiveBoard } =
    useBoardContext();
  const board = boards.find(board => board.id === activeBoardId);
  return (
    <header className="header">
      <button
        className="doska-board-trigger"
        onClick={() => setBoardsOpen(true)}
        aria-label="Доски"
        aria-haspopup="dialog"
        title={board?.name}
      >
        <span>{board?.name || 'Доска'}</span>
        <UiIcon name="chevron" size={16} />
      </button>
      <div id="doska-tools-slot" />
      <div className="doska-header-actions">
        <div id="doska-library-slot" />
        <div id="doska-menu-slot" />
        <button
          className="doska-icon-button"
          onClick={() => setShareOpen(true)}
          aria-label="Поделиться"
          title="Поделиться"
        >
          <UiIcon name="share" />
        </button>
        <FullscreenButton />
      </div>
      {boardsOpen && (
        <Dialog title="Доски" className="doska-board-dialog" onClose={() => setBoardsOpen(false)}>
          <nav className="doska-board-list" aria-label="Выбор доски">
            {boards.map(item => (
              <button
                key={item.id}
                className={`doska-board-row ${item.id === activeBoardId ? 'is-active' : ''}`}
                aria-current={item.id === activeBoardId ? 'page' : undefined}
                onClick={() => {
                  navigate(`/board/${item.id}`);
                  setBoardsOpen(false);
                }}
              >
                <span>{item.name}</span>
                {item.id === activeBoardId && <UiIcon name="check" size={16} />}
              </button>
            ))}
          </nav>
          <div className="doska-menu-actions">
            <button
              onClick={() => {
                setBoardsOpen(false);
                void handleCreateBoard();
              }}
            >
              <UiIcon name="plus" />
              Новая доска
            </button>
            {board && (
              <button
                onClick={() => {
                  setName(board.name);
                  setRenaming(true);
                  setBoardsOpen(false);
                }}
              >
                <UiIcon name="freedraw" />
                Переименовать
              </button>
            )}
            {board && (
              <button
                onClick={() => {
                  setBoardsOpen(false);
                  void handleArchiveBoard(board.id);
                }}
              >
                <UiIcon name="archive" />В архив
              </button>
            )}
            <button
              onClick={() => {
                setBoardsOpen(false);
                setArchiveOpen(true);
              }}
            >
              <UiIcon name="library" />
              Открыть архив
            </button>
          </div>
        </Dialog>
      )}
      {renaming && board && (
        <Dialog title="Название доски" onClose={() => setRenaming(false)}>
          <form
            className="doska-form"
            onSubmit={event => {
              event.preventDefault();
              if (name.trim()) {
                handleRenameBoard(board.id, name.trim());
                setRenaming(false);
              }
            }}
          >
            <label htmlFor="board-name">Название</label>
            <input
              id="board-name"
              value={name}
              autoFocus
              onChange={event => setName(event.target.value)}
              maxLength={200}
              required
            />
            <button className="doska-primary" type="submit" disabled={!name.trim()}>
              Сохранить
            </button>
          </form>
        </Dialog>
      )}
      <ArchivePopup isOpen={archiveOpen} onClose={() => setArchiveOpen(false)} />
      {activeBoardId && (
        <SharePopup
          isOpen={shareOpen}
          onClose={() => setShareOpen(false)}
          boardId={activeBoardId}
        />
      )}
    </header>
  );
}
