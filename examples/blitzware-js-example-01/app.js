BlitzWareAuth.createBlitzWareClient({
  clientId: "your-client-id",
  redirectUri: "your-redirect-uri",
}).then(async (blitzWareClient) => {
  document.getElementById("login").addEventListener("click", (e) => {
    e.preventDefault();
    blitzWareClient.login();
  });

  document.getElementById("logout").addEventListener("click", (e) => {
    e.preventDefault();
    blitzWareClient.logout();
  });

  if (
    location.search.includes("state=") &&
    location.search.includes("access_token=")
  ) {
    await blitzWareClient.handleRedirect();
  }

  const isAuthenticated = await blitzWareClient.isAuthenticated();
  const user = await blitzWareClient.getUser();
  const isLoading = await blitzWareClient.isLoading();

  const loginButtonElement = document.getElementById("login");
  const logoutButtonElement = document.getElementById("logout");
  const profileElement = document.getElementById("profile");

  if (isLoading) {
    profileElement.style.display = "block";
    profileElement.innerHTML = `<p>Loading...</p>`;
  } else {
    if (isAuthenticated) {
      loginButtonElement.style.display = "none";
      logoutButtonElement.style.display = "block";
      profileElement.style.display = "block";
      profileElement.innerHTML = `<p>Welcome to the protected dashboard, ${user.username}!</p>`;
    } else {
      profileElement.style.display = "none";
      logoutButtonElement.style.display = "none";
      loginButtonElement.style.display = "block";
    }
  }
});
