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
      if(res.status===200 || res.status===404){
        githubTokenValid = true;
        console.log("GitHub token is valid ✅");
      }else{
        githubTokenValid = false;
        console.log("GitHub token invalid ❌", res.status);
      }
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

  groceryItems.forEach((item,index)=>{
    if(filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;

    const li = document.createElement("li"); 
    li.className="item"; 
    li.setAttribute("draggable","true");
    li.dataset.index = index;

    // LEFT: checkbox + name
    const leftDiv = document.createElement("div");
    leftDiv.className = "item-left";

    const checkbox = document.createElement("input"); 
    checkbox.type="checkbox"; 
    checkbox.checked = item.checked || false;
    checkbox.addEventListener("change",()=>{
      item.checked = checkbox.checked; 
      renderChecked();
      saveData();
    });

    const span = document.createElement("span"); 
    span.textContent=`${item.name} (Aisle: ${item.aisle})`;

    leftDiv.appendChild(checkbox); 
    leftDiv.appendChild(span);

    // RIGHT: Options button + drag handle
    const rightDiv = document.createElement("div");
    rightDiv.className = "item-right";

    // Dropdown Options button
    const dropdown = document.createElement("div"); 
    dropdown.className="dropdown";
    const dropBtn = document.createElement("button"); 
    dropBtn.className="dropdown-btn"; 
    dropBtn.textContent="Options ⏷";

    const dropContent = document.createElement("div"); 
    dropContent.className="dropdown-content";

    const editBtn = document.createElement("button"); 
    editBtn.className="edit"; 
    editBtn.textContent="Edit";
    editBtn.addEventListener("click",()=>{
      const newName = prompt("Edit item:",item.name); 
      if(newName!==null)item.name=newName.trim();
      const newAisle = prompt("Edit aisle:",item.aisle); 
      if(newAisle!==null)item.aisle=newAisle.trim();
      renderMaster(document.getElementById("searchInput").value);
      saveData();
    });

    const removeBtn = document.createElement("button"); 
    removeBtn.className="remove"; 
    removeBtn.textContent="Remove";
    removeBtn.addEventListener("click",(e)=>{
      e.stopPropagation();
      if(confirm(`Are you sure you want to remove "${item.name}"?`)){
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
    dragHandle.className="drag-handle";
    dragHandle.innerHTML='<svg viewBox="0 0 24 24"><path d="M3 12h18v2H3v-2zm0-5h18v2H3V7zm0 10h18v2H3v-2z"/></svg>';
    rightDiv.appendChild(dragHandle);

    // Append left and right divs to li
    li.appendChild(leftDiv);
    li.appendChild(rightDiv);

    // Drag events
    li.addEventListener("dragstart",(e)=>{
      li.classList.add("dragging");
      e.dataTransfer.setData("text/plain", index);
    });
    li.addEventListener("dragover",(e)=>{
      e.preventDefault();
      const draggingEl = document.querySelector(".dragging");
      if(!draggingEl) return;
      const bounding = li.getBoundingClientRect();
      const offset = e.clientY - bounding.top;
      if(offset > bounding.height/2){
        li.parentNode.insertBefore(draggingEl, li.nextSibling);
      }else{
        li.parentNode.insertBefore(draggingEl, li);
      }
    });
    li.addEventListener("dragend",()=>{
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

    dropBtn.addEventListener("click",(e)=>{
      e.stopPropagation();
      const isVisible = dropContent.style.display==="block";
      document.querySelectorAll(".dropdown-content").forEach(dc=>dc.style.display="none");
      dropContent.style.display = isVisible ? "none" : "block";
    });

    list.appendChild(li);
  });
}

// ===== Render Checked / Shopping List =====
function renderChecked() {
  const checkedList = document.getElementById("checkedList");
  checkedList.innerHTML = "";
  const checkedItems = groceryItems.filter(i=>i.checked);
  checkedItems.forEach((item)=>{
    const li = document.createElement("li");
    li.className="item";
    li.style.justifyContent="flex-start";

    const cb = document.createElement("input");
    cb.type="checkbox";
    cb.checked = false;

    const span = document.createElement("span");
    span.textContent=`${item.name} (Aisle: ${item.aisle})`;

    li.appendChild(cb);
    li.appendChild(span);
    checkedList.appendChild(li);

    cb.addEventListener("change", ()=>{
      if(cb.checked){
        li.classList.add("checked");
        checkedList.appendChild(li);
      }else{
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
  groceryItems.push({name,aisle,checked:false});
  document.getElementById("itemInput").value = ""; 
  document.getElementById("aisleInput").value="";
  saveData(); 
  renderMaster();
  exportToGitHub(); // Auto-export
}

// ===== Page Switching =====
function showMaster(){ document.getElementById("masterPage").classList.remove("hidden"); document.getElementById("checkedPage").classList.add("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showChecked(){ document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.remove("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showAdd(){ document.getElementById("addPage").classList.remove("hidden"); document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.add("hidden"); }

// ===== GitHub Functions =====
async function exportToGitHub(){
  if(!githubTokenValid){ console.log("Cannot export: invalid token"); return; }
  const token = localStorage.getItem("githubToken");
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
  }catch(e){ console.log("Error fetching existing file",e); }

  try{
    const res = await fetch(url,{
      method:"PUT",
      headers:{Authorization:`token ${token}`, "Content-Type":"application/json"},
      body: JSON.stringify({ message:"Update grocery list", content, branch, sha })
    });
    const data = await res.json();
    console.log("Export result:", data);
  }catch(err){ console.log("Export failed", err); }
}

async function restoreFromGitHub(){
  if(!githubTokenValid){ console.log("Cannot restore: invalid token"); return; }
  const token = localStorage.getItem("githubToken");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  try{
    const res = await fetch(url,{
      headers:{Authorization:`token ${token}`}
    });
    const data = await res.json();
    if(data && data.content){
      groceryItems = JSON.parse(atob(data.content));
      saveData();
      renderMaster();
      renderChecked();
      console.log("Restore success ✅");
    }else{
      console.log("Restore failed ❌", data);
    }
  }catch(err){ console.log("Restore error ❌", err); }
}

// ===== Import Local File =====
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
    }catch(err){ console.log("Import failed",err); }
  };
  reader.readAsText(file);
});

// ===== Initialize =====
document.addEventListener("DOMContentLoaded",async ()=>{
  await promptGitHubToken();
  renderMaster(); 
  renderChecked();

  document.getElementById("addItemBtn").addEventListener("click",addItem);
  document.getElementById("clearChecksBtn").addEventListener("click",()=>{
    groceryItems.forEach(i=>i.checked=false);
    saveData(); 
    renderMaster(); 
    renderChecked();
  });
  document.getElementById("showMasterBtn").addEventListener("click",showMaster);
  document.getElementById("showCheckedBtn").addEventListener("click",showChecked);
  document.getElementById("showAddBtn").addEventListener("click",showAdd);

  const searchInput=document.getElementById("searchInput");
  const clearSearchBtn=document.getElementById("clearSearchBtn");
  searchInput.addEventListener("input",()=>{ 
    renderMaster(searchInput.value); 
    clearSearchBtn.style.display = searchInput.value ? 'block' : 'none'; 
  });
  clearSearchBtn.addEventListener("click",()=>{ 
    searchInput.value=''; 
    renderMaster(); 
    clearSearchBtn.style.display='none'; 
  });

  document.addEventListener("click",()=>{ 
    document.querySelectorAll(".dropdown-content").forEach(dc=>dc.style.display="none"); 
  });

  // Admin dropdown
  document.getElementById("exportJsonBtn").addEventListener("click",exportToGitHub);
  document.getElementById("restoreGitHubBtn").addEventListener("click",restoreFromGitHub);
  document.getElementById("importListBtn").addEventListener("click",()=>document.getElementById("importListInput").click());
  document.getElementById("setTokenBtn").addEventListener("click",promptGitHubToken);
  document.getElementById("loadTokenFileBtn").addEventListener("click",()=>document.getElementById("tokenFileInput").click());

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
});