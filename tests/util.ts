export const getFocusedTextArea = () => {
  const textarea = document.createElement("textarea");
  document.body.appendChild(textarea);
  textarea.focus();
  return textarea;
};

export const pull = () => ({ ":block/children": [], ":block/string": "" });
