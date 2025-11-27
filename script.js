// ===== GitHub Config =====
const owner = "509Eagle1";
const repo = "Grocery";
const path = "data/grocery.json";
const branch = "main";

// ===== Local Storage =====
let groceryItems = JSON.parse(localStorage.getItem('groceryItems') || "[]");
let githubTokenValid = false;

// Sorting mode
let sortMode = "aisle";

// Save
function saveData() {
  localStorage.setItem('groceryItems', JSON.stringify(groceryItems));
}

// Notification
function notify(msg, success = true){
  console.log(msg);
}

// ===== GitHub Token Prompt =====
async function promptGitHubToken() {
  let token = localStorage.getItem("githubToken");
  if (!token) {
    token = prompt("⚠️ GitHub token missing! Enter token:") || null;
    if (token) localStorage.setItem("githubToken", token);
  }

  document.getElementById("tokenStatus").textContent =
    token ? "✅ GitHub Token Set" : "⚠️ No GitHub Token";

  if (token) {
    try {
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        { headers: { Authorization: `token ${token}` } }
      );
      githubTokenValid = (res.status === 200 || res.status === 404);
    } catch {
      githubTokenValid = false;
    }
  }
}

// ===== Helper: Row Click Toggle =====
function enableRowToggle(li, checkbox, item) {
  li.addEventListener("click", (event) => {

    // If clicking inside input (edit mode), ignore
    if (event.target.tagName === "INPUT" || event.target.tagName === "BUTTON") return;

    // Toggle checkbox
    checkbox.checked = !checkbox.checked;
    item.checked = checkbox.checked;

    saveData();
    renderChecked();
    renderMaster(document.getElementById("searchInput").value);
  });
}

// ===== Render Master List =====
function renderMaster(filter="") {
  const list = document.getElementById("groceryList");
  list.innerHTML = "";

  let sortedItems = [...groceryItems]
    .filter((item,index,self)=>
      self.findIndex(i=>i.name===item.name && i.aisle===item.aisle)===index)
    .sort((a,b)=>{
      if(sortMode==="name"){
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      } else {
        let aA = parseInt(a.aisle) || 0;
        let bA = parseInt(b.aisle) || 0;
        if (aA === bA)
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        return aA - bA;
      }
    });

  sortedItems.forEach((item, index)=>{
    if(filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;

    const li = document.createElement("li");
    li.className = "item";

    const left = document.createElement("div");
    left.className = "item-left";

    const checkbox = document.createElement("input");
    checkbox.type="checkbox";
    checkbox.checked = item.checked || false;

    checkbox.addEventListener("click",(e)=>{
      e.stopPropagation();
      item.checked = checkbox.checked;
      saveData();
      renderChecked();
    });

    const span = document.createElement("span");
    span.textContent = `${item.name} (Aisle: ${item.aisle})`;

    left.appendChild(checkbox);
    left.appendChild(span);
    li.appendChild(left);

    const right = document.createElement("div");
    right.className = "item-right";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.style.padding = "4px 6px";
    editBtn.style.fontSize = "12px";

    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      enterEditMode(li, item);
    });

    right.appendChild(editBtn);
    li.appendChild(right);
    list.appendChild(li);

    // ENABLE row click toggle
    enableRowToggle(li, checkbox, item);
  });
}

// ===== Enter Edit Mode =====
function enterEditMode(li, item) {

  const left = li.querySelector(".item-left");
  const right = li.querySelector(".item-right");

  const origName = item.name;
  const origAisle = item.aisle;

  left.innerHTML = "";

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = item.checked;
  checkbox.disabled = true;
  left.appendChild(checkbox);

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = origName;
  nameInput.style.width = "140px";

  const aisleInput = document.createElement("input");
  aisleInput.type = "text";
  aisleInput.value = origAisle;
  aisleInput.style.width = "60px";

  left.appendChild(nameInput);
  left.appendChild(aisleInput);

  right.innerHTML = "";
  right.style.display = "flex";
  right.style.flexDirection = "column";
  right.style.gap = "4px";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.style.fontSize = "12px";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.fontSize = "12px";

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.style.fontSize = "12px";
  deleteBtn.style.background = "#dc3545";
  deleteBtn.style.color = "white";

  right.appendChild(saveBtn);
  right.appendChild(cancelBtn);
  right.appendChild(deleteBtn);

  // SAVE
  saveBtn.addEventListener("click", () => {
    item.name = nameInput.value.trim() || origName;
    item.aisle = aisleInput.value.trim() || origAisle;
    saveData();
    renderMaster();
  });

  // CANCEL
  cancelBtn.addEventListener("click", () => {
    renderMaster();
  });

  // DELETE (confirmation)
  deleteBtn.addEventListener("click", () => {
    if (!confirm(`Delete "${item.name}"?`)) return;
    groceryItems = groceryItems.filter(i => i !== item);
    saveData();
    renderMaster();
    renderChecked();
  });
}

