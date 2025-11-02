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
  console.log(msg); // placeholder, can implement toast notifications
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

  // Sort by aisle, then name, remove duplicates
  const seen = new Set();
  groceryItems = groceryItems.filter(item => {
    const key = (item.name + "|" + item.aisle).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => {
    const aisleCompare = a.aisle.localeCompare(b.aisle, undefined, { numeric: true });
    if (aisleCompare !== 0) return aisleCompare;
    return a.name.localeCompare(b.name);
  });

  groceryItems.forEach((item,index)=>{
    if(filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;

    const li = document.createElement("li"); 
    li.className="item"; 
    li.setAttribute("draggable","true");
    li.dataset.index = index;

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

    const rightDiv = document.createElement("div");
    rightDiv.className = "item-right";

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

    li.appendChild(leftDiv);
    li.appendChild(rightDiv);
    list.appendChild(li);
  });

  // Dropdown toggle behavior
  document.querySelectorAll('.dropdown').forEach(drop => {
    const btn = drop.querySelector('.dropdown-btn');
    const content = drop.querySelector('.dropdown-content');

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.dropdown-content').forEach(dc => {
        if(dc !== content) dc.style.display = 'none';
      });
      content.style.display = (content.style.display === 'block') ? 'none' : 'block';
    });
    content.addEventListener('click', e => e.stopPropagation());
  });
}

// ===== Render Checked / Shopping List =====
function renderChecked() {
  const checkedList = document.getElementById("checkedList");
  checkedList.innerHTML = "";
  const checkedItems = groceryItems.filter(i=>i.checked);

  checkedItems.forEach((item)=>{
    const li = document.createElement("li");
    li.className="item checked";
    li.style.justifyContent="flex-start";

    const cb = document.createElement("input");
    cb.type="checkbox";
    cb.checked = true;

    const span = document.createElement("span");
    span.textContent=`${item.name} (Aisle: ${item.aisle})`;

    li.appendChild(cb);
    li.appendChild(span);
    checkedList.appendChild(li);
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
  exportToGitHub(true);
}

// ===== Page Switching =====
function showMaster(){ document.getElementById("masterPage").classList.remove("hidden"); document.getElementById("checkedPage").classList.add("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showChecked(){ document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.remove("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showAdd(){ document.getElementById("addPage").classList.remove("hidden"); document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.add("hidden"); }

// ===== GitHub Export =====
async function exportToGitHub(showNotify=false){
  if(!githubTokenValid){ console.log("Cannot export: invalid token"); return; }
  const token = localStorage.getItem("githubToken");
  const content = btoa(JSON.stringify(groceryItems,null,2));
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  let sha;
  try{
    const getRes = await fetch(url+"?ref="+branch,{ headers:{Authorization:`token ${token}`} });
    if(getRes.status === 200){ 
      const data = await getRes.json();
      sha = data.sha;
    }
  }catch(e){ console.log("Error fetching existing file", e); }

  try{
    const res = await fetch(url,{
      method:"PUT",
      headers:{Authorization:`token ${token}`, "Content-Type":"application/json"},
      body: JSON.stringify({ message:"Update grocery list", content, branch, sha })
    });
    const data = await res.json();
    if(showNotify) notify("Exported to GitHub ✅");
    console.log("Export result:", data);
  }catch(err){ 
    console.log("Export failed", err);
    if(showNotify) notify("Export failed ❌", false);
  }
}

// ===== GitHub Restore =====
async function restoreFromGitHub(){
  if(!githubTokenValid){ console.log("Cannot restore: invalid token"); return; }
  const token = localStorage.getItem("githubToken");
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
    }else{
      notify("Restore failed ❌", false);
    }
  }catch(err){ 
    console.log("Restore error ❌", err); 
    notify("Restore error ❌", false);
  }
}

// ===== Initialize =====
document.addEventListener("DOMContentLoaded",async ()=>{
  await promptGitHubToken();
  renderMaster(); 
  renderChecked();

  document.getElementById("addItemBtn").addEventListener("click",addItem);

  // ✅ Clear All Checks: clears + exports
  document.getElementById("clearChecksBtn").addEventListener("click",async ()=>{
    groceryItems.forEach(i=>i.checked=false);
    saveData(); 
    renderMaster(); 
    renderChecked();
    await exportToGitHub(true);
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

  // Admin dropdown buttons
  document.getElementById("exportJsonBtn").addEventListener("click",()=>exportToGitHub(true));
  document.getElementById("restoreGitHubBtn").addEventListener("click",restoreFromGitHub);
  document.getElementById("importListBtn").addEventListener("click",()=>document.getElementById("importListInput").click());
  document.getElementById("setTokenBtn").addEventListener("click",promptGitHubToken);
  document.getElementById("loadTokenFileBtn").addEventListener("click",()=>document.getElementById("tokenFileInput").click());

  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-content").forEach(dc=>dc.style.display="none");
  });
});