import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrashBoard } from '../types/types';
import { BoardService } from '../services/boardService';
import { useBoardContext } from '../contexts/BoardProvider';
import Dialog from './Dialog';
import logger from '../utils/logger';

interface ArchivePopupProps {
  isOpen: boolean;
  onClose: () => void;
}
const ArchivePopup = ({ onClose, isOpen }: ArchivePopupProps) => {
  const [boards, setBoards] = useState<TrashBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const navigate = useNavigate();
  const { fetchBoards } = useBoardContext();
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError('');
    setDeleting(null);
    BoardService.getTrashedBoards()
      .then(data => {
        if (active) setBoards(data);
      })
      .catch(error => {
        if (active) setError('Не удалось загрузить архив. Закройте окно и попробуйте ещё раз.');
        logger.error('Error fetching archived boards:', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen]);
  const restore = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await BoardService.restoreBoard(id);
      await fetchBoards();
      navigate(`/board/${id}`);
      onClose();
    } catch (error) {
      setError('Не удалось восстановить доску. Попробуйте ещё раз.');
      logger.error('Error restoring board:', error);
    } finally {
      setBusy(false);
    }
  };
  const remove = async (id: string) => {
    setBusy(true);
    setError('');
    try {
      await BoardService.permanentlyDeleteBoard(id);
      setBoards(previous => previous.filter(board => board.id !== id));
      setDeleting(null);
    } catch (error) {
      setError('Не удалось удалить доску. Попробуйте ещё раз.');
      logger.error('Error deleting board:', error);
    } finally {
      setBusy(false);
    }
  };
  if (!isOpen) return null;
  return (
    <Dialog title="Архив досок" onClose={onClose}>
      {loading ? (
        <p role="status">Загрузка архива…</p>
      ) : boards.length === 0 && !error ? (
        <p>В архиве пока нет досок.</p>
      ) : (
        <div className="doska-archive-list">
          {boards.map(board => (
            <article key={board.id}>
              <h3>{board.name}</h3>
              <p>{new Date(board.updated_at).toLocaleString('ru-RU')}</p>
              {deleting === board.id ? (
                <>
                  <p>Удалить навсегда? Восстановить эту доску будет невозможно.</p>
                  <div className="doska-inline-actions">
                    <button
                      className="doska-secondary"
                      disabled={busy}
                      onClick={() => setDeleting(null)}
                    >
                      Отмена
                    </button>
                    <button
                      className="doska-secondary doska-danger"
                      disabled={busy}
                      onClick={() => remove(board.id)}
                    >
                      Удалить навсегда
                    </button>
                  </div>
                </>
              ) : (
                <div className="doska-inline-actions">
                  <button
                    className="doska-secondary"
                    disabled={busy}
                    onClick={() => restore(board.id)}
                  >
                    Восстановить
                  </button>
                  <button
                    className="doska-secondary doska-danger"
                    disabled={busy}
                    onClick={() => setDeleting(board.id)}
                  >
                    Удалить
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {error && (
        <p className="doska-error" role="alert">
          {error}
        </p>
      )}
    </Dialog>
  );
};
export default ArchivePopup;
