window.addEventListener("DOMContentLoaded", () => {
  const canvas = document.getElementById("main-canvas");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  if (!context) {
    return;
  }

  context.fillStyle = "#4a90e2";
  context.fillRect(50, 40, 200, 120);
});
