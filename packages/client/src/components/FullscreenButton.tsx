import { useEffect, useState } from 'react';
import { useToast } from '../contexts/ToastProvider';
import '../styles/FullscreenButton.scss';

const FullscreenButton = () => {
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);
  const [isPending, setIsPending] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  if (!document.fullscreenEnabled) return null;

  const label = isFullscreen ? 'Exit full screen' : 'Full screen';

  const toggleFullscreen = async () => {
    setIsPending(true);
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        // Include the header and body-level portals (dialogs, menus and toasts).
        await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
      }
    } catch {
      showToast('Could not change full screen. Please try again.', 'error');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      type="button"
      className="fullscreen-button"
      onClick={toggleFullscreen}
      disabled={isPending}
      aria-label={label}
      title={label}
      data-active={isFullscreen}
    >
      <svg
        width="21"
        height="21"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d={
            isFullscreen
              ? 'M3 8h5V3m8 0v5h5M3 16h5v5m8 0v-5h5'
              : 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5'
          }
        />
      </svg>
      <span className="fullscreen-label">{label}</span>
    </button>
  );
};

export default FullscreenButton;
