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

  const getCurrentCommand = (text) => {
    const promptToken = "> ";
    const lastPromptWithNewline = text.lastIndexOf("\n" + promptToken);
    if (lastPromptWithNewline !== -1) {
      return text.slice(lastPromptWithNewline + 1 + promptToken.length).trim();
    }
    const lastPrompt = text.lastIndexOf(promptToken);
    if (lastPrompt !== -1) {
      return text.slice(lastPrompt + promptToken.length).trim();
    }
    return text.trim();
  };

  const getCommandResponse = (command) => {
    if (!command) {
      return [];
    }
    if (command === "help") {
      return ["Available commands:", " - help: show this message"]; 
    }
    return [`Error: unknown command "${command}". Type "help" for available commands.`];
  };

  consoleContent.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      const currentText = consoleContent.textContent ?? "";
      const command = getCurrentCommand(currentText);
      const responseLines = getCommandResponse(command);

      let nextText = currentText;
      if (responseLines.length) {
        nextText += "\n" + responseLines.join("\n");
      }
      nextText += "\n> ";
      consoleContent.textContent = nextText;

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
