let groceryItems = JSON.parse(localStorage.getItem('groceryItems') || "[]");
let shoppingCheckedStates = {};

// ===== GitHub Configuration =====
const owner = "509Eagle1";
const repo = "Grocery";
const path = "data/grocery.json";
const branch = "main";

// ===== Local Storage =====
function saveData() { localStorage.setItem('groceryItems', JSON.stringify(groceryItems)); }

// ===== GitHub Token =====
function promptGitHubToken() {
  let token = localStorage.getItem("githubToken");
  if (!token) token = prompt("⚠️ GitHub token missing! Enter token:") || null;
  if(token) localStorage.setItem("githubToken", token);
  document.getElementById("tokenStatus").textContent = token ? "✅ GitHub Token Set" : "⚠️ No GitHub Token";
}

// ===== GitHub Headers =====
function getGitHubHeaders() {
  const token = localStorage.getItem("githubToken");
  return { Authorization: `token ${token}`, "Content-Type": "application/json" };
}

// ===== GitHub Save =====
async function saveToGitHub() {
  const token = localStorage.getItem("githubToken");
  if(!token){ alert("GitHub token missing!"); return; }
  let sha = null;

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
      headers: getGitHubHeaders()
    });
    if(res.status === 200){ const data = await res.json(); sha = data.sha; }
  } catch(err){ console.log(err); }

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(groceryItems,null,2))));
  const body = { message: "Update grocery list", content, branch };
  if(sha) body.sha = sha;

  try {
    await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
      method: "PUT",
      headers: getGitHubHeaders(),
      body: JSON.stringify(body)
    });
  } catch(err){ console.log(err); }
}

