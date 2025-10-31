const owner = "509Eagle1";
const repo = "Grocery";
const path = "data/grocery.json";

let groceryItems = JSON.parse(localStorage.getItem('groceryItems') || "[]");

// ===== Save / Load =====
function saveData() {
  localStorage.setItem('groceryItems', JSON.stringify(groceryItems));
}

// ===== GitHub Token =====
function promptGitHubToken() {
  let token = localStorage.getItem("githubToken");
  if (!token) token = prompt("⚠️ GitHub token missing! Enter token:") || null;
  if(token) localStorage.setItem("githubToken", token);
  document.getElementById("tokenStatus").textContent = token ? "✅ GitHub Token Set" : "⚠️ No GitHub Token";
}

// ===== Render Master List (Albertsons) =====
function renderMaster(filter="") {
  const list = document.getElementById("groceryList");
  list.innerHTML = "";

  groceryItems.forEach((item, index) => {
    if(filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;

    const li = document.createElement("li");
    li.className = "item";

    // LEFT: Checkbox + Name
    const leftDiv = document.createElement("div");
    leftDiv.className = "item-left";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.checked || false;
    checkbox.addEventListener("change", () => {
      item.checked = checkbox.checked;
      renderChecked();
    });

    const span = document.createElement("span");
    span.textContent = `${item.name} (Aisle: ${item.aisle})`;

    leftDiv.appendChild(checkbox);
    leftDiv.appendChild(span);
    li.appendChild(leftDiv);

    // RIGHT: Drag + Options
    const rightDiv = document.createElement("div");
    rightDiv.className = "item-right";

    // Drag handle
    const drag = document.createElement("div");
    drag.className = "drag-handle";
    drag.innerHTML = "☰";
    drag.setAttribute("draggable", true);
    drag.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", index);
    });
    rightDiv.appendChild(drag);

    // Options dropdown
    const dropdown = document.createElement("div");
    dropdown.className = "dropdown";

    const dropBtn = document.createElement("button");
    dropBtn.className = "dropdown-btn";
    dropBtn.textContent = "Options ⏷";

    const dropContent = document.createElement("div");
    dropContent.className = "dropdown-content";

    const editBtn = document.createElement("button");
    editBtn.className = "edit";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", () => {
      const newName = prompt("Edit item:", item.name);
      if(newName !== null) item.name = newName.trim();
      const newAisle = prompt("Edit aisle:", item.aisle);
      if(newAisle !== null) item.aisle = newAisle.trim();
      renderMaster(document.getElementById("searchInput").value);
      saveData();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", e => {
      e.stopPropagation();
      if(confirm(`Are you sure you want to remove "${item.name}"?`)){
        groceryItems.splice(index, 1);
        saveData();
        renderMaster(document.getElementById("searchInput").value);
      }
    });

    dropContent.appendChild(editBtn);
    dropContent.appendChild(removeBtn);
    dropdown.appendChild(dropBtn);
    dropdown.appendChild(dropContent);
    rightDiv.appendChild(dropdown);
    li.appendChild(rightDiv);

    // Toggle dropdown
    dropBtn.addEventListener("click", e => {
      e.stopPropagation();
      const isVisible = dropContent.style.display === "block";
      document.querySelectorAll(".dropdown-content").forEach(dc => dc.style.display = "none");
      dropContent.style.display = isVisible ? "none" : "block";
    });

    // Drag-and-drop
    li.addEventListener("dragover", e => e.preventDefault());
    li.addEventListener("drop", e => {
      const draggedIndex = e.dataTransfer.getData("text/plain");
      const targetIndex = index;
      if(draggedIndex === targetIndex) return;
      const draggedItem = groceryItems.splice(draggedIndex, 1)[0];
      groceryItems.splice(targetIndex, 0, draggedItem);
      saveData();
      renderMaster(document.getElementById("searchInput").value);
    });

    list.appendChild(li);
  });
}

// ===== Render Checked / Shopping List =====
function renderChecked() {
  const checkedList = document.getElementById("checkedList");
  checkedList.innerHTML = "";
  const checkedItems = groceryItems.filter(i => i.checked);

  // uncheck all for shopping list
  checkedItems.forEach(item => item.checked = false);

  checkedItems.forEach(item => {
    const li = document.createElement("li");
    li.className = "item";

    const cb = document.createElement("input");
    cb.type = "checkbox";

    const span = document.createElement("span");
    span.textContent = `${item.name} (Aisle: ${item.aisle})`;

    li.appendChild(cb);
    li.appendChild(span);

    // Toggle strike-through and move to bottom
    cb.addEventListener("change", () => {
      li.classList.toggle("checked", cb.checked);
      if(cb.checked) checkedList.appendChild(li);
    });

    checkedList.appendChild(li);
  });
}

