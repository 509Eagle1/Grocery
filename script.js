// ==========================
// CONFIGURATION
// ==========================
const owner = "509Eagle1";
const repo = "Grocery";
const path = "data/grocery.json";

// ==========================
// DATA HANDLING
// ==========================
let groceryItems = JSON.parse(localStorage.getItem("groceryItems") || "[]");

function saveData() {
  localStorage.setItem("groceryItems", JSON.stringify(groceryItems));
}

// ==========================
// MASTER LIST (ALBERTSONS)
// ==========================
function renderMaster() {
  const list = document.getElementById("albertsonsList");
  list.innerHTML = "";

  groceryItems.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "item";
    li.setAttribute("draggable", "true");
    li.dataset.index = index;

    li.innerHTML = `
      <div class="item-left">
        <input type="checkbox" ${item.checked ? "checked" : ""}>
        <span>${item.name}</span>
      </div>
      <div class="item-right">
        <button class="dropdown-btn">Options</button>
        <div class="dropdown-content">
          <button class="edit-btn">Edit</button>
          <button class="remove-btn">Remove</button>
        </div>
        <div class="drag-handle">≡≡</div>
      </div>
    `;

    // Checkbox for sending item to shopping list
    li.querySelector("input").addEventListener("change", (e) => {
      item.checked = e.target.checked;
      saveData();
      renderChecked();
    });

    // Edit button
    li.querySelector(".edit-btn").addEventListener("click", () => {
      const newName = prompt("Edit item name:", item.name);
      if (newName) {
        item.name = newName;
        saveData();
        renderMaster();
        renderChecked();
      }
    });

    // Remove button
    li.querySelector(".remove-btn").addEventListener("click", () => {
      groceryItems.splice(index, 1);
      saveData();
      renderMaster();
      renderChecked();
    });

    // Dropdown toggle
    li.querySelector(".dropdown-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      closeAllDropdowns();
      li.querySelector(".dropdown-content").classList.toggle("show");
    });

    list.appendChild(li);
  });

  initDragAndDrop();
}

function closeAllDropdowns() {
  document.querySelectorAll(".dropdown-content").forEach(dd => dd.classList.remove("show"));
}

document.addEventListener("click", closeAllDropdowns);

// ==========================
// DRAG AND DROP HANDLER
// ==========================
function initDragAndDrop() {
  const list = document.getElementById("albertsonsList");
  let dragged;

  list.querySelectorAll(".item").forEach(item => {
    item.addEventListener("dragstart", () => {
      dragged = item;
      item.classList.add("dragging");
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
    });
  });

  list.addEventListener("dragover", (e) => {
    e.preventDefault();
    const afterElement = getDragAfterElement(list, e.clientY);
    const draggable = document.querySelector(".dragging");
    if (afterElement == null) {
      list.appendChild(draggable);
    } else {
      list.insertBefore(draggable, afterElement);
    }
  });

  list.addEventListener("drop", () => {
    const newOrder = Array.from(list.querySelectorAll(".item")).map(li => {
      const idx = li.dataset.index;
      return groceryItems[idx];
    });
    groceryItems = newOrder;
    saveData();
    renderMaster();
  });
}

function getDragAfterElement(list, y) {
  const draggableElements = [...list.querySelectorAll(".item:not(.dragging)")];
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// ==========================
// SHOPPING LIST
// ==========================
function renderChecked() {
  const checkedList = document.getElementById("shoppingList");
  checkedList.innerHTML = "";

  groceryItems.filter(i => i.checked).forEach(item => {
    const li = document.createElement("li");
    li.className = "shopping-item";

    // Always unchecked when added
    li.innerHTML = `
      <input type="checkbox">
      <span>${item.name}</span>
    `;

    const checkbox = li.querySelector("input[type='checkbox']");
    const span = li.querySelector("span");

    // When checked → move to bottom and strike through
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        span.style.textDecoration = "line-through";
        checkedList.appendChild(li);
      } else {
        span.style.textDecoration = "none";
        checkedList.insertBefore(li, checkedList.firstChild);
      }
      saveData();
    });

    checkedList.appendChild(li);
  });
}

// ==========================
// ADD ITEM
// ==========================
document.getElementById("addItemBtn").addEventListener("click", () => {
  const input = document.getElementById("itemInput");
  const name = input.value.trim();
  if (name) {
    groceryItems.push({ name, checked: false });
    saveData();
    renderMaster();
    input.value = "";
  }
});

// ==========================
// ADMIN MENU DROPDOWN
// ==========================
document.getElementById("adminMenuBtn").addEventListener("click", (e) => {
  e.stopPropagation();
  document.getElementById("adminDropdown").classList.toggle("show");
});

document.addEventListener("click", (e) => {
  if (!e.target.closest("#adminDropdown") && !e.target.closest("#adminMenuBtn")) {
    document.getElementById("adminDropdown").classList.remove("show");
  }
});

// ==========================
// GITHUB INTEGRATION
// ==========================
async function githubExport() {
  const token = localStorage.getItem("githubToken");
  if (!token) return alert("GitHub token missing!");
  const content = JSON.stringify(groceryItems, null, 2);
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  try {
    // get existing file sha if exists
    let sha = null;
    const getResp = await fetch(apiUrl, {
      headers: { Authorization: `token ${token}` }
    });
    if (getResp.ok) {
      const data = await getResp.json();
      sha = data.sha;
    }

    const body = {
      message: "Update grocery list",
      content: btoa(unescape(encodeURIComponent(content))),
      sha: sha || undefined
    };

    const putResp = await fetch(apiUrl, {
      method: "PUT",
      headers: { Authorization: `token ${token}` },
      body: JSON.stringify(body)
    });

    if (putResp.ok) alert("Exported to GitHub successfully!");
    else alert("Failed to export to GitHub.");
  } catch (err) {
    console.error(err);
    alert("Error exporting to GitHub.");
  }
}

async function githubRestore() {
  const token = localStorage.getItem("githubToken");
  if (!token) return alert("GitHub token missing!");
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  try {
    const resp = await fetch(apiUrl, {
      headers: { Authorization: `token ${token}` }
    });
    if (!resp.ok) return alert("Failed to fetch from GitHub.");
    const data = await resp.json();
    const json = atob(data.content);
    groceryItems = JSON.parse(json);
    saveData();
    renderMaster();
    renderChecked();
    alert("Restored from GitHub successfully!");
  } catch (err) {
    console.error(err);
    alert("Error restoring from GitHub.");
  }
}

document.getElementById("exportJsonBtn").addEventListener("click", githubExport);
document.getElementById("restoreGitHubBtn").addEventListener("click", githubRestore);
document.getElementById("importListBtn").addEventListener("click", () => {
  document.getElementById("importListInput").click();
});
document.getElementById("setTokenBtn").addEventListener("click", promptGitHubToken);
document.getElementById("loadTokenFileBtn").addEventListener("click", () => {
  document.getElementById("tokenFileInput").click();
});

document.getElementById("tokenFileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const token = ev.target.result.trim();
    if (token) {
      localStorage.setItem("githubToken", token);
      document.getElementById("tokenStatus").textContent = "✅ GitHub Token Set";
      alert("Token loaded!");
    }
  };
  reader.readAsText(file);
});

document.getElementById("importListInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      groceryItems = JSON.parse(ev.target.result);
      saveData();
      renderMaster();
      renderChecked();
      alert("Imported list successfully!");
    } catch (err) {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(file);
});

// ==========================
// INIT
// ==========================
renderMaster();
renderChecked();