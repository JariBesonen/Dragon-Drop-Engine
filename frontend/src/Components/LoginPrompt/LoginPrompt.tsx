import { Link } from "react-router-dom";
import "./LoginPrompt.css";

interface LoginPromptProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function LoginPrompt({ isVisible, onClose }: LoginPromptProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="login-prompt-toast">
      <div className="login-prompt-content">
        <span className="login-prompt-message">
          Please{" "}
          <Link to="/login" className="login-prompt-link">
            log in
          </Link>{" "}
          to interact with posts
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
  );
}