// ===== Add Item =====
function addItem() {
  const name = document.getElementById("itemInput").value.trim();
  const aisle = document.getElementById("aisleInput").value.trim();
  if(!name) return;

  groceryItems.push({name, aisle, checked: false});
  document.getElementById("itemInput").value = "";
  document.getElementById("aisleInput").value = "";

  saveData();
  renderMaster();
}

// ===== Page Switching =====
function showMaster() {
  document.getElementById("masterPage").classList.remove("hidden");
  document.getElementById("checkedPage").classList.add("hidden");
  document.getElementById("addPage").classList.add("hidden");
}

function showChecked() {
  document.getElementById("masterPage").classList.add("hidden");
  document.getElementById("checkedPage").classList.remove("hidden");
  document.getElementById("addPage").classList.add("hidden");
  renderChecked();
}

function showAdd() {
  document.getElementById("addPage").classList.remove("hidden");
  document.getElementById("masterPage").classList.add("hidden");
  document.getElementById("checkedPage").classList.add("hidden");
}

// ===== GitHub API =====
async function githubExport() {
  const token = localStorage.getItem("githubToken");
  if(!token) return alert("GitHub token missing!");
  const content = JSON.stringify(groceryItems, null, 2);
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  try {
    // Get existing file SHA (if exists)
    let sha = null;
    const getResp = await fetch(apiUrl, {
      headers: { Authorization: `token ${token}` }
    });
    if(getResp.ok) {
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

    if(putResp.ok) alert("Exported to GitHub successfully!");
    else alert("Failed to export to GitHub.");

  } catch(err) {
    console.error(err);
    alert("Error exporting to GitHub.");
  }
}

async function githubRestore() {
  const token = localStorage.getItem("githubToken");
  if(!token) return alert("GitHub token missing!");
  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  try {
    const resp = await fetch(apiUrl, {
      headers: { Authorization: `token ${token}` }
    });
    if(!resp.ok) return alert("Failed to fetch from GitHub.");
    const data = await resp.json();
    const json = atob(data.content);
    groceryItems = JSON.parse(json);
    saveData();
    renderMaster();
    renderChecked();
    alert("Restored from GitHub successfully!");
  } catch(err) {
    console.error(err);
    alert("Error restoring from GitHub.");
  }
}

// ===== Import JSON from local file =====
document.getElementById("importListInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      groceryItems = JSON.parse(ev.target.result);
      saveData();
      renderMaster();
      renderChecked();
      alert("Imported list successfully!");
    } catch(err) {
      alert("Invalid JSON file.");
    }
  };
  reader.readAsText(file);
});

// ===== Admin Buttons =====
document.getElementById("exportJsonBtn").addEventListener("click", githubExport);
document.getElementById("restoreGitHubBtn").addEventListener("click", githubRestore);
document.getElementById("importListBtn").addEventListener("click", () => {
  document.getElementById("importListInput").click();
});
document.getElementById("setTokenBtn").addEventListener("click", promptGitHubToken);
document.getElementById("loadTokenFileBtn").addEventListener("click", () => {
  document.getElementById("tokenFileInput").click();
});

// ===== Load token from file =====
document.getElementById("tokenFileInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const token = ev.target.result.trim();
    if(token) {
      localStorage.setItem("githubToken", token);
      document.getElementById("tokenStatus").textContent = "✅ GitHub Token Set";
      alert("Token loaded!");
    }
  };
  reader.readAsText(file);
});

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", () => {
  promptGitHubToken();
  renderMaster();
  renderChecked();

  // Page buttons
  document.getElementById("showMasterBtn").addEventListener("click", showMaster);
  document.getElementById("showCheckedBtn").addEventListener("click", showChecked);
  document.getElementById("showAddBtn").addEventListener("click", showAdd);

  // Add item
  document.getElementById("addItemBtn").addEventListener("click", addItem);

  // Clear all checks
  document.getElementById("clearChecksBtn").addEventListener("click", () => {
    groceryItems.forEach(i => i.checked = false);
    saveData();
    renderMaster();
    renderChecked();
  });

  // Search
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  searchInput.addEventListener("input", () => {
    renderMaster(searchInput.value);
    clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
  });
  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = '';
    renderMaster();
    clearSearchBtn.style.display = 'none';
  });

  // ===== Admin Dropdown Toggle =====
  const adminBtn = document.querySelector(".menu .dropdown-btn");
  const dropdownContent = document.querySelector(".dropdown-content");

  adminBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = dropdownContent.style.display === "block";
    document.querySelectorAll(".dropdown-content").forEach(dc => dc.style.display = "none");
    dropdownContent.style.display = isVisible ? "none" : "block";
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-content").forEach(dc => dc.style.display = "none");
  });
});