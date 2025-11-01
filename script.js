document.addEventListener("DOMContentLoaded", () => {
  const albertsonsList = document.getElementById("albertsonsList");
  const shoppingList = document.getElementById("shoppingList");
  const searchBox = document.getElementById("searchBox");
  const clearAllBtn = document.getElementById("clearAllBtn");

  const exportBtn = document.getElementById("exportBtn");
  const restoreBtn = document.getElementById("restoreBtn");
  const importBtn = document.getElementById("importBtn");
  const setTokenBtn = document.getElementById("setTokenBtn");
  const loadTokenBtn = document.getElementById("loadTokenBtn");

  let githubToken = localStorage.getItem("githubToken") || "";

  // ====== LOAD LISTS ======
  function loadLists() {
    albertsonsList.innerHTML = localStorage.getItem("albertsonsList") || "";
    shoppingList.innerHTML = localStorage.getItem("shoppingList") || "";
    addListEventListeners();
  }

  // ====== SAVE LISTS ======
  function saveLists() {
    localStorage.setItem("albertsonsList", albertsonsList.innerHTML);
    localStorage.setItem("shoppingList", shoppingList.innerHTML);
  }

  // ====== ADD LIST EVENTS ======
  function addListEventListeners() {
    document.querySelectorAll("input[type='checkbox']").forEach(checkbox => {
      checkbox.addEventListener("change", moveItem);
    });

    document.querySelectorAll(".sortable-list li").forEach(item => {
      item.draggable = true;
      item.addEventListener("dragstart", e => {
        e.target.classList.add("dragging");
      });
      item.addEventListener("dragend", e => {
        e.target.classList.remove("dragging");
        saveLists();
      });
    });

    albertsonsList.addEventListener("dragover", handleDragOver);
  }

  // ====== MOVE ITEM BETWEEN LISTS ======
  function moveItem(e) {
    const item = e.target.closest("li");
    if (e.target.checked) {
      shoppingList.appendChild(item);
    } else {
      albertsonsList.appendChild(item);
    }
    saveLists();
  }

  // ====== DRAG SORTING ======
  function handleDragOver(e) {
    e.preventDefault();
    const draggingItem = document.querySelector(".dragging");
    const afterElement = getDragAfterElement(albertsonsList, e.clientY);
    if (afterElement == null) {
      albertsonsList.appendChild(draggingItem);
    } else {
      albertsonsList.insertBefore(draggingItem, afterElement);
    }
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll("li:not(.dragging)")];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      return (offset < 0 && offset > closest.offset)
        ? { offset, element: child }
        : closest;
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // ====== SEARCH FILTER ======
  searchBox.addEventListener("input", () => {
    const filter = searchBox.value.toLowerCase();
    document.querySelectorAll("li").forEach(li => {
      const text = li.textContent.toLowerCase();
      li.style.display = text.includes(filter) ? "" : "none";
    });
  });

  // ====== CLEAR ALL CHECKS ======
  clearAllBtn.addEventListener("click", () => {
    document.querySelectorAll("input[type='checkbox']").forEach(cb => cb.checked = false);
    loadLists();
  });

  // ====== ADMIN DROPDOWN ======
  const adminDropdownBtn = document.querySelector(".menu .dropdown-btn");
  const adminDropdownContent = document.querySelector(".menu .dropdown-content");

  adminDropdownBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const isVisible = adminDropdownContent.style.display === "block";
    document.querySelectorAll(".dropdown-content").forEach(dc => dc.style.display = "none");
    adminDropdownContent.style.display = isVisible ? "none" : "block";
  });

  document.addEventListener("click", () => {
    document.querySelectorAll(".dropdown-content").forEach(dc => dc.style.display = "none");
  });

  // ====== GITHUB EXPORT ======
  exportBtn.addEventListener("click", async () => {
    if (!githubToken) {
      alert("Please set your GitHub token first.");
      return;
    }
    const repo = prompt("Enter GitHub repo name (example: username/repo):");
    if (!repo) return;

    const content = {
      albertsonsList: albertsonsList.innerHTML,
      shoppingList: shoppingList.innerHTML
    };

    const encoded = btoa(JSON.stringify(content, null, 2));

    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/groceryData.json`, {
        method: "PUT",
        headers: {
          "Authorization": `token ${githubToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          message: "Grocery list updated",
          content: encoded
        })
      });

      if (res.ok) {
        alert("✅ Grocery list exported to GitHub successfully!");
      } else {
        const data = await res.json();
        alert("❌ GitHub export failed: " + data.message);
      }
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  });

  // ====== GITHUB RESTORE ======
  restoreBtn.addEventListener("click", async () => {
    if (!githubToken) {
      alert("Please set your GitHub token first.");
      return;
    }
    const repo = prompt("Enter GitHub repo name (example: username/repo):");
    if (!repo) return;

    try {
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/groceryData.json`, {
        headers: { "Authorization": `token ${githubToken}` }
      });

      if (!res.ok) throw new Error("Failed to fetch file.");

      const data = await res.json();
      const content = JSON.parse(atob(data.content));

      albertsonsList.innerHTML = content.albertsonsList || "";
      shoppingList.innerHTML = content.shoppingList || "";
      saveLists();
      addListEventListeners();

      alert("✅ Grocery lists restored from GitHub!");
    } catch (err) {
      alert("❌ Error restoring: " + err.message);
    }
  });

  // ====== IMPORT FROM FILE ======
  importBtn.addEventListener("click", async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = e => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = event => {
        const data = JSON.parse(event.target.result);
        albertsonsList.innerHTML = data.albertsonsList || "";
        shoppingList.innerHTML = data.shoppingList || "";
        saveLists();
        addListEventListeners();
        alert("✅ Imported from file!");
      };
      reader.readAsText(file);
    };
    input.click();
  });

  // ====== SET GITHUB TOKEN ======
  setTokenBtn.addEventListener("click", () => {
    const token = prompt("Enter your GitHub Personal Access Token:");
    if (token) {
      githubToken = token;
      localStorage.setItem("githubToken", token);
      alert("✅ GitHub token saved!");
    }
  });

  // ====== LOAD TOKEN FROM FILE ======
  loadTokenBtn.addEventListener("click", () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".txt,.json";
    input.onchange = e => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = event => {
        githubToken = event.target.result.trim();
        localStorage.setItem("githubToken", githubToken);
        alert("✅ Token loaded successfully!");
      };
      reader.readAsText(file);
    };
    input.click();
  });

  // ====== INIT ======
  loadLists();
});