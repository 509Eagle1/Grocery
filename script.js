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
let autoExportTimer = null; // debounce timer for auto export

// Save
function saveData() {
 localStorage.setItem('groceryItems', JSON.stringify(groceryItems));
}

function scheduleAutoExport(reason="change") {
 // Only auto-export if we have a token and not running as file://
 const token = localStorage.getItem("githubToken");
 if (!token || window.location.protocol === 'file:') return;
 clearTimeout(autoExportTimer);
 autoExportTimer = setTimeout(()=>{
 exportToGitHub(false, true, `Auto sync (${reason})`);
 },1500); //1.5s debounce
}

// Notification
function notify(msg, success = true){
 console.log((success ? "[OK] " : "[ERR] ") + msg);
}

// ===== GitHub Token Prompt =====
async function promptGitHubToken() {
 let token = localStorage.getItem("githubToken");
 if (!token && window.location.protocol !== 'file:') { // don't prompt when opened as file
 token = prompt("⚠️ GitHub token missing! Enter token:") || null;
 if (token) localStorage.setItem("githubToken", token);
 }
 
 const statusEl = document.getElementById("tokenStatus");
 if (statusEl) {
 const hasToken = !!localStorage.getItem("githubToken");
 statusEl.textContent = hasToken ? "✅ GitHub Token Set" : (window.location.protocol === 'file:' ? "ℹ️ Local Mode" : "⚠️ No GitHub Token");
 }

 const currentToken = localStorage.getItem("githubToken");
 if (currentToken) {
 try {
 const res = await fetch(
 `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
 { headers: { Authorization: `token ${currentToken}` } }
 );
 githubTokenValid = (res.status ===200 || res.status ===404);
 } catch {
 githubTokenValid = false;
 }
 } else {
 githubTokenValid = false;
 }
}

// ===== Helper: Row Click Toggle =====
function enableRowToggle(li, checkbox, item) {
 li.addEventListener("click", (event) => {
 if (event.target.tagName === "INPUT" || event.target.tagName === "BUTTON") return;
 checkbox.checked = !checkbox.checked;
 item.checked = checkbox.checked;
 saveData();
 renderChecked();
 const si = document.getElementById("searchInput");
 renderMaster(si ? si.value : "");
 scheduleAutoExport("toggle item");
 });
}

// ===== Render Master List =====
function renderMaster(filter="") {
 const list = document.getElementById("groceryList");
 if (!list) return;
 list.innerHTML = "";

 let sortedItems = [...groceryItems]
 .filter((item,index,self)=>
 self.findIndex(i=>i.name===item.name && i.aisle===item.aisle)===index)
 .sort((a,b)=>{
 if(sortMode==="name"){
 return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
 } else {
 let aA = parseInt(a.aisle) ||0;
 let bA = parseInt(b.aisle) ||0;
 if (aA === bA)
 return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
 return aA - bA;
 }
 });

 sortedItems.forEach((item)=>{
 if(filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;

 const li = document.createElement("li");
 li.className = "item";

 const left = document.createElement("div");
 left.className = "item-left";

 const checkbox = document.createElement("input");
 checkbox.type="checkbox";
 checkbox.checked = item.checked || false;

 checkbox.addEventListener("click",(e)=>{
 e.stopPropagation();
 item.checked = checkbox.checked;
 saveData();
 renderChecked();
 scheduleAutoExport("check item");
 });

 const span = document.createElement("span");
 span.textContent = `${item.name} (Aisle: ${item.aisle})`;

 left.appendChild(checkbox);
 left.appendChild(span);
 li.appendChild(left);

 const right = document.createElement("div");
 right.className = "item-right";

 const editBtn = document.createElement("button");
 editBtn.textContent = "Edit";
 editBtn.style.padding = "4px6px";
 editBtn.style.fontSize = "12px";

 editBtn.addEventListener("click", (e) => {
 e.stopPropagation();
 enterEditMode(li, item);
 });

 right.appendChild(editBtn);
 li.appendChild(right);
 list.appendChild(li);

 enableRowToggle(li, checkbox, item);
 });
}

// ===== Enter Edit Mode =====
function enterEditMode(li, item) {
 const left = li.querySelector(".item-left");
 const right = li.querySelector(".item-right");

 const origName = item.name;
 const origAisle = item.aisle;

 left.innerHTML = "";

 const checkbox = document.createElement("input");
 checkbox.type = "checkbox";
 checkbox.checked = item.checked;
 checkbox.disabled = true;
 left.appendChild(checkbox);

 const nameInput = document.createElement("input");
 nameInput.type = "text";
 nameInput.value = origName;
 nameInput.style.width = "140px";

 const aisleInput = document.createElement("input");
 aisleInput.type = "text";
 aisleInput.value = origAisle;
 aisleInput.style.width = "60px";

 left.appendChild(nameInput);
 left.appendChild(aisleInput);

 right.innerHTML = "";
 right.style.display = "flex";
 right.style.flexDirection = "column";
 right.style.gap = "4px";

 const saveBtn = document.createElement("button");
 saveBtn.textContent = "Save";
 saveBtn.style.fontSize = "12px";

 const cancelBtn = document.createElement("button");
 cancelBtn.textContent = "Cancel";
 cancelBtn.style.fontSize = "12px";

 const deleteBtn = document.createElement("button");
 deleteBtn.textContent = "Delete";
 deleteBtn.style.fontSize = "12px";
 deleteBtn.style.background = "#dc3545";
 deleteBtn.style.color = "white";

 right.appendChild(saveBtn);
 right.appendChild(cancelBtn);
 right.appendChild(deleteBtn);

 saveBtn.addEventListener("click", () => {
 item.name = nameInput.value.trim() || origName;
 item.aisle = aisleInput.value.trim() || origAisle;
 saveData();
 renderMaster();
 scheduleAutoExport("edit item");
 });

 cancelBtn.addEventListener("click", () => {
 renderMaster();
 });

 deleteBtn.addEventListener("click", () => {
 if (!confirm(`Delete "${item.name}"?`)) return;
 groceryItems = groceryItems.filter(i => i !== item);
 saveData();
 renderMaster();
 renderChecked();
 scheduleAutoExport("delete item");
 });
}

// ===== Shopping List =====
function renderChecked() {
 const list = document.getElementById("checkedList");
 if (!list) return;
 list.innerHTML = "";

 groceryItems.filter(i=>i.checked).forEach(item=>{
 const li = document.createElement("li");
 li.className = "item";

 const cb = document.createElement("input");
 cb.type = "checkbox";

 const span = document.createElement("span");
 span.textContent = `${item.name} (Aisle: ${item.aisle})`;

 li.appendChild(cb);
 li.appendChild(span);
 list.appendChild(li);

 cb.addEventListener("click",(e)=>{
 e.stopPropagation();
 cb.checked = false;
 li.classList.add("checked");
 list.appendChild(li);
 });

 li.addEventListener("click",(e)=>{
 if (e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
 cb.checked = !cb.checked;
 if(cb.checked){
 li.classList.add("checked");
 list.appendChild(li);
 } else {
 li.classList.remove("checked");
 }
 });
 });
}

// ===== GitHub Export =====
async function exportToGitHub(downloadAlso = false, autoCommit = false, autoMessage = "Auto sync") {
 const token = localStorage.getItem("githubToken");
 if (!token || window.location.protocol === 'file:') {
 if (downloadAlso) {
 notify("Local export: downloading grocery.json");
 downloadLocalJson();
 }
 return;
 }
 try {
 // Build base64 content
 const jsonText = JSON.stringify(groceryItems, null,2);
 const content = btoa(unescape(encodeURIComponent(jsonText)));
 // Get existing file sha (if exists)
 let sha = null;
 const resGet = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
 headers: {
 Authorization: `token ${token}`,
 'Accept': 'application/vnd.github+json',
 'User-Agent': 'WebProject1/1.0'
 }
 });
 if (resGet.status ===200) {
 const getBody = await resGet.json();
 sha = getBody.sha;
 } else if (resGet.status !==404) {
 const errTxt = await resGet.text();
 notify(`GitHub pre-check failed: ${resGet.status} ${errTxt}`, false);
 }
 // Commit
 const message = autoCommit ? autoMessage : 'Update grocery list';
 const resPut = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
 method: 'PUT',
 headers: {
 Authorization: `token ${token}`,
 'Accept': 'application/vnd.github+json',
 'User-Agent': 'WebProject1/1.0',
 'Content-Type': 'application/json'
 },
 body: JSON.stringify({ message, content, branch, sha })
 });
 const putTxt = await resPut.text();
 if (!resPut.ok) {
 notify(`GitHub export failed: ${resPut.status} ${putTxt}`, false);
 } else if (!autoCommit) {
 notify('GitHub export successful.');
 }
 } catch (e) {
 notify('GitHub export exception: ' + e.message, false);
 }
 if (downloadAlso) downloadLocalJson();
}

function downloadLocalJson() {
 const blob = new Blob([JSON.stringify(groceryItems, null,2)], {type:"application/json"});
 const a = document.createElement("a");
 a.href = URL.createObjectURL(blob);
 a.download = "grocery.json";
 a.click();
 URL.revokeObjectURL(a.href);
}

// ===== Restore: GitHub or Local =====
async function restoreFromGitHub() {
 const token = localStorage.getItem("githubToken");
 if (!token || window.location.protocol === 'file:') {
 try {
 const resLocal = await fetch(path, { cache: 'no-cache' });
 if (!resLocal.ok) {
 notify("Local restore failed: " + resLocal.status, false);
 return;
 }
 const text = await resLocal.text();
 const data = JSON.parse(text);
 groceryItems = Array.isArray(data) ? data : [];
 saveData();
 renderMaster();
 renderChecked();
 notify("Local restore completed.");
 } catch (e) {
 notify("Local restore error: " + e.message, false);
 }
 return;
 }

 try {
 const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`, {
 headers: { Authorization: `token ${token}` }
 });
 if (res.status ===404) {
 notify("Remote file not found.", false);
 return;
 }
 if (!res.ok) {
 notify("Restore failed: " + res.status, false);
 return;
 }
 const json = await res.json();
 const decoded = decodeURIComponent(escape(atob(json.content)));
 groceryItems = JSON.parse(decoded);
 saveData();
 renderMaster();
 renderChecked();
 notify("GitHub restore completed.");
 } catch (e) {
 notify("Restore error: " + e.message, false);
 }
}

// ===== Import List (JSON/CSV) =====
function handleImport(e) {
 const file = e.target.files[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = () => {
 try {
 let text = reader.result;
 let imported;
 if (file.name.toLowerCase().endsWith(".csv")) {
 imported = text.split(/\r?\n/).filter(l=>l.trim()).map(line=>{
 const parts = line.split(",");
 return { name: parts[0].trim(), aisle: (parts[1]||"").trim(), checked:false };
 });
 } else {
 imported = JSON.parse(text);
 }
 imported.forEach(inItem=>{
 if(!groceryItems.some(i=>i.name===inItem.name && i.aisle===inItem.aisle)){
 groceryItems.push(inItem);
 }
 });
 saveData();
 renderMaster();
 notify("Import completed.");
 scheduleAutoExport("import");
 } catch (err) {
 notify("Import failed: " + err.message, false);
 } finally {
 e.target.value = "";
 }
 };
 reader.readAsText(file);
}

// ===== Load Token From File (.txt) =====
function handleTokenFileLoad(e) {
 const file = e.target.files[0];
 if (!file) return;
 const reader = new FileReader();
 reader.onload = () => {
 const token = reader.result.trim();
 if (token) {
 localStorage.setItem("githubToken", token);
 notify("Token loaded from file.");
 promptGitHubToken();
 }
 e.target.value = "";
 };
 reader.readAsText(file);
}

// Add item
function addItem() {
 const nameInput = document.getElementById("itemInput");
 const aisleInput = document.getElementById("aisleInput");
 if (!nameInput || !aisleInput) return;
 const name = nameInput.value.trim();
 const aisle = aisleInput.value.trim();
 if(!name) return;
 groceryItems.push({name, aisle, checked:false});
 saveData();
 nameInput.value="";
 aisleInput.value="";
 renderMaster();
 scheduleAutoExport("add item");
}

// Page switching
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
 document.getElementById("masterPage").classList.add("hidden");
 document.getElementById("checkedPage").classList.add("hidden");
 document.getElementById("addPage").classList.remove("hidden");
}

// Clear checks
function clearAllChecks() {
 groceryItems.forEach(i=>i.checked=false);
 saveData();
 renderMaster();
 renderChecked();
 scheduleAutoExport("clear checks");
}

// ===== Initialize =====
document.addEventListener("DOMContentLoaded", async ()=>{
 try {
 const addItemBtn = document.getElementById("addItemBtn");
 const clearChecksBtn = document.getElementById("clearChecksBtn");
 const showMasterBtn = document.getElementById("showMasterBtn");
 const showCheckedBtn = document.getElementById("showCheckedBtn");
 const showAddBtn = document.getElementById("showAddBtn");
 const sortNameBtn = document.getElementById("sortNameBtn");
 const sortAisleBtn = document.getElementById("sortAisleBtn");
 const searchInput = document.getElementById("searchInput");
 const clearSearchBtn = document.getElementById("clearSearchBtn");
 const exportJsonBtn = document.getElementById("exportJsonBtn");
 const restoreGitHubBtn = document.getElementById("restoreGitHubBtn");
 const importListBtn = document.getElementById("importListBtn");
 const setTokenBtn = document.getElementById("setTokenBtn");
 const loadTokenFileBtn = document.getElementById("loadTokenFileBtn");
 const importListInput = document.getElementById("importListInput");
 const tokenFileInput = document.getElementById("tokenFileInput");

 await promptGitHubToken();
 renderMaster();
 renderChecked();

 addItemBtn?.addEventListener("click", addItem);
 clearChecksBtn?.addEventListener("click", clearAllChecks);
 showMasterBtn?.addEventListener("click", showMaster);
 showCheckedBtn?.addEventListener("click", showChecked);
 showAddBtn?.addEventListener("click", showAdd);
 sortNameBtn?.addEventListener("click", ()=>{ sortMode = "name"; renderMaster(searchInput?.value || ""); });
 sortAisleBtn?.addEventListener("click", ()=>{ sortMode = "aisle"; renderMaster(searchInput?.value || ""); });
 searchInput?.addEventListener("input", ()=>{ renderMaster(searchInput.value); if (clearSearchBtn) clearSearchBtn.style.display = searchInput.value ? "block" : "none"; });
 clearSearchBtn?.addEventListener("click", ()=>{ if (!searchInput) return; searchInput.value=""; clearSearchBtn.style.display="none"; renderMaster(); });
 exportJsonBtn?.addEventListener("click", ()=>exportToGitHub(true));
 restoreGitHubBtn?.addEventListener("click", restoreFromGitHub);
 importListBtn?.addEventListener("click", ()=>importListInput?.click());
 setTokenBtn?.addEventListener("click", promptGitHubToken);
 loadTokenFileBtn?.addEventListener("click", ()=>tokenFileInput?.click());
 importListInput?.addEventListener("change", handleImport);
 tokenFileInput?.addEventListener("change", handleTokenFileLoad);
 document.addEventListener("click", ()=>{ document.querySelectorAll(".dropdown-content").forEach(dc=>dc.style.display="none"); });
 const ddBtn = document.querySelector(".dropdown-btn");
 ddBtn?.addEventListener("click", (e)=>{ e.stopPropagation(); const content = document.querySelector(".dropdown-content"); if (content) { content.style.display = content.style.display === "block" ? "none" : "block"; } });
 } catch (e) { console.error("Initialization error:", e); }
});
