// ===== GitHub Config =====
const owner = "509Eagle1";
const repo = "Grocery";
const path = "data/grocery.json";
const branch = "main";

// ===== Local Storage =====
let groceryItems = JSON.parse(localStorage.getItem('groceryItems') || "[]");
let githubTokenValid = false;

// ===== Save / Load =====
function saveData() {
  localStorage.setItem('groceryItems', JSON.stringify(groceryItems));
}

// ===== Notification Helper =====
function notify(msg, success = true){
  console.log(msg); // placeholder for future toast notifications
}

// ===== GitHub Token Prompt & Validation =====
async function promptGitHubToken() {
  let token = localStorage.getItem("githubToken");
  if (!token) {
    token = prompt("⚠️ GitHub token missing! Enter token:") || null;
    if(token) localStorage.setItem("githubToken", token);
  }

  document.getElementById("tokenStatus").textContent = token ? "✅ GitHub Token Set" : "⚠️ No GitHub Token";
  
  if(token){
    try{
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,{
        headers:{Authorization:`token ${token}`}
      });
      githubTokenValid = (res.status===200 || res.status===404);
      console.log("GitHub token is", githubTokenValid ? "valid ✅" : "invalid ❌");
    }catch(e){
      githubTokenValid = false;
      console.log("Error validating GitHub token ❌", e);
    }
  }
}

// ===== Render Master List =====
function renderMaster(filter="") {
  const list = document.getElementById("groceryList");
  list.innerHTML = "";

  groceryItems.forEach((item, index) => {
    if(filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;

    const li = document.createElement("li");
    li.className = "item";
    li.dataset.index = index;

    // LEFT: checkbox + name
    const leftDiv = document.createElement("div");
    leftDiv.className = "item-left";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.checked || false;
    checkbox.addEventListener("change", () => {
      item.checked = checkbox.checked;
      renderChecked();
      saveData();
    });

    const span = document.createElement("span");
    span.textContent = `${item.name} (Aisle: ${item.aisle})`;

    leftDiv.appendChild(checkbox);
    leftDiv.appendChild(span);
    li.appendChild(leftDiv);

    // RIGHT: drag handle
    const rightDiv = document.createElement("div");
    rightDiv.className = "item-right";
    rightDiv.innerHTML = "☰"; // drag handle
    rightDiv.style.cursor = "grab";
    li.appendChild(rightDiv);

    list.appendChild(li);
  });

  // Initialize drag-and-drop
  enableDragAndDrop();
}

// ===== Render Checked / Shopping List =====
function renderChecked() {
  const checkedList = document.getElementById("checkedList");
  checkedList.innerHTML = "";
  const checkedItems = groceryItems.filter(i => i.checked);

  checkedItems.forEach((item) => {
    const li = document.createElement("li");
    li.className = "item";
    li.style.justifyContent = "flex-start";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = false;

    const span = document.createElement("span");
    span.textContent = `${item.name} (Aisle: ${item.aisle})`;

    li.appendChild(cb);
    li.appendChild(span);
    checkedList.appendChild(li);

    cb.addEventListener("change", () => {
      if(cb.checked){
        li.classList.add("checked");
        checkedList.appendChild(li);
      } else {
        li.classList.remove("checked");
      }
    });
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
function showMaster(){ document.getElementById("masterPage").classList.remove("hidden"); document.getElementById("checkedPage").classList.add("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showChecked(){ document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.remove("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showAdd(){ document.getElementById("addPage").classList.remove("hidden"); document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.add("hidden"); }

// ===== Clear All Checks =====
function clearAllChecks() {
  groceryItems.forEach(i => i.checked = false);
  saveData();
  renderMaster();
  renderChecked();
  exportToGitHub(true);
}

// ===== Drag-and-Drop Functionality =====
function enableDragAndDrop() {
  const listItems = document.querySelectorAll("#groceryList .item");
  let dragSrcEl = null;

  listItems.forEach(item => {
    const handle = item.querySelector(".item-right");
    handle.addEventListener("mousedown", (e) => {
      dragSrcEl = item;
      item.classList.add("dragging");
    });

    handle.addEventListener("touchstart", (e) => {
      dragSrcEl = item;
      item.classList.add("dragging");
    });

    item.addEventListener("dragstart", (e) => {
      dragSrcEl = item;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/html', item.outerHTML);
    });

    item.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      return false;
    });

    item.addEventListener("drop", (e) => {
      e.stopPropagation();
      if(dragSrcEl !== item){
        const srcIndex = parseInt(dragSrcEl.dataset.index);
        const targetIndex = parseInt(item.dataset.index);

        // Swap items
        const temp = groceryItems[srcIndex];
        groceryItems.splice(srcIndex, 1);
        groceryItems.splice(targetIndex, 0, temp);

        saveData();
        renderMaster();
      }
      return false;
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("dragging");
    });
  });
}

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", async () => {
  await promptGitHubToken();
  renderMaster();
  renderChecked();

  document.getElementById("addItemBtn").addEventListener("click", addItem);
  document.getElementById("clearChecksBtn").addEventListener("click", clearAllChecks);
  document.getElementById("showMasterBtn").addEventListener("click", showMaster);
  document.getElementById("showCheckedBtn").addEventListener("click", showChecked);
  document.getElementById("showAddBtn").addEventListener("click", showAdd);

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

  // Admin buttons
  document.getElementById("exportJsonBtn").addEventListener("click", () => exportToGitHub(true));
  document.getElementById("restoreGitHubBtn").addEventListener("click", restoreFromGitHub);
  document.getElementById("importListBtn").addEventListener("click", () => document.getElementById("importListInput").click());
  document.getElementById("setTokenBtn").addEventListener("click", promptGitHubToken);
  document.getElementById("loadTokenFileBtn").addEventListener("click", () => document.getElementById("tokenFileInput").click());

  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-content").forEach(dc => dc.style.display = "none");
  });

  document.querySelector(".dropdown-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    const content = document.querySelector(".dropdown-content");
    content.style.display = content.style.display === "block" ? "none" : "block";
  });
});