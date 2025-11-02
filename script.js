// ===== GitHub Config =====
const owner = "509Eagle1";
const repo = "Grocery";
const path = "data/grocery.json";
const branch = "main";

// ===== Local Storage =====
let groceryItems = JSON.parse(localStorage.getItem('groceryItems') || "[]");
let githubTokenValid = false;

// ===== Save / Load =====
function saveData() { localStorage.setItem('groceryItems', JSON.stringify(groceryItems)); }
function notify(msg, success=true){ console.log(msg); }

// ===== GitHub Token Prompt =====
async function promptGitHubToken() {
  let token = localStorage.getItem("githubToken");
  if(!token){
    token = prompt("⚠️ GitHub token missing! Enter token:") || null;
    if(token) localStorage.setItem("githubToken", token);
  }
  document.getElementById("tokenStatus").textContent = token ? "✅ GitHub Token Set" : "⚠️ No GitHub Token";
  if(token){
    try{
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,{ headers:{Authorization:`token ${token}`} });
      githubTokenValid = (res.status===200 || res.status===404);
    }catch(e){ githubTokenValid=false; }
  }
}

// ===== Render Master =====
function renderMaster(filter=""){
  const list = document.getElementById("groceryList");
  list.innerHTML="";

  let sortedItems = [...groceryItems]
    .filter((item,index,self)=>self.findIndex(i=>i.name===item.name && i.aisle===item.aisle)===index)
    .sort((a,b)=>a.aisle.toLowerCase()===b.aisle.toLowerCase() ? a.name.toLowerCase().localeCompare(b.name.toLowerCase()) : a.aisle.toLowerCase().localeCompare(b.aisle.toLowerCase()));

  sortedItems.forEach((item,index)=>{
    if(filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;

    const li = document.createElement("li");
    li.className="item";
    li.dataset.index=index;

    // LEFT: checkbox + name
    const leftDiv = document.createElement("div");
    leftDiv.className="item-left";

    const checkbox = document.createElement("input");
    checkbox.type="checkbox"; checkbox.checked=item.checked||false;
    checkbox.addEventListener("change",()=>{ item.checked=checkbox.checked; renderChecked(); saveData(); });

    const span = document.createElement("span"); span.textContent=`${item.name} (Aisle: ${item.aisle})`;
    leftDiv.appendChild(checkbox); leftDiv.appendChild(span);

    // RIGHT: drag handle
    const handle = document.createElement("span");
    handle.className="drag-handle"; handle.textContent="≡";

    li.appendChild(leftDiv); li.appendChild(handle);
    list.appendChild(li);
  });

  enableDragDrop();
}

// ===== Drag & Drop =====
function enableDragDrop(){
  const list=document.getElementById("groceryList");
  let dragged=null;

  list.querySelectorAll(".item").forEach(item=>{
    item.addEventListener("dragstart",(e)=>{
      dragged=item;
      e.dataTransfer.effectAllowed="move";
      e.dataTransfer.setData("text/plain","");
    });
    item.addEventListener("dragover",(e)=>{
      e.preventDefault();
      e.dataTransfer.dropEffect="move";
    });
    item.addEventListener("drop",(e)=>{
      e.preventDefault();
      if(dragged && dragged!==item){
        const draggedIndex=Array.from(list.children).indexOf(dragged);
        const dropIndex=Array.from(list.children).indexOf(item);
        if(draggedIndex<dropIndex){
          list.insertBefore(dragged,item.nextSibling);
        }else{
          list.insertBefore(dragged,item);
        }
        // reorder groceryItems to match visual
        const newOrder = Array.from(list.children).map(li=>groceryItems[li.dataset.index]);
        groceryItems=newOrder;
        saveData();
        renderMaster();
      }
    });
  });
}

// ===== Render Checked =====
function renderChecked(){
  const checkedList=document.getElementById("checkedList");
  checkedList.innerHTML="";
  const checkedItems=groceryItems.filter(i=>i.checked);

  checkedItems.forEach((item)=>{
    const li=document.createElement("li");
    li.className="item";

    const cb=document.createElement("input");
    cb.type="checkbox"; cb.checked=false; // always unchecked on copy

    const span=document.createElement("span");
    span.textContent=`${item.name} (Aisle: ${item.aisle})`;

    li.appendChild(cb); li.appendChild(span);
    checkedList.appendChild(li);

    cb.addEventListener("change",()=>{
      if(cb.checked){ li.classList.add("checked"); checkedList.appendChild(li); }
      else li.classList.remove("checked");
    });
  });
}

// ===== Add Item =====
function addItem(){
  const name=document.getElementById("itemInput").value.trim();
  const aisle=document.getElementById("aisleInput").value.trim();
  if(!name) return;
  groceryItems.push({name,aisle,checked:false});
  document.getElementById("itemInput").value="";
  document.getElementById("aisleInput").value="";
  saveData();
  renderMaster();
}

// ===== Page Switching =====
function showMaster(){ document.getElementById("masterPage").classList.remove("hidden"); document.getElementById("checkedPage").classList.add("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showChecked(){ document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.remove("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showAdd(){ document.getElementById("addPage").classList.remove("hidden"); document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.add("hidden"); }

// ===== Clear All Checks =====
function clearAllChecks(){
  groceryItems.forEach(i=>i.checked=false);
  saveData();
  renderMaster();
  renderChecked();
  exportToGitHub(true);
}

// ===== GitHub Export/Restore =====
async function exportToGitHub(showNotify=false){
  const token=localStorage.getItem("githubToken");
  if(!token) return;
  const content=btoa(JSON.stringify(groceryItems,null,2));
  const url=`https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  let sha;
  try{
    const getRes=await fetch(url+"?ref="+branch,{headers:{Authorization:`token ${token}`}});
    if(getRes.status===200){ const data=await getRes.json(); sha=data.sha; }
  }catch(e){ console.log(e); }
  try{
    await fetch(url,{method:"PUT",headers:{Authorization:`token ${token}`, "Content-Type":"application/json"},body: JSON.stringify({message:"Update grocery list", content, branch, sha})});
    if(showNotify) notify("Exported to GitHub ✅");
  }catch(e){ if(showNotify) notify("Export failed ❌", false); }
}

async function restoreFromGitHub(){
  const token=localStorage.getItem("githubToken");
  if(!token) return;
  const url=`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  try{
    const res=await fetch(url,{headers:{Authorization:`token ${token}`}});
    const data=await res.json();
    if(data && data.content){
      groceryItems=JSON.parse(atob(data.content));
      saveData();
      renderMaster();
      renderChecked();
      notify("Restore success ✅");
    }else notify("Restore failed ❌", false);
  }catch(e){ notify("Restore error ❌", false); }
}

// ===== Import / Token Files =====
document.getElementById("importListInput").addEventListener("change",(e)=>{
  const file=e.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{ groceryItems=JSON.parse(reader.result); saveData(); renderMaster(); renderChecked(); notify("Import success ✅"); }
    catch(err){ notify("Import failed ❌", false); }
  };
  reader.readAsText(file);
});

document.getElementById("tokenFileInput").addEventListener("change",(e)=>{
  const file=e.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=()=>{ localStorage.setItem("githubToken", reader.result.trim()); promptGitHubToken(); };
  reader.readAsText(file);
});

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", async()=>{
  await promptGitHubToken();
  renderMaster();
  renderChecked();

  // Buttons
  document.getElementById("addItemBtn").addEventListener("click", addItem);
  document.getElementById("clearChecksBtn").addEventListener("click", clearAllChecks);
  document.getElementById("showMasterBtn").addEventListener("click", showMaster);
  document.getElementById("showCheckedBtn").addEventListener("click", showChecked);
  document.getElementById("showAddBtn").addEventListener("click", showAdd);

  // Search
  const searchInput=document.getElementById("searchInput");
  const clearSearchBtn=document.getElementById("clearSearchBtn");
  searchInput.addEventListener("input",()=>{ renderMaster(searchInput.value); clearSearchBtn.style.display=searchInput.value?'block':'none'; });
  clearSearchBtn.addEventListener("click",()=>{ searchInput.value=''; renderMaster(); clearSearchBtn.style.display='none'; });

  // Admin dropdown
  document.getElementById("exportJsonBtn").addEventListener("click", ()=>exportToGitHub(true));
  document.getElementById("restoreGitHubBtn").addEventListener("click", restoreFromGitHub);
  document.getElementById("importListBtn").addEventListener("click", ()=>document.getElementById("importListInput").click());
  document.getElementById("setTokenBtn").addEventListener("click", promptGitHubToken);
  document.getElementById("loadTokenFileBtn").addEventListener("click", ()=>document.getElementById("tokenFileInput").click());

  document.addEventListener("click", ()=>document.querySelectorAll(".dropdown-content").forEach(dc=>dc.style.display="none"));
  document.querySelector(".dropdown-btn").addEventListener("click",(e)=>{ e.stopPropagation(); const content=document.querySelector(".dropdown-content"); content.style.display=content.style.display==="block"?"none":"block"; });
});