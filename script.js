const githubUser = "509Eagle1";
const repoName = "Grocery";
const filePath = "data/grocery.json";

let groceryItems = JSON.parse(localStorage.getItem('groceryItems') || "[]");
let checkedAisle = JSON.parse(localStorage.getItem('checkedAisle') || "[]");

function saveData() {
  localStorage.setItem('groceryItems', JSON.stringify(groceryItems));
  localStorage.setItem('checkedAisle', JSON.stringify(checkedAisle));
}
function sortByAisle(arr){ return arr.sort((a,b)=>a.aisle.localeCompare(b.aisle, undefined, {numeric:true,sensitivity:'base'})); }
function updateTokenStatus(token) {
  document.getElementById('tokenStatus').textContent = token ? "✅ GitHub Connected" : "⚠️ No GitHub Token";
}

// --- Token Startup ---
async function checkTokenOnStartup() {
  let token = localStorage.getItem('githubToken');
  if (!token) {
    token = prompt("⚠️ GitHub token missing! Please enter your GitHub token:");
    if (token) {
      localStorage.setItem('githubToken', token);
      updateTokenStatus(token);
      await restoreFromGitHub();
    } else {
      alert("You can load a token from a .txt file via Admin → Load Token From File.");
    }
  } else {
    updateTokenStatus(token);
    await restoreFromGitHub();
  }
  return token;
}

// --- Load Token From File ---
function handleLoadTokenFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const token = reader.result.trim();
    if (token) {
      localStorage.setItem('githubToken', token);
      updateTokenStatus(token);
      alert('✅ GitHub token loaded! Restoring list...');
      await restoreFromGitHub();
    } else alert('❌ Token file empty.');
  };
  reader.readAsText(file);
}

// --- GitHub ---
async function saveToGitHub(silent=false){
  let token = localStorage.getItem('githubToken');
  if(!token) token = await checkTokenOnStartup();
  if(!token) return;
  const content=btoa(unescape(encodeURIComponent(JSON.stringify({groceryItems,checkedAisle},null,2))));
  const apiUrl=`https://api.github.com/repos/${githubUser}/${repoName}/contents/${filePath}`;
  try{
    const res=await fetch(apiUrl,{headers:{Authorization:`token ${token}`,Accept:"application/vnd.github.v3+json"}});
    const data = res.ok ? await res.json() : {};
    const sha = data.sha || null;
    const response=await fetch(apiUrl,{
      method:'PUT',
      headers:{"Authorization":`token ${token}`,"Content-Type":"application/json"},
      body:JSON.stringify({message:"Update grocery list",content,sha})
    });
    if(!silent) response.ok ? alert("✅ Uploaded to GitHub!") : alert("❌ Failed to upload");
  }catch(e){ console.error(e); if(!silent) alert("❌ Error uploading"); }
}
async function restoreFromGitHub(){
  const token = localStorage.getItem('githubToken');
  if(!token) return;
  try{
    const response = await fetch(`https://api.github.com/repos/${githubUser}/${repoName}/contents/${filePath}`,{headers:{Authorization:`token ${token}`,Accept:"application/vnd.github.v3+json"}});
    if(!response.ok) throw new Error("Fetch failed");
    const data = await response.json();
    const decoded = atob(data.content);
    const jsonData = JSON.parse(decoded);
    groceryItems = jsonData.groceryItems || [];
    checkedAisle = jsonData.checkedAisle || [];
    saveData(); renderMaster(); renderChecked();
    alert("✅ Restored from GitHub!");
  }catch(e){ console.error(e); alert("❌ Could not restore from GitHub"); }
}

// --- Render ---
function renderMaster(filter=""){
  const list=document.getElementById('groceryList'); list.innerHTML='';
  sortByAisle(groceryItems);
  groceryItems.forEach((item,index)=>{
    if(filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;
    const li=document.createElement('li'); li.className='item';
    const left=document.createElement('div');
    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=item.checked||false;
    cb.addEventListener('change',()=>{ item.checked=cb.checked; saveData(); });
    const text=document.createElement('span'); text.textContent=`${item.name} (Aisle: ${item.aisle})`;
    left.appendChild(cb); left.appendChild(text);
    const btns=document.createElement('div');
    const editBtn=document.createElement('button'); editBtn.textContent='Edit';
    editBtn.addEventListener('click',()=>{
      const newName=prompt("Edit item:",item.name); if(newName!==null)item.name=newName.trim();
      const newAisle=prompt("Edit aisle:",item.aisle); if(newAisle!==null)item.aisle=newAisle.trim();
      renderMaster(document.getElementById('searchInput').value); saveData();
    });
    const removeBtn=document.createElement('button'); removeBtn.textContent='Remove';
    removeBtn.addEventListener('click',()=>{ groceryItems.splice(index,1); saveData(); renderMaster(document.getElementById('searchInput').value); });
    btns.appendChild(editBtn); btns.appendChild(removeBtn);
    li.appendChild(left); li.appendChild(btns);
    list.appendChild(li);
  });
}
function renderChecked(){
  const list=document.getElementById('checkedList'); list.innerHTML='';
  sortByAisle(checkedAisle);
  checkedAisle.forEach((item,i)=>{
    const li=document.createElement('li'); li.className='item';
    if(item.done) li.classList.add('checked');
    const left=document.createElement('div');
    const cb=document.createElement('input'); cb.type='checkbox'; cb.checked=item.done||false;
    cb.addEventListener('change',()=>{
      item.done=cb.checked;
      if(cb.checked){ li.classList.add('checked'); checkedAisle.push(checkedAisle.splice(i,1)[0]); }
      else { li.classList.remove('checked'); }
      saveData(); renderChecked();
    });
    const span=document.createElement('span'); span.textContent=`${item.name} (Aisle: ${item.aisle})`;
    left.appendChild(cb); left.appendChild(span);
    li.appendChild(left); list.appendChild(li);
  });
}

// --- Add Item ---
async function addItem(){
  const name=document.getElementById('itemInput').value.trim();
  const aisle=document.getElementById('aisleInput').value.trim();
  if(!name) return;
  if(groceryItems.some(i=>i.name.toLowerCase()===name.toLowerCase())) return alert("Item already exists!");
  groceryItems.push({name,aisle,checked:false});
  document.getElementById('itemInput').value=''; document.getElementById('aisleInput').value='';
  saveData(); renderMaster(document.getElementById('searchInput').value);
  await saveToGitHub(true);
}

// --- Helpers ---
function clearAllChecks(){ groceryItems.forEach(i=>i.checked=false); saveData(); renderMaster(document.getElementById('searchInput').value); }
function showMaster(){ document.getElementById('masterPage').classList.remove('hidden'); document
