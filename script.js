document.addEventListener("DOMContentLoaded", () => {
  let groceryItems = [];
  let checkedAisle = [];

  // 🔹 Load JSON from GitHub Pages if exists
  async function loadFromGitHub() {
    try {
      const response = await fetch("data/grocery.json");
      if (!response.ok) return;
      const data = await response.json();
      groceryItems = data.groceryItems || [];
      checkedAisle = data.checkedAisle || [];
      renderMaster();
    } catch (err) {
      console.log("No GitHub data found.");
    }
  }

  // 🔹 Save to localStorage
  function saveData() {
    localStorage.setItem("groceryItems", JSON.stringify(groceryItems));
    localStorage.setItem("checkedAisle", JSON.stringify(checkedAisle));
  }

  // 🔹 Load from localStorage or fallback to GitHub
  function loadLocal() {
    groceryItems = JSON.parse(localStorage.getItem("groceryItems") || "[]");
    checkedAisle = JSON.parse(localStorage.getItem("checkedAisle") || "[]");
    if (!groceryItems.length) loadFromGitHub();
    renderMaster();
  }

  function sortByAisle(arr) {
    return arr.sort((a, b) =>
      a.aisle.localeCompare(b.aisle, undefined, { numeric: true, sensitivity: "base" })
    );
  }

  // 🔹 Render Master List
  function renderMaster(filter = "") {
    const list = document.getElementById("groceryList");
    list.innerHTML = "";
    sortByAisle(groceryItems);
    groceryItems.forEach((item, index) => {
      if (filter && !item.name.toLowerCase().includes(filter.toLowerCase())) return;
      const li = document.createElement("li");
      const left = document.createElement("div");
      left.className = "item-left";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = item.checked || false;
      cb.addEventListener("change", () => {
        item.checked = cb.checked;
        saveData();
      });

      const text = document.createElement("span");
      text.textContent = `${item.name} (Aisle: ${item.aisle})`;
      left.appendChild(cb);
      left.appendChild(text);

      const btns = document.createElement("div");
      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.className = "edit";
      editBtn.onclick = () => {
        const newName = prompt("Edit item:", item.name);
        if (newName !== null) item.name = newName.trim();
        const newAisle = prompt("Edit aisle:", item.aisle);
        if (newAisle !== null) item.aisle = newAisle.trim();
        renderMaster();
        saveData();
      };

      const removeBtn = document.createElement("button");
      removeBtn.textContent = "Remove";
      removeBtn.className = "remove";
      removeBtn.onclick = () => {
        groceryItems.splice(index, 1);
        saveData();
        renderMaster();
      };

      btns.appendChild(editBtn);
      btns.appendChild(removeBtn);
      li.appendChild(left);
      li.appendChild(btns);
      list.appendChild(li);
    });
  }

  // 🔹 Render Checked by Aisle
  function renderChecked() {
    const list = document.getElementById("checkedList");
    list.innerHTML = "";
    sortByAisle(checkedAisle);

    checkedAisle.forEach((item, i) => {
      const li = document.createElement("li");
      const left = document.createElement("div");
      left.className = "item-left";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = item.done || false;
      cb.onchange = () => {
        item.done = cb.checked;
        // Move checked items to bottom
        const done = checkedAisle.filter(i => i.done);
        const undone = checkedAisle.filter(i => !i.done);
        checkedAisle = [...undone, ...done];
        saveData();
        renderChecked();
      };

      const span = document.createElement("span");
      span.textContent = `${item.name} (Aisle: ${item.aisle})`;
      if (item.done) li.classList.add("checked");
      left.appendChild(cb);
      left.appendChild(span);
      li.appendChild(left);
      list.appendChild(li);
    });
  }

  // 🔹 Add Item
  function addItem() {
    const name = document.getElementById("itemInput").value.trim();
    const aisle = document.getElementById("aisleInput").value.trim();
    if (!name) return;
    const exists = groceryItems.some(
      g => g.name.toLowerCase() === name.toLowerCase() &&
           g.aisle.toLowerCase() === aisle.toLowerCase()
    );
    if (!exists) groceryItems.push({ name, aisle, checked: false });
    saveData();
    renderMaster();
    document.getElementById("itemInput").value = "";
    document.getElementById("aisleInput").value = "";
  }

  function clearAllChecks() {
    groceryItems.forEach(i => i.checked = false);
    saveData();
    renderMaster();
  }

  function showMaster() {
    document.getElementById("masterPage").classList.remove("hidden");
    document.getElementById("checkedPage").classList.add("hidden");
    document.getElementById("addPage").classList.add("hidden");
  }

  function showChecked() {
    checkedAisle = groceryItems.filter(i => i.checked).map(i => ({ ...i, done: false }));
    saveData();
    renderChecked();
    document.getElementById("checkedPage").classList.remove("hidden");
    document.getElementById("masterPage").classList.add("hidden");
    document.getElementById("addPage").classList.add("hidden");
  }

  function showAdd() {
    document.getElementById("addPage").classList.remove("hidden");
    document.getElementById("masterPage").classList.add("hidden");
    document.getElementById("checkedPage").classList.add("hidden");
  }

  // 🔹 Clipboard Export
  async function exportListClipboard() {
    const data = JSON.stringify({ groceryItems, checkedAisle }, null, 2);
    try {
      await navigator.clipboard.writeText(data);
      alert("✅ List copied to clipboard!");
    } catch (err) {
      alert("❌ Could not copy to clipboard.");
    }
  }

  // 🔹 Clipboard Import
  async function importListClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const data = JSON.parse(text);
      if (Array.isArray(data.groceryItems)) {
        data.groceryItems.forEach(item => {
          const exists = groceryItems.some(g =>
            g.name.toLowerCase() === item.name.toLowerCase() &&
            g.aisle.toLowerCase() === item.aisle.toLowerCase()
          );
          if (!exists) groceryItems.push(item);
        });
      }
      if (Array.isArray(data.checkedAisle)) checkedAisle = data.checkedAisle;
      saveData();
      renderMaster();
      alert("✅ Imported from clipboard!");
    } catch {
      alert("❌ Clipboard data not valid JSON.");
    }
  }

  // 🔹 Import from file
  function importFile(file) {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target.result;
      if (file.name.endsWith(".json")) {
        const data = JSON.parse(text);
        if (Array.isArray(data.groceryItems)) {
          data.groceryItems.forEach(item => {
            const exists = groceryItems.some(g =>
              g.name.toLowerCase() === item.name.toLowerCase() &&
              g.aisle.toLowerCase() === item.aisle.toLowerCase()
            );
            if (!exists) groceryItems.push(item);
          });
        }
      } else if (file.name.endsWith(".csv")) {
        const lines = text.split(/\r?\n/).filter(l => l.trim());
        lines.forEach(line => {
          const [name, aisle] = line.split(",").map(s => s.trim());
          const exists = groceryItems.some(g =>
            g.name.toLowerCase() === name.toLowerCase() &&
            g.aisle.toLowerCase() === aisle.toLowerCase()
          );
          if (name && !exists) groceryItems.push({ name, aisle, checked: false });
        });
      }
      saveData();
      renderMaster();
    };
    reader.readAsText(file);
  }

  // 🔹 Save to GitHub (push JSON)
  async function saveToGitHub(token) {
    const owner = "YOUR_USERNAME";
    const repo = "grocery-list";
    const path = "data/grocery.json";
    const message = "Update grocery list from app";

    try {
      const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: { Authorization: `token ${token}` }
      });
      const getData = await getRes.json();
      const sha = getData.sha;
      const content = btoa(JSON.stringify({ groceryItems, checkedAisle }, null, 2));
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: "PUT",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ message, content, sha })
      });
      if (res.ok) alert("✅ Saved to GitHub!");
      else alert("❌ Failed to save to GitHub");
    } catch (err) {
      console.error(err);
      alert("❌ Error saving to GitHub");
    }
  }

  // 🔹 Event Listeners
  document.getElementById("addItemBtn").onclick = addItem;
  document.getElementById("showMasterBtn").onclick = showMaster;
  document.getElementById("showCheckedBtn").onclick = showChecked;
  document.getElementById("showAddBtn").onclick = showAdd;
  document.getElementById("clearChecksBtn").onclick = clearAllChecks;
  document.getElementById("exportListBtn").onclick = exportListClipboard;
  document.getElementById("importListBtn").onclick = importListClipboard;
  document.getElementById("importFileBtn").onclick = () =>
    document.getElementById("importFileInput").click();
  document.getElementById("importFileInput").onchange = e => {
    if (e.target.files.length) importFile(e.target.files[0]);
  };
  document.getElementById("searchInput").oninput = e => renderMaster(e.target.value);

  // Optional: Export to GitHub via token prompt
  document.getElementById("exportListBtn").addEventListener("dblclick", async () => {
    const token = prompt("Enter your GitHub Personal Access Token");
    if (!token) return;
    await saveToGitHub(token);
  });

  loadLocal();
});
