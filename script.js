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
      githubTokenValid = res.status === 200 || res.status === 404;
      console.log("GitHub token", githubTokenValid ? "valid ✅" : "invalid ❌", res.status);
    } catch(e){
      githubTokenValid = false;
      console.log("Error validating GitHub token ❌", e);
    }
  }
}

// ===== Render Master List with Drag-and-Drop =====
function renderMaster(filter="") {
  const list = document.getElementById("groceryList");
  list.innerHTML = "";

  groceryItems.forEach((item,index)=>{
    if(filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;

    const li = document.createElement("li");
    li.className = "item";
    li.dataset.index = index;
    li.setAttribute("draggable", "true");

    // LEFT: checkbox + name
    const leftDiv = document.createElement("div");
    leftDiv.className = "item-left";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item.checked || false;
    checkbox.addEventListener("change", ()=>{
      item.checked = checkbox.checked;
      renderChecked();
      saveData();
    });

    const span = document.createElement("span");
    span.textContent = `${item.name} (Aisle: ${item.aisle})`;

    leftDiv.appendChild(checkbox);
    leftDiv.appendChild(span);

    // RIGHT: Options + drag handle
    const rightDiv = document.createElement("div");
    rightDiv.className = "item-right";

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
    editBtn.addEventListener("click", ()=>{
      const newName = prompt("Edit item:", item.name);
      if(newName!==null) item.name = newName.trim();
      const newAisle = prompt("Edit aisle:", item.aisle);
      if(newAisle!==null) item.aisle = newAisle.trim();
      renderMaster(document.getElementById("searchInput").value);
      saveData();
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", (e)=>{
      e.stopPropagation();
      if(confirm(`Remove "${item.name}"?`)){
        groceryItems.splice(index,1);
        saveData();
        renderMaster(document.getElementById("searchInput").value);
      }
    });

    dropContent.appendChild(editBtn);
    dropContent.appendChild(removeBtn);
    dropdown.appendChild(dropBtn);
    dropdown.appendChild(dropContent);
    rightDiv.appendChild(dropdown);

    // Drag handle
    const dragHandle = document.createElement("span");
    dragHandle.className = "drag-handle";
    dragHandle.innerHTML='<svg viewBox="0 0 24 24"><path d="M3 12h18v2H3v-2zm0-5h18v2H3V7zm0 10h18v2H3v-2z"/></svg>';
    rightDiv.appendChild(dragHandle);

    li.appendChild(leftDiv);
    li.appendChild(rightDiv);

    // ===== Drag-and-Drop Events =====
    li.addEventListener("dragstart", (e)=>{
      li.classList.add("dragging");
      e.dataTransfer.setData("text/plain", index);
    });
    li.addEventListener("dragover", (e)=>{
      e.preventDefault();
      const draggingEl = document.querySelector(".dragging");
      if(!draggingEl) return;
      const bounding = li.getBoundingClientRect();
      const offset = e.clientY - bounding.top;
      if(offset > bounding.height/2){
        li.parentNode.insertBefore(draggingEl, li.nextSibling);
      } else {
        li.parentNode.insertBefore(draggingEl, li);
      }
    });
    li.addEventListener("dragend", ()=>{
      li.classList.remove("dragging");
      const newItems = [];
      document.querySelectorAll("#groceryList .item").forEach(it=>{
        const idx = parseInt(it.dataset.index);
        newItems.push(groceryItems[idx]);
      });
      groceryItems = newItems;
      saveData();
      renderMaster(document.getElementById("searchInput").value);
    });

    dropBtn.addEventListener("click", (e)=>{
      e.stopPropagation();
      const isVisible = dropContent.style.display==="block";
      document.querySelectorAll(".dropdown-content").forEach(dc=>dc.style.display="none");
      dropContent.style.display = isVisible ? "none":"block";
    });

    list.appendChild(li);
  });
}

// ===== Render Shopping List =====
function renderChecked() {
  const checkedList = document.getElementById("checkedList");
  checkedList.innerHTML = "";

  const checkedItems = groceryItems.filter(i => i.checked);
  checkedItems.forEach(item => {
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

    cb.addEventListener("change", ()=>{
      if(cb.checked) checkedList.appendChild(li); // move to bottom
    });
  });
}

// ===== Add Item =====
function addItem() {
  const name = document.getElementById("itemInput").value.trim();
  const aisle = document.getElementById("aisleInput").value.trim();
  if(!name) return;
  groceryItems.push({name, aisle, checked:false});
  document.getElementById("itemInput").value="";
  document.getElementById("aisleInput").value="";
  saveData();
  renderMaster();
  renderChecked();
  exportToGitHub();
}

// ===== Page Switching =====
function showMaster(){ 
  document.getElementById("masterPage").classList.remove("hidden");
  document.getElementById("checkedPage").classList.add("hidden");
  document.getElementById("addPage").classList.add("hidden");
}
function showChecked(){ 
  document.getElementById("masterPage").classList.add("hidden");
  document.getElementById("checkedPage").classList.remove("hidden");
  document.getElementById("addPage").classList.add("hidden");
}
function showAdd(){ 
  document.getElementById("addPage").classList.remove("hidden");
  document.getElementById("masterPage").classList.add("hidden");
  document.getElementById("checkedPage").classList.add("hidden");
}

// ===== GitHub Export/Restore =====
async function exportToGitHub(){ /* same as previous */ }
async function restoreFromGitHub(){ /* same as previous */ }

// ===== Import File =====
document.getElementById("importListInput").addEventListener("change",(e)=>{ /* same as previous */ });

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", async ()=>{
  await promptGitHubToken();
  renderMaster();
  renderChecked();

  document.getElementById("addItemBtn").addEventListener("click", addItem);
  document.getElementById("clearChecksBtn").addEventListener("click", ()=>{
    groceryItems.forEach(i=>i.checked=false);
    saveData();
    renderMaster();
    renderChecked();
  });

  document.getElementById("showMasterBtn").addEventListener("click", showMaster);
  document.getElementById("showCheckedBtn").addEventListener("click", showChecked);
  document.getElementById("showAddBtn").addEventListener("click", showAdd);

  // Search
  const searchInput = document.getElementById("searchInput");
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  searchInput.addEventListener("input", ()=> {
    renderMaster(searchInput.value);
    clearSearchBtn.style.display = searchInput.value ? 'block':'none';
  });
  clearSearchBtn.addEventListener("click", ()=>{
    searchInput.value='';
    renderMaster();
    clearSearchBtn.style.display='none';
  });

  // Admin dropdown
  document.getElementById("exportJsonBtn").addEventListener("click", exportToGitHub);
  document.getElementById("restoreGitHubBtn").addEventListener("click", restoreFromGitHub);
  document.getElementById("importListBtn").addEventListener("click", ()=>document.getElementById("importListInput").click());
  document.getElementById("setTokenBtn").addEventListener("click", promptGitHubToken);
  document.getElementById("loadTokenFileBtn").addEvent
  
    // Load token from file
  document.getElementById("tokenFileInput").addEventListener("change", (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      localStorage.setItem("githubToken", reader.result.trim());
      promptGitHubToken();
    };
    reader.readAsText(file);
  });

  // Global click to close any open dropdowns
  document.addEventListener("click", ()=>{
    document.querySelectorAll(".dropdown-content").forEach(dc=>{
      dc.style.display = "none";
    });
  });

  // Make admin dropdown button functional
  const adminBtn = document.querySelector(".menu .dropdown-btn");
  const adminDropdown = adminBtn.nextElementSibling;
  adminBtn.addEventListener("click", (e)=>{
    e.stopPropagation(); // Prevent global click closing
    const isVisible = adminDropdown.style.display === "block";
    document.querySelectorAll(".dropdown-content").forEach(dc=>dc.style.display="none");
    adminDropdown.style.display = isVisible ? "none" : "block";
  });
});