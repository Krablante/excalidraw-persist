import { useEffect, useId, useRef, type ReactNode } from 'react';
import UiIcon from './UiIcon';

export default function Dialog({
  title,
  children,
  onClose,
  className = '',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className={`doska-dialog ${className}`}
      aria-labelledby={titleId}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => {
        if (event.target !== event.currentTarget) return;
        const r = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < r.left ||
          event.clientX > r.right ||
          event.clientY < r.top ||
          event.clientY > r.bottom
        )
          onClose();
      }}
    >
      <header className="doska-panel-heading">
        <h2 id={titleId}>{title}</h2>
        <button className="doska-icon-button" onClick={onClose} aria-label="Закрыть">
          <UiIcon name="close" />
        </button>
      </header>
      <div className="doska-dialog-body">{children}</div>
    </dialog>
  );
}
