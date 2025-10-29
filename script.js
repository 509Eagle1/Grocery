document.addEventListener("touchstart", function(){}, true);

// ---------------- CONFIG (fill these locally) ----------------
const githubUser = ""; // your GitHub username
const repoName = "";   // your repository name
const filePath = "grocery.json"; // path to JSON file in repo

// ---------------- DATA ----------------
let groceryItems = JSON.parse(localStorage.getItem('groceryItems') || "[]");
let checkedAisle = JSON.parse(localStorage.getItem('checkedAisle') || "[]");

function saveData() {
  localStorage.setItem('groceryItems', JSON.stringify(groceryItems));
  localStorage.setItem('checkedAisle', JSON.stringify(checkedAisle));
}

function sortByAisle(arr){
  return arr.sort((a,b)=>a.aisle.localeCompare(b.aisle, undefined, {numeric:true, sensitivity:'base'}));
}

// ---------------- MASTER LIST ----------------
function renderMaster(filter="") {
  const list = document.getElementById('groceryList');
  list.innerHTML = '';
  sortByAisle(groceryItems);
  groceryItems.forEach((item,index)=>{
    if(filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;

    const li = document.createElement('li');
    li.className='item';

    const left = document.createElement('div');
    const cb = document.createElement('input');
    cb.type='checkbox';
    cb.checked=item.checked||false;
    cb.addEventListener('change',()=>{
      item.checked=cb.checked;
      saveData();
    });

    const text = document.createElement('span');
    text.textContent=`${item.name} (Aisle: ${item.aisle})`;

    left.appendChild(cb);
    left.appendChild(text);

    const btns=document.createElement('div');
    const editBtn=document.createElement('button');
    editBtn.textContent='Edit';
    editBtn.addEventListener('click',()=>{
      const newName=prompt("Edit item:",item.name);
      if(newName!==null)item.name=newName.trim();
      const newAisle=prompt("Edit aisle:",item.aisle);
      if(newAisle!==null)item.aisle=newAisle.trim();
      renderMaster(document.getElementById('searchInput').value);
      saveData();
    });

    const removeBtn=document.createElement('button');
    removeBtn.textContent='Remove';
    removeBtn.addEventListener('click',()=>{
      groceryItems.splice(index,1);
      saveData();
      renderMaster(document.getElementById('searchInput').value);
    });

    btns.appendChild(editBtn);
    btns.appendChild(removeBtn);
    li.appendChild(left);
    li.appendChild(btns);
    list.appendChild(li);
  });
}

// ---------------- CHECKED BY AISLE ----------------
function renderChecked(){
  const list = document.getElementById('checkedList');
  list.innerHTML = '';
  sortByAisle(checkedAisle);
  checkedAisle.forEach((item,i)=>{
    const li=document.createElement('li');
    li.className='item';
    if(item.done) li.classList.add('checked');

    const left=document.createElement('div');
    const cb=document.createElement('input');
    cb.type='checkbox';
    cb.checked=item.done||false;
    cb.addEventListener('change',()=>{
      item.done=cb.checked;
      if(cb.checked){
        li.classList.add('checked');
        checkedAisle.push(checkedAisle.splice(i,1)[0]);
      } else {
        li.classList.remove('checked');
      }
      saveData();
      renderChecked();
    });

    const span=document.createElement('span');
    span.textContent=`${item.name} (Aisle: ${item.aisle})`;

    left.appendChild(cb);
    left.appendChild(span);
    li.appendChild(left);
    list.appendChild(li);
  });
}

// ---------------- ADD ITEM ----------------
function addItem(){
  const name=document.getElementById('itemInput').value.trim();
  const aisle=document.getElementById('aisleInput').value.trim();
  if(!name) return;
  if(groceryItems.some(i=>i.name.toLowerCase()===name.toLowerCase())){
    alert("Item already exists in master list!");
    return;
  }
  groceryItems.push({name,aisle,checked:false});
  document.getElementById('itemInput').value='';
  document.getElementById('aisleInput').value='';
  saveData();
  renderMaster(document.getElementById('searchInput').value);
}

// ---------------- CLEAR CHECKS ----------------
function clearAllChecks(){
  groceryItems.forEach(i=>i.checked=false);
  saveData();
  renderMaster(document.getElementById('searchInput').value);
}

// ---------------- IMPORT ----------------
document.getElementById('importListBtn').addEventListener('click',()=>{
  document.getElementById('importListInput').click();
});

document.getElementById('importListInput').addEventListener('change', e=>{
  const file=e.target.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    let newItems=[];
    if(file.name.endsWith('.json')){
      try{
        const data=JSON.parse(e.target.result);
        if(Array.isArray(data.groceryItems)) newItems=data.groceryItems;
      }catch(err){ alert("Invalid JSON file"); }
    } else if(file.name.endsWith('.csv')){
      const lines=e.target.result.split(/\r?\n/).filter(Boolean);
      lines.forEach(line=>{
        const [name,aisle]=line.split(',').map(s=>s.trim());
        if(name) newItems.push({name,aisle});
      });
    } else { alert("Unsupported file type"); return; }

    // Prevent duplicates
    const names=new Set(groceryItems.map(i=>i.name.toLowerCase()));
    newItems.forEach(item=>{
      if(!names.has(item.name.toLowerCase())) groceryItems.push(item);
    });
    sortByAisle(groceryItems);
    saveData();
    renderMaster(document.getElementById('searchInput').value);
  };
  reader.readAsText(file);
});

