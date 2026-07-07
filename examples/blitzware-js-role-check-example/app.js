// BlitzWare JS SDK Role Check Example
// This example demonstrates role-based access control using the BlitzWare JavaScript SDK

BlitzWareAuth.createBlitzWareClient({
  clientId: "your-client-id",
  redirectUri: "your-redirect-uri",
  responseType: "code", // or "token"
  // authBaseUrl: "https://acme.auth.blitzware.xyz/api/auth/",
}).then(async (blitzWareClient) => {
  
  // DOM elements
  const loginButtonElement = document.getElementById("login");
  const logoutButtonElement = document.getElementById("logout");
  const profileElement = document.getElementById("profile");
  const adminSection = document.getElementById("admin-section");
  const premiumSection = document.getElementById("premium-section");
  const userSection = document.getElementById("user-section");
  const noAccessDiv = document.getElementById("no-access");

  // Event listeners
  loginButtonElement.addEventListener("click", (e) => {
    e.preventDefault();
    blitzWareClient.login();
  });

  logoutButtonElement.addEventListener("click", (e) => {
    e.preventDefault();
    blitzWareClient.logout();
    updateUI(null, false);
  });

  // Handle authentication redirect
  if (
    location.search.includes("state=") &&
    location.search.includes("access_token=")
  ) {
    await blitzWareClient.handleRedirect();
  }

  // Get authentication state
  const isAuthenticated = await blitzWareClient.isAuthenticated();
  const user = await blitzWareClient.getUser();
  const isLoading = await blitzWareClient.isLoading();

  // Update UI based on authentication state
  updateUI(user, isAuthenticated, isLoading);

  // Helper function to check if user has a specific role
  function hasRole(userRoles, roleName) {
    if (!userRoles || !Array.isArray(userRoles)) return false;
    
    return userRoles.some(role => 
      typeof role === 'string' ? role.toLowerCase() === roleName.toLowerCase() :
      typeof role === 'object' && role.name ? role.name.toLowerCase() === roleName.toLowerCase() :
      false
    );
  }

  // Function to show role-based content
  function showRoleBasedContent(user) {
    // Hide no access message
    noAccessDiv.style.display = 'none';
    
    // Get user roles
    const userRoles = user.roles || [];
    
    // Check for admin role
    if (hasRole(userRoles, 'admin')) {
      adminSection.style.display = 'block';
    } else {
      adminSection.style.display = 'none';
    }
    
    // Check for premium role
    if (hasRole(userRoles, 'premium')) {
      premiumSection.style.display = 'block';
    } else {
      premiumSection.style.display = 'none';
    }
    
    // Show user section for all authenticated users
    userSection.style.display = 'block';
    
    // If user has no special roles, show encouragement message
    if (!hasRole(userRoles, 'admin') && !hasRole(userRoles, 'premium')) {
      userSection.innerHTML = `
        <h2>User Dashboard</h2>
        <p>Welcome! Here's what you can do:</p>
        <ul>
          <li>View Profile</li>
          <li>Basic Features</li>
          <li>Support Tickets</li>
        </ul>
        <p><em>Consider upgrading to premium for more features!</em></p>
      `;
    }
  }

  // Function to hide all role sections
  function hideAllRoleSections() {
    adminSection.style.display = 'none';
    premiumSection.style.display = 'none';
    userSection.style.display = 'none';
  }

  // Main UI update function
  function updateUI(user, isAuthenticated, isLoading = false) {
    if (isLoading) {
      profileElement.style.display = "block";
      profileElement.innerHTML = `<p>Loading...</p>`;
      hideAllRoleSections();
      noAccessDiv.style.display = 'none';
    } else {
      if (isAuthenticated && user) {
        // User is logged in
        loginButtonElement.style.display = "none";
        logoutButtonElement.style.display = "block";
        profileElement.style.display = "block";
        
        // Display user profile with role information
        profileElement.innerHTML = `
          <h3>Welcome, ${user.username || user.name || user.email}!</h3>
          <p><strong>Email:</strong> ${user.email || 'N/A'}</p>
          <p><strong>User ID:</strong> ${user.sub || user.id || 'N/A'}</p>
          <p><strong>Roles:</strong> ${user.roles && user.roles.length > 0 ? 
            (Array.isArray(user.roles) ? user.roles.map(role => 
              typeof role === 'string' ? role : role.name || role
            ).join(', ') : user.roles) : 'No roles assigned'}</p>
        `;
        
        // Show role-based content
        showRoleBasedContent(user);
      } else {
        // User is not logged in
        profileElement.style.display = "none";
        logoutButtonElement.style.display = "none";
        loginButtonElement.style.display = "block";
        
        // Hide all role-based content and show no access message
        hideAllRoleSections();
        noAccessDiv.style.display = 'block';
      }
    }
  }
});