// ===== Shopping List =====
function renderChecked() {
  const list = document.getElementById("checkedList");
  list.innerHTML = "";

  groceryItems.filter(i=>i.checked).forEach(item=>{
    const li = document.createElement("li");
    li.className = "item";

    const cb = document.createElement("input");
    cb.type = "checkbox";

    const span = document.createElement("span");
    span.textContent = `${item.name} (Aisle: ${item.aisle})`;

    li.appendChild(cb);
    li.appendChild(span);
    list.appendChild(li);

    // Checkbox click
    cb.addEventListener("click",(e)=>{
      e.stopPropagation();
      cb.checked = false;
      li.classList.add("checked");
      list.appendChild(li);
    });

    // ENABLE row click toggle
    li.addEventListener("click",(e)=>{
      if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
      cb.checked = !cb.checked;
      if(cb.checked){
        li.classList.add("checked");
        list.appendChild(li);
      } else {
        li.classList.remove("checked");
      }
    });
  });
}

// Add item
function addItem() {
  const name = itemInput.value.trim();
  const aisle = aisleInput.value.trim();
  if(!name) return;

  groceryItems.push({name, aisle, checked:false});
  saveData();

  itemInput.value="";
  aisleInput.value="";

  renderMaster();
}

// Page switching
function showMaster(){
  masterPage.classList.remove("hidden");
  checkedPage.classList.add("hidden");
  addPage.classList.add("hidden");
}
function showChecked(){
  masterPage.classList.add("hidden");
  checkedPage.classList.remove("hidden");
  addPage.classList.add("hidden");
}
function showAdd(){
  masterPage.classList.add("hidden");
  checkedPage.classList.add("hidden");
  addPage.classList.remove("hidden");
}

// Clear checks
function clearAllChecks() {
  groceryItems.forEach(i=>i.checked=false);
  saveData();
  renderMaster();
  renderChecked();
}

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", async ()=>{
  await promptGitHubToken();
  renderMaster();
  renderChecked();

  addItemBtn.addEventListener("click", addItem);
  clearChecksBtn.addEventListener("click", clearAllChecks);

  showMasterBtn.addEventListener("click", showMaster);
  showCheckedBtn.addEventListener("click", showChecked);
  showAddBtn.addEventListener("click", showAdd);

  sortNameBtn.addEventListener("click", ()=>{
    sortMode = "name";
    renderMaster(searchInput.value);
  });

  sortAisleBtn.addEventListener("click", ()=>{
    sortMode = "aisle";
    renderMaster(searchInput.value);
  });

  searchInput.addEventListener("input", ()=>{
    renderMaster(searchInput.value);
    clearSearchBtn.style.display = searchInput.value ? "block" : "none";
  });

  clearSearchBtn.addEventListener("click", ()=>{
    searchInput.value="";
    clearSearchBtn.style.display="none";
    renderMaster();
  });

  exportJsonBtn.addEventListener("click", ()=>exportToGitHub(true));
  restoreGitHubBtn.addEventListener("click", restoreFromGitHub);
  importListBtn.addEventListener("click", ()=>importListInput.click());
  setTokenBtn.addEventListener("click", promptGitHubToken);
  loadTokenFileBtn.addEventListener("click", ()=>tokenFileInput.click());

  document.addEventListener("click", ()=>{
    document.querySelectorAll(".dropdown-content").forEach(dc=>dc.style.display="none");
  });

  document.querySelector(".dropdown-btn").addEventListener("click", (e)=>{
    e.stopPropagation();
    const content = document.querySelector(".dropdown-content");
    content.style.display = content.style.display==="block" ? "none" : "block";
  });
});
