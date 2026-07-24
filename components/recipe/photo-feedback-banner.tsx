export type PhotoFeedbackTone = "information" | "attention" | "error";

export type PhotoFeedback = {
  tone: PhotoFeedbackTone;
  heading: string;
  body: string;
};

export function PhotoFeedbackBanner({ feedback }: { feedback: PhotoFeedback }) {
  const icon = feedback.tone === "attention" ? "!" : feedback.tone === "error" ? "×" : "i";
  return <aside className={`photo-feedback photo-feedback-${feedback.tone}`} role="status" aria-live="polite">
    <span className="photo-feedback-icon" aria-hidden="true">{icon}</span>
    <div><strong>{feedback.heading}</strong><p>{feedback.body}</p></div>
  </aside>;
}