// ===== Render Master List =====
function renderMaster(filter="") {
  const list = document.getElementById("groceryList");
  list.innerHTML = "";
  groceryItems.forEach((item,index)=>{
    if(filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;

    const li = document.createElement("li"); li.className="item"; li.draggable = true; li.dataset.index=index;
    const leftDiv = document.createElement("div"); leftDiv.style.display="flex"; leftDiv.style.alignItems="center"; leftDiv.style.gap="5px";

    const checkbox = document.createElement("input"); checkbox.type="checkbox"; checkbox.checked=item.checked||false;
    checkbox.addEventListener("change",()=>{
      item.checked = checkbox.checked; renderChecked(); saveData(); saveToGitHub();
    });

    const span = document.createElement("span"); span.textContent=`${item.name} (Aisle: ${item.aisle})`;
    leftDiv.appendChild(checkbox); leftDiv.appendChild(span); li.appendChild(leftDiv);

    const rightDiv = document.createElement("div"); rightDiv.style.display="flex"; rightDiv.style.alignItems="center";

    const dropdown = document.createElement("div"); dropdown.className="dropdown";
    const dropBtn = document.createElement("button"); dropBtn.className="dropdown-btn"; dropBtn.textContent="Options ⏷";
    const dropContent = document.createElement("div"); dropContent.className="dropdown-content";

    const editBtn = document.createElement("button"); editBtn.className="edit"; editBtn.textContent="Edit";
    editBtn.addEventListener("click",()=>{
      const newName = prompt("Edit item:",item.name); if(newName!==null)item.name=newName.trim();
      const newAisle = prompt("Edit aisle:",item.aisle); if(newAisle!==null)item.aisle=newAisle.trim();
      renderMaster(document.getElementById("searchInput").value); saveData(); saveToGitHub();
    });

    const removeBtn = document.createElement("button"); removeBtn.className="remove"; removeBtn.textContent="Remove";
    removeBtn.addEventListener("click",(e)=>{
      e.stopPropagation(); if(confirm(`Are you sure you want to remove "${item.name}"?`)){
        groceryItems.splice(index,1); saveData(); saveToGitHub(); renderMaster(document.getElementById("searchInput").value);
      }
    });

    dropContent.appendChild(editBtn); dropContent.appendChild(removeBtn); dropdown.appendChild(dropBtn); dropdown.appendChild(dropContent);
    rightDiv.appendChild(dropdown);

    const handle = document.createElement("span"); handle.className = "drag-handle";
    handle.innerHTML = `<svg viewBox="0 0 20 20"><circle cx="5" cy="4" r="2"></circle><circle cx="5" cy="10" r="2"></circle><circle cx="5" cy="16" r="2"></circle></svg>`;
    rightDiv.appendChild(handle);
    li.appendChild(rightDiv);

    dropBtn.addEventListener("click",(e)=>{ e.stopPropagation();
      document.querySelectorAll("#groceryList .dropdown-content").forEach(dc=>{ if(dc!==dropContent) dc.style.display="none"; });
      dropContent.style.display = dropContent.style.display==="block"?"none":"block";
    });

    handle.addEventListener("mousedown",()=>{ li.draggable=true; });
    handle.addEventListener("mouseup",()=>{ li.draggable=false; });
    li.addEventListener("dragstart",(e)=>{ li.classList.add("dragging"); e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("text/plain", index); });
    li.addEventListener("dragend",()=>{ li.classList.remove("dragging"); });
    li.addEventListener("dragover",(e)=>{
      e.preventDefault(); const draggingItem = document.querySelector(".dragging");
      const bounding = li.getBoundingClientRect(); const offset = e.clientY - bounding.top; const mid = bounding.height/2;
      const listEl = li.parentNode; if(offset>mid){ listEl.insertBefore(draggingItem, li.nextSibling); } else { listEl.insertBefore(draggingItem, li); }
    });
    li.addEventListener("drop",()=>{
      const newOrder = Array.from(document.querySelectorAll("#groceryList .item")).map(el=>groceryItems[el.dataset.index]);
      groceryItems = newOrder; saveData(); saveToGitHub(); renderMaster(document.getElementById("searchInput").value);
    });

    list.appendChild(li);
  });
}

// ===== Render Checked / Shopping List =====
function renderChecked() {
  const checkedList = document.getElementById("checkedList"); checkedList.innerHTML="";
  let checkedItems = groceryItems.filter(i => i.checked);
  checkedItems.sort((a,b)=>{
    const aKey = a.name + "|" + a.aisle; const bKey = b.name + "|" + b.aisle;
    const aChecked = shoppingCheckedStates[aKey] || false; const bChecked = shoppingCheckedStates[bKey] || false;
    return aChecked - bChecked;
  });
  checkedItems.forEach(item=>{
    const li = document.createElement("li"); li.className="item";
    const cb = document.createElement("input"); cb.type="checkbox";
    const key = item.name+"|"+item.aisle;
    cb.checked = shoppingCheckedStates[key]||false;
    li.classList.toggle("checked", cb.checked);
    cb.addEventListener("change",()=>{
      shoppingCheckedStates[key]=cb.checked; li.classList.toggle("checked",cb.checked); renderChecked();
    });
    const span = document.createElement("span"); span.textContent=`${item.name} (Aisle: ${item.aisle})`;
    li.appendChild(cb); li.appendChild(span); checkedList.appendChild(li);
  });
}

// ===== Add Item =====
function addItem() {
  const name = document.getElementById("itemInput").value.trim();
  const aisle = document.getElementById("aisleInput").value.trim();
  if(!name) return;
  groceryItems.push({name,aisle,checked:false});
  document.getElementById("itemInput").value = ""; document.getElementById("aisleInput").value="";
  saveData(); renderMaster(); saveToGitHub();
}

// ===== Page Switching =====
function showMaster(){ document.getElementById("masterPage").classList.remove("hidden"); document.getElementById("checkedPage").classList.add("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showChecked(){ document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.remove("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showAdd(){ document.getElementById("addPage").classList.remove("hidden"); document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.add("hidden"); }

document.addEventListener("DOMContentLoaded",()=>{
  promptGitHubToken(); renderMaster(); renderChecked();

  document.getElementById("addItemBtn").addEventListener("click",addItem);
  document.getElementById("clearChecksBtn").addEventListener("click",()=>{
    groceryItems.forEach(i=>i.checked=false); saveData(); saveToGitHub(); renderMaster(); renderChecked();
  });
  document.getElementById("showMasterBtn").addEventListener("click",showMaster);
  document.getElementById("showCheckedBtn").addEventListener("click",showChecked);
  document.getElementById("showAddBtn").addEventListener("click",showAdd);

  const searchInput=document.getElementById("searchInput"); const clearSearchBtn=document.getElementById("clearSearchBtn");
  searchInput.addEventListener("input",()=>{ renderMaster(searchInput.value); clearSearchBtn.style.display = searchInput.value ? 'block':'none'; });
  clearSearchBtn.addEventListener("click",()=>{ searchInput.value=''; renderMaster(); clearSearchBtn.style.display='none'; });

  // Admin Dropdown Buttons
  document.getElementById("exportJsonBtn").addEventListener("click", () => { saveToGitHub().then(()=> alert("Albertsons list exported to GitHub!")); });

  document.getElementById("restoreGitHubBtn").addEventListener("click", async () => {
    const token = localStorage.getItem("githubToken");
    if(!token){ alert("GitHub token missing!"); return; }
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
        headers: getGitHubHeaders()
      });
      if(res.status === 200){
        const data = await res.json();
        groceryItems = JSON.parse(atob(data.content));
        saveData(); renderMaster(); renderChecked(); alert("Albertsons list restored from GitHub!");
      } else { alert("Error fetching list from GitHub."); }
    } catch(err){ console.log(err); alert("Failed to restore from GitHub."); }
  });

  document.getElementById("importListBtn").addEventListener("click", ()=>{ document.getElementById("importListInput").click(); });
  document.getElementById("importListInput").addEventListener("change", (e) => {
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try { 
        groceryItems = JSON.parse(event.target.result); 
        saveData(); renderMaster(); renderChecked(); saveToGitHub(); 
        alert("Albertsons list imported!");
      } catch(err){ alert("Invalid JSON file."); }
    };
    reader.readAsText(file);
  });

  document.getElementById("setTokenBtn").addEventListener("click", ()=>{ 
    const token = prompt("Enter GitHub Token:"); 
    if(token){ localStorage.setItem("githubToken", token); document.getElementById("tokenStatus").textContent = "✅ GitHub Token Set"; }
  });

  document.getElementById("loadTokenFileBtn").addEventListener("click", ()=>{ document.getElementById("tokenFileInput").click(); });
  document.getElementById("tokenFileInput").addEventListener("change", (e)=>{
    const file = e.target.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (event)=>{
      const token = event.target.result.trim();
      if(token){ localStorage.setItem("githubToken", token); document.getElementById("tokenStatus").textContent = "✅ GitHub Token Set"; }
    };
    reader.readAsText(file);
  });

});