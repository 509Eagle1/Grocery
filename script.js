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
  if(token){
    document.getElementById("tokenStatus")?.textContent = "✅ GitHub Token Set";
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,{
        headers:{Authorization:`token ${token}`}
      });
      githubTokenValid = res.status===200 || res.status===404;
    } catch(e){
      githubTokenValid=false;
      console.log("Error validating GitHub token ❌", e);
    }
  } else {
    document.getElementById("tokenStatus")?.textContent = "⚠️ No GitHub Token";
    githubTokenValid=false;
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
    li.dataset.index = index;
    li.setAttribute("draggable","true");

    // LEFT: checkbox + name
    const leftDiv = document.createElement("div"); leftDiv.className="item-left";
    const checkbox = document.createElement("input"); checkbox.type="checkbox"; checkbox.checked = item.checked || false;
    const span = document.createElement("span"); span.textContent=`${item.name} (Aisle: ${item.aisle})`;
    leftDiv.appendChild(checkbox); leftDiv.appendChild(span);

    // RIGHT: drag handle
    const rightDiv = document.createElement("div"); rightDiv.className="item-right";
    const dragHandle = document.createElement("span"); dragHandle.className="drag-handle";
    dragHandle.innerHTML='<svg viewBox="0 0 24 24"><path d="M3 12h18v2H3v-2zm0-5h18v2H3V7zm0 10h18v2H3v-2z"/></svg>';
    rightDiv.appendChild(dragHandle);

    li.appendChild(leftDiv); li.appendChild(rightDiv);
    list.appendChild(li);

    // Checkbox changes
    checkbox.addEventListener("change", ()=>{
      item.checked = checkbox.checked;
      renderChecked(); saveData();
    });

    // Drag events
    li.addEventListener("dragstart",(e)=>{ li.classList.add("dragging"); e.dataTransfer.setData("text/plain", index); });
    li.addEventListener("dragover",(e)=>{
      e.preventDefault();
      const draggingEl = document.querySelector(".dragging"); if(!draggingEl) return;
      const bounding = li.getBoundingClientRect(); const offset = e.clientY - bounding.top;
      if(offset>bounding.height/2) li.parentNode.insertBefore(draggingEl, li.nextSibling);
      else li.parentNode.insertBefore(draggingEl, li);
    });
    li.addEventListener("dragend",()=>{
      li.classList.remove("dragging");
      const newItems = [];
      document.querySelectorAll("#groceryList .item").forEach(it=>{ const idx=parseInt(it.dataset.index); newItems.push(groceryItems[idx]); });
      groceryItems = newItems; saveData(); renderMaster();
    });
  });
}

// ===== Render Checked / Shopping List =====
function renderChecked() {
  const checkedList = document.getElementById("checkedList");
  checkedList.innerHTML = "";

  groceryItems.filter(i=>i.checked).forEach(item=>{
    const li = document.createElement("li"); li.className="item"; li.style.justifyContent="flex-start";
    const cb = document.createElement("input"); cb.type="checkbox"; cb.checked=false;
    const span = document.createElement("span"); span.textContent=`${item.name} (Aisle: ${item.aisle})`;

    li.appendChild(cb); li.appendChild(span); checkedList.appendChild(li);

    cb.addEventListener("change", ()=>{
      if(cb.checked){
        li.classList.add("checked");
        checkedList.appendChild(li); // move to bottom
      } else {
        li.classList.remove("checked");
        checkedList.insertBefore(li, checkedList.firstChild); // move to top
      }
    });
  });
}

// ===== Add Item =====
function addItem(){
  const name=document.getElementById("itemInput").value.trim();
  const aisle=document.getElementById("aisleInput").value.trim();
  if(!name) return;
  groceryItems.push({name,aisle,checked:false});
  document.getElementById("itemInput").value=""; document.getElementById("aisleInput").value="";
  saveData(); renderMaster(); renderChecked();
}

