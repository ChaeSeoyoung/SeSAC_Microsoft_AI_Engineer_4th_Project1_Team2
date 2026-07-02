// src/api/updateModel.js
export async function updateModel() {
  try {
    const response = await fetch("http://localhost:8000/update-model");
    if (!response.ok) {
      throw new Error("Server error: " + response.status);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to update model:", error);
    return { updated: false, message: "Update failed" };
  }
}
