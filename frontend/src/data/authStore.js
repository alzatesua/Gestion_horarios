// src/data/authStore.js
export const authStore = {
  user: null,
  setUser(u) {
    this.user = u;
    localStorage.setItem("user", JSON.stringify(u));
  },
  logout() {
    this.user = null;
    localStorage.removeItem("user");
  },
};
