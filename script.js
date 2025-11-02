// ===== Global Variables =====
let groceryItems = [];
let checkedItems = [];
let githubToken = "";
let githubRepo = "grocery-list";
let githubFile = "grocery.json";

// ===== Page Navigation =====
const masterPage = document.getElementById("masterPage");
const checkedPage = document.getElementById("checkedPage");
const addPage = document.getElementById("addPage");
const groceryList = document.getElementById("groceryList");
const checkedList = document.getElementById("checkedList");

document.getElementById("showMasterBtn").addEventListener("click", () => showPage(masterPage));
document.getElementById("showCheckedBtn").addEventListener("click", () => showPage(checkedPage));
document.getElementById("showAddBtn").addEventListener("click", () => showPage(addPage));

function showPage(page) {
  [masterPage, checkedPage, addPage].forEach(p => p.classList.add("hidden"));
  page.classList.remove("hidden");
}

// ===== Admin Dropdown =====
const dropdownBtn = document.querySelector(".dropdown-btn");
const dropdownContent = document.querySelector(".dropdown-content");
dropdownBtn.addEventListener("click", () => {
  dropdownContent.style.display = dropdownContent.style.display === "block" ? "none" : "block";
});
window.addEventListener("click", (e) => {
  if (!e.target.matches(".dropdown-btn")) dropdownContent.style.display = "none";
});

// ===== Add Items =====
document.getElementById("addItemBtn").addEventListener("click", () => {
  const name = document.getElementById("itemInput").value.trim();
  const aisle = document.getElementById("aisleInput").value.trim();
  if (!name || !aisle) return alert("Enter item and aisle");
  groceryItems.push({ name, aisle });
  saveLocal();
  renderMaster();
  document.getElementById("itemInput").value = "";
  document.getElementById("aisleInput").value = "";
  alert(`${name} added to list`);
});

// ===== Clear All Checks =====
document.getElementById("clearChecksBtn").addEventListener("click", () => {
  document.querySelectorAll("#groceryList input[type='checkbox']").forEach(cb => cb.checked = false);
  checkedItems = [];
  saveLocal();
  exportToGitHub();
  alert("All checks cleared and list exported to GitHub.");
});

// ===== Render Master List =====
function renderMaster(filter = "") {
  groceryList.innerHTML = "";

  // Deduplicate + sort by aisle then item name
  const seen = new Set();
  const uniqueItems = [];
  groceryItems.forEach(it => {
    const key = `${it.name.trim().toLowerCase()}_${it.aisle.trim().toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueItems.push(it);
    }
  });
  uniqueItems.sort((a, b) => {
    const aisleA = a.aisle.toLowerCase();
    const aisleB = b.aisle.toLowerCase();
    if (aisleA < aisleB) return -1;
    if (aisleA > aisleB) return 1;
    return a.name.localeCompare(b.name);
  });

  uniqueItems
    .filter(i => i.name.toLowerCase().includes(filter.toLowerCase()))
    .forEach((item) => {
      const li = document.createElement("li");
      li.className = "item";
      li.innerHTML = `
        <div class="item-left">
          <input type="checkbox">
          <span>${item.name}</span>
          <small>(${item.aisle})</small>
        </div>`;
      const checkbox = li.querySelector("input");

      // When checked, copy to shopping list (ALWAYS unchecked there)
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          copyToShoppingList(item);
          checkbox.checked = false; // ensure original remains unchecked
        }
      });

      groceryList.appendChild(li);
    });
}

// ===== Copy to Shopping List (ALWAYS unchecked) =====
function copyToShoppingList(item) {
  const exists = checkedItems.some(i => i.name === item.name && i.aisle === item.aisle);
  if (exists) return;
  const copy = { name: item.name, aisle: item.aisle, checked: false }; // Explicitly unchecked
  checkedItems.push(copy);
  saveLocal();
  renderChecked();
}

// ===== Render Shopping List =====
function renderChecked() {
  checkedList.innerHTML = "";

  checkedItems.forEach((item, index) => {
    const li = document.createElement("li");
    li.className = "item" + (item.checked ? " checked" : "");
    li.innerHTML = `
      <div class="item-left">
        <input type="checkbox" ${item.checked ? "checked" : ""}>
        <span>${item.name}</span>
        <small>(${item.aisle})</small>
      </div>`;
    const checkbox = li.querySelector("input");

    // When checked, line-through + move to bottom
    checkbox.addEventListener("change", () => {
      item.checked = checkbox.checked;
      if (item.checked) {
        li.classList.add("checked");
        checkedItems.splice(index, 1);
        checkedItems.push(item); // move to bottom
      } else {
        li.classList.remove("checked");
      }
      saveLocal();
      renderChecked();
    });

    checkedList.appendChild(li);
  });
}

// ===== Search =====
const searchInput = document.getElementById("searchInput");
const clearSearchBtn = document.getElementById("clearSearchBtn");
searchInput.addEventListener("input", () => {
  renderMaster(searchInput.value);
  clearSearchBtn.style.display = searchInput.value ? "block" : "none";
});
clearSearchBtn.addEventListener("click", () => {
  searchInput.value = "";
  clearSearchBtn.style.display = "none";
  renderMaster();
});

// ===== Local Storage =====
function saveLocal() {
  localStorage.setItem("groceryItems", JSON.stringify(groceryItems));
  localStorage.setItem("checkedItems", JSON.stringify(checkedItems));
}
function loadLocal() {
  groceryItems = JSON.parse(localStorage.getItem("groceryItems") || "[]");
  checkedItems = JSON.parse(localStorage.getItem("checkedItems") || "[]");
}

// ===== GitHub Functions (optional) =====
async function exportToGitHub() {
  if (!githubToken) return;
  const content = btoa(JSON.stringify({ groceryItems, checkedItems }, null, 2));
  try {
    await fetch(`https://api.github.com/repos/${githubRepo}/contents/${githubFile}`, {
      method: "PUT",
      headers: {
        Authorization: `token ${githubToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: "Auto export grocery list", content }),
    });
  } catch (err) {
    console.error("GitHub export failed:", err);
  }
}

// ===== Initialize =====
loadLocal();
renderMaster();
renderChecked();