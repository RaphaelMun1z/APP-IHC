"use strict";

(() => {
  const list = document.querySelector(".turmas-list");
  const button = document.getElementById("delete-selected");
  const count = document.querySelector(".turmas-count");
  const selectAll = document.getElementById("select-all-turmas");
  if (!list || !button) return;

  const checkboxes = () => [...list.querySelectorAll(".turma-row .turma-checkbox")];
  const selectedRows = () => checkboxes().filter(input => input.checked).map(input => input.closest(".turma-row"));
  const update = () => {
    const selectedCount = selectedRows().length;
    button.hidden = selectedCount === 0;
    if (selectAll) {
      selectAll.checked = checkboxes().length > 0 && selectedCount === checkboxes().length;
      selectAll.indeterminate = selectedCount > 0 && selectedCount < checkboxes().length;
    }
    const label = selectedCount === 1 ? "Apagar 1 turma selecionada" : `Apagar ${selectedCount} turmas selecionadas`;
    button.setAttribute("aria-label", label);
    button.title = label;
    if (count) count.textContent = `${list.querySelectorAll(".turma-row").length} turmas`;
  };

  list.addEventListener("change", event => {
    if (event.target === selectAll) {
      checkboxes().forEach(input => { input.checked = selectAll.checked; });
      update();
      return;
    }
    if (event.target.matches(".turma-checkbox")) update();
  });
  button.addEventListener("click", () => {
    const rows = selectedRows();
    if (!rows.length) return;
    const message = rows.length === 1
      ? "Deseja apagar a turma selecionada?"
      : `Deseja apagar as ${rows.length} turmas selecionadas?`;
    if (!window.confirm(message)) return;
    rows.forEach(row => row.remove());
    update();
  });
  update();
})();
