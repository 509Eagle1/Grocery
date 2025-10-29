async function pushToGitHub(token) {
  const owner = "YOUR_USERNAME";     // Replace with your GitHub username
  const repo = "grocery-list";       // Replace with your repo name
  const path = "data/grocery.json";  // Path in repo (can be "grocery.json" if in root)
  
  // Convert grocery list to Base64
  const content = btoa(unescape(encodeURIComponent(JSON.stringify({ groceryItems, checkedAisle }, null, 2))));
  
  let sha = null;

  // Try to get SHA of existing file (if it exists)
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`);
    if (res.ok) {
      const data = await res.json();
      sha = data.sha; // Use SHA to update file
    }
  } catch (e) {
    // File may not exist yet, ignore
  }

  // Push to GitHub (create or update)
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: 'PUT',
    headers: {
      'Authorization': `token ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message: "Update grocery list",
      content: content,
      sha: sha  // If null, GitHub will create a new file
    })
  });

  const result = await response.json();
  
  if (!response.ok) {
    console.error(result);
    alert("GitHub push failed: " + (result.message || response.statusText));
  } else {
    alert("Grocery list successfully pushed to GitHub!");
  }
}
