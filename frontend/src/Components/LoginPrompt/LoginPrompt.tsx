import { Link } from "react-router-dom";
import "./LoginPrompt.css";

interface LoginPromptProps {
  isVisible: boolean;
  onClose: () => void;
  message?: string;
}

export default function LoginPrompt({
  isVisible,
  onClose,
  message = "to interact with posts",
}: LoginPromptProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <>
      <div className="login-prompt-backdrop" onClick={onClose} />
      <div className="login-prompt-toast">
        <div className="login-prompt-content">
          <span className="login-prompt-message">
            Please{" "}
            <Link to="/login" className="login-prompt-link">
              log in
            </Link>{" "}
            or{" "}
            <Link to="/register" className="login-prompt-link">
              register
            </Link>{" "}
            {message}
          </span>
          <button
            type="button"
            className="login-prompt-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
