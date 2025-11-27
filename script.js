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

// ===== GitHub Token Prompt & Validation =====
async function promptGitHubToken() {
  let token = localStorage.getItem("githubToken");
  if (!token) {
    token = prompt("⚠️ GitHub token missing! Enter token:") || null;
    if(token) localStorage.setItem("githubToken", token);
  }

  document.getElementById("tokenStatus").textContent =
    token ? "✅ GitHub Token Set" : "⚠️ No GitHub Token";

  if(token){
    try{
      const res = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
        { headers:{Authorization:`token ${token}`} }
      );
      githubTokenValid = (res.status===200 || res.status===404);
    }catch(e){
      githubTokenValid = false;
    }
  }
}

// ===== Render Master List (with inline editing) =====
function renderMaster(filter="") {
  const list = document.getElementById("groceryList");
  list.innerHTML = "";

  let sortedItems = [...groceryItems]
    .filter((item,index,self)=>
      self.findIndex(i=>i.name===item.name && i.aisle===item.aisle)===index
    )
    .sort((a,b)=>{
      if(sortMode==="name"){
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      } else {
        let aA = parseInt(a.aisle) || 0;
        let bA = parseInt(b.aisle) || 0;
        if(aA === bA){
          return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        }
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
    checkbox.addEventListener("change",()=>{
      item.checked = checkbox.checked;
      saveData();
      renderChecked();
    });

    const nameSpan = document.createElement("span");
    nameSpan.textContent = `${item.name} (Aisle: ${item.aisle})`;

    left.appendChild(checkbox);
    left.appendChild(nameSpan);
    li.appendChild(left);

    // RIGHT SIDE (Edit/Save/Cancel)
    const right = document.createElement("div");
    right.className = "item-right";

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.style.padding = "4px 6px";
    editBtn.style.fontSize = "12px";

    editBtn.addEventListener("click", () => enterEditMode(li, item, nameSpan));
    right.appendChild(editBtn);

    li.appendChild(right);
    list.appendChild(li);
  });
}

// ===== Inline Edit Mode =====
function enterEditMode(li, item, nameSpan) {

  const left = li.querySelector(".item-left");
  const right = li.querySelector(".item-right");

  const originalName = item.name;
  const originalAisle = item.aisle;

  left.innerHTML = "";

  // Checkbox
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = item.checked;
  checkbox.disabled = true;
  left.appendChild(checkbox);

  // Name input
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.value = originalName;
  nameInput.style.width = "140px";
  left.appendChild(nameInput);

  // Aisle input
  const aisleInput = document.createElement("input");
  aisleInput.type = "text";
  aisleInput.value = originalAisle;
  aisleInput.style.width = "60px";
  left.appendChild(aisleInput);

  // Right side becomes Save/Cancel
  right.innerHTML = "";

  const saveBtn = document.createElement("button");
  saveBtn.textContent = "Save";
  saveBtn.style.padding = "4px 6px";
  saveBtn.style.fontSize = "12px";

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Cancel";
  cancelBtn.style.padding = "4px 6px";
  cancelBtn.style.fontSize = "12px";

  right.appendChild(saveBtn);
  right.appendChild(cancelBtn);

  // SAVE
  saveBtn.addEventListener("click", () => {
    item.name = nameInput.value.trim() || originalName;
    item.aisle = aisleInput.value.trim() || originalAisle;

    saveData();
    renderMaster();
  });

  // CANCEL restores original
  cancelBtn.addEventListener("click", () => {
    renderMaster();
  });
}

// ===== Render Checked List =====
function renderChecked() {
  const checkedList = document.getElementById("checkedList");
  checkedList.innerHTML = "";
  const checkedItems = groceryItems.filter(i=>i.checked);

  checkedItems.forEach(item=>{
    const li = document.createElement("li");
    li.className = "item";

    const cb = document.createElement("input");
    cb.type = "checkbox";

    const span = document.createElement("span");
    span.textContent = `${item.name} (Aisle: ${item.aisle})`;

    li.appendChild(cb);
    li.appendChild(span);
    checkedList.appendChild(li);

    cb.addEventListener("change", ()=>{
      if(cb.checked){
        li.classList.add("checked");
        checkedList.appendChild(li);
      } else {
        li.classList.remove("checked");
      }
    });
  });
}

// Add item
function addItem() {
  const name = document.getElementById("itemInput").value.trim();
  const aisle = document.getElementById("aisleInput").value.trim();
  if(!name) return;

  groceryItems.push({name, aisle, checked:false});
  saveData();

  document.getElementById("itemInput").value="";
  document.getElementById("aisleInput").value="";

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
  exportToGitHub(true);
}

// GitHub Export
async function exportToGitHub(showNotify=false){
  const token = localStorage.getItem("githubToken");
  if(!token) return;

  const content = btoa(JSON.stringify(groceryItems,null,2));
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  let sha;

  try{
    const getRes = await fetch(url+"?ref="+branch,{
      headers:{Authorization:`token ${token}`}
    });
    if(getRes.status === 200){
      const data = await getRes.json();
      sha = data.sha;
    }
  }catch(e){}

  try{
    await fetch(url,{
      method:"PUT",
      headers:{Authorization:`token ${token}`, "Content-Type":"application/json"},
      body: JSON.stringify({ message:"Update grocery list", content, branch, sha })
    });
    if(showNotify) notify("Exported to GitHub ✅");
  }catch(err){
    if(showNotify) notify("Export failed ❌", false);
  }
}

// GitHub Restore
async function restoreFromGitHub(){
  const token = localStorage.getItem("githubToken");
  if(!token) return;

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

  try{
    const res = await fetch(url,{ headers:{Authorization:`token ${token}`} });
    const data = await res.json();

    if(data && data.content){
      groceryItems = JSON.parse(atob(data.content));
      saveData();
      renderMaster();
      renderChecked();
      notify("Restore success ✅");
    }
  }catch(err){
    notify("Restore error ❌", false);
  }
}

// Import List
document.getElementById("importListInput").addEventListener("change",(e)=>{
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = ()=>{
    try{
      groceryItems = JSON.parse(reader.result);
      saveData();
      renderMaster();
      renderChecked();
      notify("Import success");
    } catch {
      notify("Import failed ❌", false);
    }
  };
  reader.readAsText(file);
});

// Load token from file
document.getElementById("tokenFileInput").addEventListener("change",(e)=>{
  const file = e.target.files[0];
  if(!file) return;

  const reader = new FileReader();
  reader.onload = ()=>{
    localStorage.setItem("githubToken", reader.result.trim());
    promptGitHubToken();
  };
  reader.readAsText(file);
});

// ===== Initialize =====
document.addEventListener("DOMContentLoaded",async ()=>{
  await promptGitHubToken();
  renderMaster();
  renderChecked();

  // Buttons
  document.getElementById("addItemBtn").addEventListener("click",addItem);
  document.getElementById("clearChecksBtn").addEventListener("click",clearAllChecks);
  document.getElementById("showMasterBtn").addEventListener("click",showMaster);
  document.getElementById("showCheckedBtn").addEventListener("click",showChecked);
  document.getElementById("showAddBtn").addEventListener("click",showAdd);

  // Sorting buttons
  document.getElementById("sortNameBtn").addEventListener("click",()=>{
    sortMode="name";
    renderMaster(document.getElementById("searchInput").value);
  });

  document.getElementById("sortAisleBtn").addEventListener("click",()=>{
    sortMode="aisle";
    renderMaster(document.getElementById("searchInput").value);
  });

  // Search
  const searchInput = document.getElementById("searchInput")
