window.addEventListener("DOMContentLoaded", () => {
  const consoleContent = document.querySelector(".console__content");

  if (!consoleContent) {
    return;
  }

  const ensureCaretAtEnd = () => {
    const selection = window.getSelection();
    if (!selection) {
      return;
    }

    const range = document.createRange();
    range.selectNodeContents(consoleContent);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  consoleContent.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      document.execCommand("insertText", false, "\n> ");
      ensureCaretAtEnd();
      consoleContent.parentElement?.scrollTo({
        top: consoleContent.parentElement.scrollHeight,
        behavior: "auto",
      });
    }
  });

  consoleContent.focus();
  ensureCaretAtEnd();
});