// ---------------- GITHUB TOKEN HANDLING ----------------
function getGitHubToken(){
  let token=localStorage.getItem('githubToken');
  if(!token){
    token=prompt("Enter your GitHub Personal Access Token:");
    if(token) localStorage.setItem('githubToken',token);
  }
  return token;
}

// ---------------- EXPORT TO GITHUB ----------------
async function saveToGitHub(){
  const token=getGitHubToken();
  if(!token) return alert("GitHub token required");

  const content=btoa(unescape(encodeURIComponent(JSON.stringify({groceryItems,checkedAisle},null,2))));
  const apiUrl=`https://api.github.com/repos/${githubUser}/${repoName}/contents/${filePath}`;

  try{
    const res=await fetch(apiUrl,{headers:{Authorization:`token ${token}`}});
    const data=res.ok ? await res.json() : {};
    const sha=data.sha||null;

    const response=await fetch(apiUrl,{
      method:'PUT',
      headers:{"Authorization":`token ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify({message:"Update grocery list",content:content,sha:sha})
    });
    if(response.ok) alert("✅ Uploaded to GitHub!");
    else alert("❌ Failed to upload to GitHub");
  } catch(e){ console.error(e); alert("❌ Error uploading to GitHub"); }
}

// ---------------- RESTORE FROM GITHUB ----------------
async function restoreFromGitHub(){
  const token=getGitHubToken();
  if(!token) return alert("GitHub token required");
  try{
    const response=await fetch(`https://api.github.com/repos/${githubUser}/${repoName}/contents/${filePath}`,{headers:{Authorization:`token ${token}`,Accept:"application/vnd.github.v3+json"}});
    if(!response.ok) throw new Error("Fetch failed");
    const data=await response.json();
    const decoded=atob(data.content);
    const jsonData=JSON.parse(decoded);
    groceryItems=jsonData.groceryItems||[];
    checkedAisle=jsonData.checkedAisle||[];
    saveData();
    renderMaster();
    alert("✅ Restored from GitHub!");
  } catch(e){ console.error(e); alert("❌ Could not restore from GitHub"); }
}

// ---------------- BUTTONS ----------------
document.getElementById('addItemBtn').addEventListener('click', addItem);
document.getElementById('clearChecksBtn').addEventListener('click', clearAllChecks);
document.getElementById('exportJsonBtn').addEventListener('click', saveToGitHub);
document.getElementById('restoreGitHubBtn').addEventListener('click', restoreFromGitHub);
document.getElementById('searchInput').addEventListener('input', e => renderMaster(e.target.value));
document.getElementById('itemInput').addEventListener('keypress', e => { if(e.key==='Enter') addItem(); });

// ---------------- INITIAL LOAD ----------------
document.addEventListener('DOMContentLoaded', async () => {
  if (groceryItems.length === 0) {
    const restore = confirm("No local data found. Restore from GitHub?");
    if (restore) await restoreFromGitHub();
  }
  renderMaster();
});
