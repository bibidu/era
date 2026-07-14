export function cleanupEditorUi() {
  document.body.classList.remove('keyboard-dock-open')
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur()
  }
}
