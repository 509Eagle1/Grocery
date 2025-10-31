// GitHub configuration
const owner = "509Eagle1";
const repo = "Grocery";
const filePath = "data/grocery.json";

let githubToken = localStorage.getItem("githubToken") || "";
let albertsonsList = [];
let shoppingList = [];

// ===== PAGE NAVIGATION =====
const pages = {
  albertsons: document.getElementById("albertsonsPage"),
  shopping: document.getElementById("shoppingListPage"),
  add: document.getElementById("addItemsPage")
};
function showPage(page) {
  Object.values(pages).forEach(p => p.style.display = "none");
  pages[page].style.display = "block";
}
document.getElementById("albertsonsBtn").onclick = () => showPage("albertsons");
document.getElementById("shoppingListBtn").onclick = () => showPage("shopping");
document.getElementById("addItemsBtn").onclick = () => showPage("add");
showPage("albertsons");

// ===== RENDER ALBERTSONS LIST =====
function renderAlbertsons() {
  const container = document.getElementById("albertsonsList");
  container.innerHTML = "";
  albertsonsList.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "list-item";
    div.draggable = true;
    div.dataset.index = index;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.checked || false;
    checkbox.addEventListener("change", () => {
      item.checked = checkbox.checked;
      updateShoppingList();
    });

    const label = document.createElement("span");
    label.textContent = item.name;

    const optionsBtn = document.createElement("button");
    optionsBtn.textContent = "Options";
    optionsBtn.className = "options-btn";
    optionsBtn.onclick = () => toggleItemMenu(index);

    const dragHandle = document.createElement("span");
    dragHandle.className = "drag-handle";
    dragHandle.innerHTML = "≡≡";

    const menu = document.createElement("div");
    menu.className = "options-menu";
    menu.innerHTML = `
      <button onclick="editItem(${index})">Edit</button>
      <button onclick="removeItem(${index})">Remove</button>
    `;
    div.append(checkbox, label, optionsBtn, dragHandle, menu);
    container.appendChild(div);
  });
  enableDragAndDrop();
}

// ===== DRAG AND DROP =====
function enableDragAndDrop() {
  const items = document.querySelectorAll(".list-item");
  let dragged = null;

  items.forEach(item => {
    item.addEventListener("dragstart", () => {
      dragged = item;
      setTimeout(() => item.classList.add("dragging"), 0);
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
      dragged = null;
      saveToGitHub();
    });
    item.addEventListener("dragover", e => {
      e.preventDefault();
      const container = item.parentNode;
      const draggingRect = dragged.getBoundingClientRect();
      const targetRect = item.getBoundingClientRect();
      const next = draggingRect.top < targetRect.top ? item.nextSibling : item;
      container.insertBefore(dragged, next);
    });
  });
}

// ===== SHOPPING LIST =====
function updateShoppingList() {
  const checkedItems = albertsonsList.filter(i => i.checked);
  shoppingList = checkedItems.map(i => ({ name: i.name, checked: false }));
  renderShoppingList();
}

function renderShoppingList() {
  const ul = document.getElementById("shoppingList");
  ul.innerHTML = "";
  shoppingList.forEach((item, idx) => {
    const li = document.createElement("li");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = item.checked;
    cb.addEventListener("change", () => {
      item.checked = cb.checked;
      if (cb.checked) {
        li.classList.add("checked");
        ul.appendChild(li);
      } else {
        li.classList.remove("checked");
        ul.insertBefore(li, ul.firstChild);
      }
    });
    const span = document.createElement("span");
    span.textContent = item.name;
    li.append(cb, span);
    ul.appendChild(li);
  });
}

// ===== ITEM ACTIONS =====
function toggleItemMenu(index) {
  document.querySelectorAll(".options-menu").forEach(m => m.style.display = "none");
  const menu = document.querySelectorAll(".options-menu")[index];
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

function editItem(index) {
  const newName = prompt("Edit item:", albertsonsList[index].name);
  if (newName) {
    albertsonsList[index].name = newName;
    renderAlbertsons();
    saveToGitHub();
  }
}
function removeItem(index) {
  if (confirm("Remove this item?")) {
    albertsonsList.splice(index, 1);
    renderAlbertsons();
    saveToGitHub();
  }
}

// ===== ADD ITEM =====
document.getElementById("addItemBtn").onclick = () => {
  const input = document.getElementById("newItemInput");
  const name = input.value.trim();
  if (name) {
    albertsonsList.push({ name, checked: false });
    input.value = "";
    renderAlbertsons();
    saveToGitHub();
  }
};

// ===== GITHUB API FUNCTIONS =====
async function exportListToGitHub() {
  if (!githubToken) {
    alert("Set your GitHub token first!");
    return;
  }
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const content = btoa(JSON.stringify(albertsonsList, null, 2));
  const res = await fetch(url, {
    headers: { Authorization: `token ${githubToken}` }
  });
  const data = await res.json();
  const sha = data.sha || undefined;
  await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `token ${githubToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: "Update grocery list",
      content,
      sha
    })
  });
}

async function restoreFromGitHub() {
  if (!githubToken) {
    alert("Set your GitHub token first!");
    return;
  }
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    { headers: { Authorization: `token ${githubToken}` } }
  );
  const data = await res.json();
  const decoded = atob(data.content);
  albertsonsList = JSON.parse(decoded);
  renderAlbertsons();
}

// ===== ADMIN BUTTONS =====
document.getElementById("adminBtn").onclick = () => {
  const dropdown = document.getElementById("adminDropdown");
  dropdown.style.display = dropdown.style.display === "block" ? "none" : "block";
};
document.getElementById("exportBtn").onclick = exportListToGitHub;
document.getElementById("restoreBtn").onclick = restoreFromGitHub;
document.getElementById("saveChangesBtn").onclick = async () => {
  alert("Saving current Albertsons list to GitHub...");
  await exportListToGitHub();
  alert("✅ Changes successfully saved to GitHub!");
};
document.getElementById("importBtn").onclick = () => document.getElementById("importListInput").click();
document.getElementById("importListInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  const text = await file.text();
  albertsonsList = JSON.parse(text);
  renderAlbertsons();
  saveToGitHub();
});

document.getElementById("setTokenBtn").onclick = () => {
  const token = prompt("Enter your GitHub Personal Access Token:");
  if (token) {
    githubToken = token;
    localStorage.setItem("githubToken", token);
    document.getElementById("tokenStatus").textContent = "✅ Token saved.";
  }
};
document.getElementById("loadTokenFileBtn").onclick = () =>
  document.getElementById("tokenFileInput").click();
document.getElementById("tokenFileInput").addEventListener("change", async e => {
  const file = e.target.files[0];
  const text = await file.text();
  githubToken = text.trim();
  localStorage.setItem("githubToken", githubToken);
  document.getElementById("tokenStatus").textContent = "✅ Token loaded from file.";
});

// ===== AUTO SAVE TO GITHUB =====
function saveToGitHub() {
  clearTimeout(window.saveTimeout);
  window.saveTimeout = setTimeout(exportListToGitHub, 2000);
}