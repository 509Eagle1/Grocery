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
  console.log(msg);
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

  // Remove duplicates and sort by aisle then name
  let uniqueItems = {};
  groceryItems.forEach(i=>{
    uniqueItems[i.aisle+'|'+i.name] = i;
  });
  let sortedItems = Object.values(uniqueItems).sort((a,b)=>{
    if(a.aisle!==b.aisle) return a.aisle.localeCompare(b.aisle);
    return a.name.localeCompare(b.name);
  });
  groceryItems = sortedItems;

  groceryItems.forEach((item,index)=>{
    if(filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;

    const li = document.createElement("li"); 
    li.className="item"; 
    li.dataset.index = index;

    // LEFT: checkbox + name
    const leftDiv = document.createElement("div");
    leftDiv.className = "item-left";

    const checkbox = document.createElement("input"); 
    checkbox.type="checkbox"; 
    checkbox.checked = item.checked || false;
    checkbox.addEventListener("change",()=>{
      item.checked = checkbox.checked; 
      if(item.checked) renderChecked();
      saveData();
    });

    const span = document.createElement("span"); 
    span.textContent=`${item.name} (Aisle: ${item.aisle})`;

    leftDiv.appendChild(checkbox); 
    leftDiv.appendChild(span);

    li.appendChild(leftDiv);
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
    const getRes = await fetch(url+"?ref="+branch,{
      headers:{Authorization:`token ${token}`}
    });
    if(getRes.status === 200){ 
      const data = await getRes.json();
      sha = data.sha;
    }
  }catch(e){ console.log("Error fetching existing file", e); }

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
    } else notify("Restore failed ❌", false);
  }catch(err){ notify("Restore error ❌", false); }
}

// ===== Initialize =====
document.addEventListener("DOMContentLoaded",async ()=>{
  await promptGitHubToken();
  renderMaster();
  renderChecked();

  document.getElementById("addItemBtn").addEventListener("click", addItem);
  document.getElementById("clearChecksBtn").addEventListener("click", ()=>{
    groceryItems.forEach(i=>i.checked=false);
    saveData();
    renderMaster();
    renderChecked();
    exportToGitHub(true);
  });
  document.getElementById("showMasterBtn").addEventListener("click",showMaster);
  document.getElementById("showCheckedBtn").addEventListener("click",showChecked);
  document.getElementById("showAddBtn").addEventListener("click",showAdd);

  const searchInput=document.getElementById("searchInput");
  const clearSearchBtn=document.getElementById("clearSearchBtn");
  searchInput.addEventListener("input", ()=>{ renderMaster(searchInput.value); clearSearchBtn.style.display = searchInput.value ? 'block' : 'none'; });
  clearSearchBtn.addEventListener("click", ()=>{ searchInput.value=''; renderMaster(); clearSearchBtn.style.display='none'; });

  // Admin dropdown buttons
  document.getElementById("exportJsonBtn").addEventListener("click", ()=>exportToGitHub(true));
  document.getElementById("restoreGitHubBtn").addEventListener("click", restoreFromGitHub);
  document.getElementById("importListBtn").addEventListener("click", ()=>document.getElementById("importListInput").click());
  document.getElementById("setTokenBtn").addEventListener("click", promptGitHubToken);
  document.getElementById("loadTokenFileBtn").addEventListener("click", ()=>document.getElementById("tokenFileInput").click());

  // Close dropdowns
  document.addEventListener("click", ()=>document.querySelectorAll(".dropdown-content").forEach(dc=>dc.style.display="none"));
});