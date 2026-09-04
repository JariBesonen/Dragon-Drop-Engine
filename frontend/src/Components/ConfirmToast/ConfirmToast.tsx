import "./ConfirmToast.css";

interface ConfirmToastProps {
  isVisible: boolean;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmToast({
  isVisible,
  message,
  onConfirm,
  onCancel,
}: ConfirmToastProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <>
      <div className="confirm-toast-backdrop" onClick={onCancel} />
      <div className="confirm-toast">
        <div className="confirm-toast-content">
          <span className="confirm-toast-message">{message}</span>
          <div className="confirm-toast-actions">
            <button
              type="button"
              className="confirm-toast-confirm"
              onClick={onConfirm}
            >
              Delete
            </button>
            <button
              type="button"
              className="confirm-toast-cancel"
              onClick={onCancel}
              aria-label="Cancel"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
