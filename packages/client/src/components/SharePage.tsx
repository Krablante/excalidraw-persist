import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ShareService, type ShareInfo } from '../services/shareService';
import ExcalidrawEditor from './ExcalidrawEditor';
import Loader from './Loader';
import '../styles/SharePage.scss';
import logger from '../utils/logger';
import FullscreenButton from './FullscreenButton';

const SharePage = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareId) return;

    const fetchShareInfo = async () => {
      try {
        setIsLoading(true);
        const info = await ShareService.getShareInfo(shareId);
        setShareInfo(info);
      } catch (err) {
        setError('Ссылка не найдена или была удалена.');
        logger.error('Error fetching share info:', err, true);
      } finally {
        setIsLoading(false);
      }
    };

    fetchShareInfo();
  }, [shareId]);

  if (isLoading) {
    return (
      <div className="share-page loading">
        <Loader message="Загрузка общей доски…" />
      </div>
    );
  }

  if (error || !shareInfo || !shareId) {
    return (
      <div className="share-page error">
        <div className="error-container">
          <h2>Не удалось открыть доску</h2>
          <p>{error || 'Неверная ссылка.'}</p>
        </div>
      </div>
    );
  }

  const isReadOnly = shareInfo.permission === 'readonly';

  return (
    <div className="share-page">
      <div className="share-header">
        <span className="share-board-name">{shareInfo.name}</span>
        {isReadOnly && <span className="share-badge">Просмотр</span>}
        <div id="doska-tools-slot" />
        <div id="doska-library-slot" />
        <FullscreenButton />
        <div id="doska-menu-slot" />
      </div>
      <div className="editor-container">
        <ExcalidrawEditor key={shareId} shareId={shareId} readOnly={isReadOnly} />
      </div>
    </div>
  );
};

export default SharePage;
