let groceryItems = JSON.parse(localStorage.getItem('groceryItems') || "[]");

// ===== Save / Load =====
function saveData() {
  localStorage.setItem('groceryItems', JSON.stringify(groceryItems));
}

// ===== Render Master List =====
function renderMaster(filter="") {
  const list = document.getElementById("groceryList");
  list.innerHTML = "";

  groceryItems.forEach(item => {
    if(filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;

    const li = document.createElement("li");
    li.className="item";

    const checkbox = document.createElement("input");
    checkbox.type="checkbox";
    checkbox.checked = item.checked || false;
    checkbox.addEventListener("change", () => {
      item.checked = checkbox.checked;
      renderChecked();
      saveData();
    });

    const span = document.createElement("span");
    span.textContent = `${item.name} (Aisle: ${item.aisle})`;

    li.appendChild(checkbox);
    li.appendChild(span);
    list.appendChild(li);
  });
}

// ===== Render Checked List =====
function renderChecked() {
  const checkedList = document.getElementById("checkedList");
  checkedList.innerHTML = "";

  groceryItems.filter(i => i.checked).forEach(item => {
    const li = document.createElement("li");
    li.className="item";

    const cb = document.createElement("input");
    cb.type="checkbox";
    cb.checked = false;

    cb.addEventListener("change", () => {
      li.classList.toggle("checked", cb.checked);
    });

    const span = document.createElement("span");
    span.textContent = `${item.name} (Aisle: ${item.aisle})`;

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

  groceryItems.push({name, aisle, checked:false});
  document.getElementById("itemInput").value="";
  document.getElementById("aisleInput").value="";
  saveData();
  renderMaster();
  renderChecked();
}

// ===== Page Switching =====
function showMaster(){ document.getElementById("masterPage").classList.remove("hidden"); document.getElementById("checkedPage").classList.add("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showChecked(){ document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.remove("hidden"); document.getElementById("addPage").classList.add("hidden"); }
function showAdd(){ document.getElementById("addPage").classList.remove("hidden"); document.getElementById("masterPage").classList.add("hidden"); document.getElementById("checkedPage").classList.add("hidden"); }

document.addEventListener("DOMContentLoaded", () => {

  renderMaster();
  renderChecked();

  document.getElementById("addItemBtn").addEventListener("click", addItem);
  document.getElementById("clearChecksBtn").addEventListener("click", () => {
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
  searchInput.addEventListener("input",()=>{ 
    renderMaster(searchInput.value);
    clearSearchBtn.style.display = searchInput.value ? 'block' : 'none';
  });
  clearSearchBtn.addEventListener("click",()=>{ 
    searchInput.value=''; renderMaster(); clearSearchBtn.style.display='none';
  });

  // Admin dropdown
  const adminBtn = document.querySelector(".dropdown-btn");
  const adminContent = adminBtn.nextElementSibling;

  adminBtn.addEventListener("click",(e)=>{
    e.stopPropagation();
    const isVisible = adminContent.style.display === "block";
    document.querySelectorAll(".dropdown-content").forEach(dc=>dc.style.display="none");
    adminContent.style.display = isVisible ? "none" : "block";
  });

  document.addEventListener("click", ()=>{ document.querySelectorAll(".dropdown-content").forEach(dc=>dc.style.display="none"); });

  // Admin buttons placeholders
  document.getElementById("exportJsonBtn").addEventListener("click",()=>alert("Export clicked"));
  document.getElementById("restoreGitHubBtn").addEventListener("click",()=>alert("Restore clicked"));
  document.getElementById("importListBtn").addEventListener("click",()=>document.getElementById("importListInput").click());
  document.getElementById("setTokenBtn").addEventListener("click",()=>alert("Set Token clicked"));
  document.getElementById("loadTokenFileBtn").addEventListener("click",()=>document.getElementById("tokenFileInput").click());
});