import type { ReactNode } from "react";

export default function Modal({
  title,
  open,
  onClose,
  children
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <header>
          <h3>{title}</h3>
          <button onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