// ===== Page Switching =====
function showMaster(){ document.getElementById("masterPage").classList.remove("hidden"); document.getElementById("checkedPage").classList.add("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showChecked(){ document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.remove("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showAdd(){ document.getElementById("addPage").classList.remove("hidden"); document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.add("hidden"); }

// ===== GitHub Export =====
async function exportToGitHub(){
  if(!githubTokenValid){ console.log("Cannot export: invalid token"); return; }
  const token = localStorage.getItem("githubToken");
  const content = btoa(JSON.stringify(groceryItems,null,2));
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
  let sha;
  try {
    const getRes = await fetch(url+"?ref="+branch,{headers:{Authorization:`token ${token}`}});
    if(getRes.status === 200){ const data = await getRes.json(); sha=data.sha; }
  } catch(e){ console.log("Error fetching existing file",e); }

  try {
    const res = await fetch(url,{
      method:"PUT",
      headers:{Authorization:`token ${token}`, "Content-Type":"application/json"},
      body: JSON.stringify({ message:"Update grocery list", content, branch, sha })
    });
    const data = await res.json();
    console.log("Export result:", data);
  } catch(err){ console.log("Export failed", err); }
}

// ===== Restore from GitHub =====
async function restoreFromGitHub(){
  if(!githubTokenValid){ console.log("Cannot restore: invalid token"); return; }
  const token = localStorage.getItem("githubToken");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
  try{
    const res = await fetch(url,{headers:{Authorization:`token ${token}`}});
    const data = await res.json();
    if(data && data.content){
      groceryItems = JSON.parse(atob(data.content));
      saveData(); renderMaster(); renderChecked();
      console.log("Restore success ✅");
    }
  }catch(err){ console.log("Restore error ❌", err); }
}

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", async ()=>{
  await promptGitHubToken();
  renderMaster(); renderChecked();

  // Buttons
  document.getElementById("addItemBtn").addEventListener("click", addItem);
  document.getElementById("clearChecksBtn").addEventListener("click", ()=>{
    groceryItems.forEach(i=>i.checked=false); saveData(); renderMaster(); renderChecked();
  });
  document.getElementById("showMasterBtn").addEventListener("click", showMaster);
  document.getElementById("showCheckedBtn").addEventListener("click", showChecked);
  document.getElementById("showAddBtn").addEventListener("click", showAdd);

  // Search
  const searchInput=document.getElementById("searchInput");
  const clearSearchBtn=document.getElementById("clearSearchBtn");
  searchInput.addEventListener("input", ()=>{ renderMaster(searchInput.value); clearSearchBtn.style.display=searchInput.value?'block':'none'; });
  clearSearchBtn.addEventListener("click", ()=>{ searchInput.value=''; renderMaster(); clearSearchBtn.style.display='none'; });

  // Admin dropdown
  const adminBtn=document.querySelector(".menu .dropdown-btn");
  const adminDropdown=adminBtn.nextElementSibling;
  adminBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    const isVisible=adminDropdown.style.display==="block";
    document.querySelectorAll(".dropdown-content").forEach(dc=>dc.style.display="none");
    adminDropdown.style.display=isVisible?"none":"block";
  });
  document.addEventListener("click", ()=>{ document.querySelectorAll(".dropdown-content").forEach(dc=>dc.style.display="none"); });

  // Admin actions
  document.getElementById("exportJsonBtn").addEventListener("click", exportToGitHub);
  document.getElementById("restoreGitHubBtn").addEventListener("click", restoreFromGitHub);
  document.getElementById("importListBtn").addEventListener("click", ()=>document.getElementById("importListInput").click());
  document.getElementById("setTokenBtn").addEventListener("click", promptGitHubToken);
  document.getElementById("loadTokenFileBtn").addEventListener("click", ()=>document.getElementById("tokenFileInput").click());

  // Import file
  document.getElementById("importListInput").addEventListener("change",(e)=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{ groceryItems = JSON.parse(reader.result); saveData(); renderMaster(); renderChecked(); };
    reader.readAsText(file);
  });

  // Load token file
  document.getElementById("tokenFileInput").addEventListener("change",(e)=>{
    const file=e.target.files[0]; if(!file) return;
    const reader=new FileReader();
    reader.onload=()=>{ localStorage.setItem("githubToken", reader.result.trim()); promptGitHubToken(); };
    reader.readAsText(file);
  });
});