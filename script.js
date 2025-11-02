// ===== Local Storage & GitHub Config =====
const owner = "509Eagle1";
const repo = "Grocery";
const path = "data/grocery.json";
const branch = "main";

let groceryItems = JSON.parse(localStorage.getItem('groceryItems') || "[]");
let githubTokenValid = false;

function saveData() { localStorage.setItem('groceryItems', JSON.stringify(groceryItems)); }
function notify(msg, success = true){ console.log(msg); }

// ===== GitHub Token =====
async function promptGitHubToken() {
  let token = localStorage.getItem("githubToken");
  if (!token) token = prompt("⚠️ GitHub token missing! Enter token:") || null;
  if(token) localStorage.setItem("githubToken", token);
  document.getElementById("tokenStatus").textContent = token ? "✅ GitHub Token Set" : "⚠️ No GitHub Token";

  if(token){
    try{
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,{
        headers:{Authorization:`token ${token}`}
      });
      githubTokenValid = (res.status===200 || res.status===404);
      console.log("GitHub token is", githubTokenValid ? "valid ✅" : "invalid ❌");
    }catch(e){ githubTokenValid = false; console.log("Error validating GitHub token ❌", e); }
  }
}

// ===== Render Master List (with drag handle) =====
function renderMaster(filter="") {
  const list = document.getElementById("groceryList");
  list.innerHTML = "";

  let sortedItems = [...groceryItems]
    .filter((item,index,self)=>self.findIndex(i=>i.name===item.name && i.aisle===item.aisle)===index)
    .sort((a,b)=>{
      if(a.aisle.toLowerCase() === b.aisle.toLowerCase()){
        return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
      }
      return a.aisle.toLowerCase().localeCompare(b.aisle.toLowerCase());
    });

  sortedItems.forEach((item,index)=>{
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
      renderChecked();
      saveData();
    });

    const span = document.createElement("span"); 
    span.textContent=`${item.name} (Aisle: ${item.aisle})`;

    leftDiv.appendChild(checkbox); 
    leftDiv.appendChild(span);

    // Drag Handle (Right side)
    const handle = document.createElement("span");
    handle.className = "drag-handle";
    handle.textContent = "☰";
    li.appendChild(leftDiv);
    li.appendChild(handle);

    // Enable drag
    li.setAttribute("draggable", "true");
    li.addEventListener("dragstart", e => { e.dataTransfer.setData("text/plain", index); });
    li.addEventListener("dragover", e => e.preventDefault());
    li.addEventListener("drop", e => {
      e.preventDefault();
      const draggedIndex = parseInt(e.dataTransfer.getData("text/plain"));
      const targetIndex = index;
      const [movedItem] = groceryItems.splice(draggedIndex,1);
      groceryItems.splice(targetIndex,0,movedItem);
      saveData();
      renderMaster(filter);
    });

    list.appendChild(li);
  });
}

// ===== Render Shopping List =====
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
      if(cb.checked){ li.classList.add("checked"); checkedList.appendChild(li); }
      else li.classList.remove("checked");
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
}

// ===== Page Switching =====
function showMaster(){ document.getElementById("masterPage").classList.remove("hidden"); document.getElementById("checkedPage").classList.add("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showChecked(){ document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.remove("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showAdd(){ document.getElementById("addPage").classList.remove("hidden"); document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.add("hidden"); }

// ===== Clear Checks =====
function clearAllChecks() {
  groceryItems.forEach(i=>i.checked=false);
  saveData();
  renderMaster();
  renderChecked();
}

// ===== Initialize =====
document.addEventListener("DOMContentLoaded",async ()=>{
  await promptGitHubToken();
  renderMaster(); 
  renderChecked();

  document.getElementById("addItemBtn").addEventListener("click",addItem);
  document.getElementById("clearChecksBtn").addEventListener("click",clearAllChecks);
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
});