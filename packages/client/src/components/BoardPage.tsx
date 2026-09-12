import Header from './Header';
import { useBoardContext } from '../contexts/BoardProvider';
import '../styles/BoardPage.scss';
import ExcalidrawEditor from './ExcalidrawEditor';
import Loader from './Loader';

const BoardPage = () => {
  const { isLoading, activeBoardId } = useBoardContext();

  if (isLoading) {
    return (
      <div className="board-page loading">
        <Loader message="Загрузка доски…" />
      </div>
    );
  }

  if (!activeBoardId) {
    return (
      <div className="board-page error">
        <div className="error-container">
          <h2>Не удалось открыть доску</h2>
          <p>Обновите страницу, чтобы повторить загрузку.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="board-page">
      <Header />
      <div className="editor-container">
        <ExcalidrawEditor key={activeBoardId} boardId={activeBoardId} />
      </div>
    </div>
  );
};

export default BoardPage;
