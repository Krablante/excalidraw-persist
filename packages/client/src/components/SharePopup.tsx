import { useState, useEffect } from 'react';
import { ShareService, type ShareLink } from '../services/shareService';
import Dialog from './Dialog';
import logger from '../utils/logger';

interface SharePopupProps {
  isOpen: boolean;
  onClose: () => void;
  boardId: string;
}

const SharePopup = ({ isOpen, onClose, boardId }: SharePopupProps) => {
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    let active = true;
    setLoading(true);
    setError('');
    setCopiedId(null);
    ShareService.listShareLinks(boardId)
      .then(data => {
        if (active) setLinks(data);
      })
      .catch(error => {
        if (active) setError('Не удалось загрузить ссылки. Закройте окно и попробуйте ещё раз.');
        logger.error('Error fetching share links:', error);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, boardId]);

  const url = (id: string) => `${window.location.origin}/share/${id}`;
  const copy = async (id: string) => {
    setError('');
    try {
      await navigator.clipboard.writeText(url(id));
      setCopiedId(id);
    } catch {
      setError('Не удалось скопировать автоматически. Выделите ссылку и скопируйте её вручную.');
    }
  };
  const create = async (permission: 'edit' | 'readonly') => {
    setBusy(true);
    setError('');
    try {
      const link = await ShareService.createShareLink(boardId, permission);
      setLinks(previous =>
        previous.some(item => item.id === link.id) ? previous : [...previous, link]
      );
      await copy(link.id);
    } catch (error) {
      setError('Не удалось создать ссылку. Попробуйте ещё раз.');
      logger.error('Error creating share link:', error);
    } finally {
      setBusy(false);
    }
  };
  if (!isOpen) return null;
  return (
    <Dialog title="Поделиться доской" onClose={onClose}>
      {loading ? (
        <p role="status">Загрузка ссылок…</p>
      ) : (
        <div className="doska-share-options">
          {(['readonly', 'edit'] as const).map(permission => {
            const link = links.find(item => item.permission === permission);
            return (
              <section key={permission}>
                <h3>{permission === 'readonly' ? 'Просмотр' : 'Редактирование'}</h3>
                <p>
                  {permission === 'readonly'
                    ? 'По ссылке можно смотреть доску, но нельзя её изменять.'
                    : 'Любой, у кого есть ссылка, сможет изменять доску.'}
                </p>
                {link ? (
                  <div className="doska-share-link">
                    <input
                      aria-label={`Ссылка: ${permission === 'readonly' ? 'просмотр' : 'редактирование'}`}
                      readOnly
                      value={url(link.id)}
                      onFocus={event => event.target.select()}
                    />
                    <button className="doska-secondary" onClick={() => copy(link.id)}>
                      {copiedId === link.id ? 'Скопировано' : 'Копировать'}
                    </button>
                  </div>
                ) : (
                  <button
                    className="doska-secondary"
                    disabled={busy}
                    onClick={() => create(permission)}
                  >
                    Создать ссылку
                  </button>
                )}
              </section>
            );
          })}
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
export default SharePopup;
