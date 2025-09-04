# BlitzWare JavaScript SDK Role Check Example

This example demonstrates how to implement role-based access control using the BlitzWare JavaScript SDK in a vanilla JavaScript application.

## Features

- **Authentication Flow**: Login and logout functionality
- **Role-Based Access Control**: Different content sections based on user roles
- **Responsive UI**: Clean, accessible interface with role-specific styling
- **Real-time Updates**: Dynamic content updates based on authentication state

## Role-Based Content

The application displays different content sections based on user roles:

### Admin Role
- **Admin Dashboard**: Access to administrative features
- **Features**: User Management, System Settings, Analytics, Security Logs
- **Styling**: Yellow/amber theme indicating elevated privileges

### Premium Role  
- **Premium Features**: Enhanced functionality for premium users
- **Features**: Advanced Analytics, Priority Support, Custom Themes, Export Features
- **Styling**: Blue/cyan theme for premium experience

### Standard User
- **User Dashboard**: Basic user functionality
- **Features**: Profile View, Basic Features, Support Tickets
- **Styling**: Green theme for standard access
- **Upgrade Prompt**: Encouragement to upgrade to premium

### No Access
- **Login Required**: Message for unauthenticated users
- **Styling**: Red theme indicating restricted access

## Implementation Details

### Role Checking Logic
```javascript
function hasRole(userRoles, roleName) {
  if (!userRoles || !Array.isArray(userRoles)) return false;
  
  return userRoles.some(role => 
    typeof role === 'string' ? role.toLowerCase() === roleName.toLowerCase() :
    typeof role === 'object' && role.name ? role.name.toLowerCase() === roleName.toLowerCase() :
    false
  );
}
```

### Dynamic Content Display
- **Conditional Rendering**: Shows/hides sections based on role checks
- **Profile Information**: Displays user details including roles
- **Real-time Updates**: Content updates immediately on login/logout

### Authentication Handling
- **Redirect Flow**: Handles OAuth redirect authentication
- **State Management**: Maintains authentication state across page loads
- **Error Handling**: Graceful handling of authentication errors

## Setup Instructions

1. **Configure Client**: Update the `clientId` and `redirectUri` in `app.js`
2. **Serve Files**: Serve the files through a web server (not file://)
3. **Test Authentication**: Use the login button to authenticate
4. **Verify Roles**: Check that role-based content appears correctly

## File Structure

```
blitzware-js-role-check-example/
├── index.html          # Main HTML structure with role sections
├── app.js              # JavaScript logic with role checking
├── style.css           # Styling for role-based sections
└── README.md           # This documentation
```

## Usage Example

```javascript
// Initialize BlitzWare client
BlitzWareAuth.createBlitzWareClient({
  clientId: "your-client-id",
  redirectUri: "your-redirect-uri",
  responseType: "code"
}).then(async (blitzWareClient) => {
  // Check authentication and get user
  const isAuthenticated = await blitzWareClient.isAuthenticated();
  const user = await blitzWareClient.getUser();
  
  // Show role-based content
  if (isAuthenticated && user) {
    showRoleBasedContent(user);
  }
});
```

## Customization

### Adding New Roles
1. Add new HTML section in `index.html`
2. Add corresponding CSS styling in `style.css`
3. Update `showRoleBasedContent()` function in `app.js`
4. Add role check logic using `hasRole()` helper

### Styling Roles
Each role section has its own color theme:
- **Admin**: Yellow/amber (`#fff3cd`, `#ffc107`)
- **Premium**: Blue/cyan (`#d1ecf1`, `#17a2b8`)
- **User**: Green (`#d4edda`, `#28a745`)
- **No Access**: Red (`#f8d7da`, `#dc3545`)

## Security Notes

- Role checks are performed client-side for UI purposes only
- Server-side validation is required for actual access control
- Never rely solely on client-side role checks for security
- Always validate permissions on the backend

## Browser Compatibility

- Modern browsers with ES2017+ support
- Promise/async-await support required
- DOM manipulation APIs required

## Related Examples

- [Basic JavaScript Example](../blitzware-js-example-01/)
- [React Role Check Example](../../../blitzware-react-sdk/examples/blitzware-react-role-check-example/)
- [Vue Role Check Example](../../../blitzware-vue-sdk/examples/blitzware-vue-role-check-example/)
- [Angular Role Check Example](../../../blitzware-angular-sdk/examples/blitzware-angular-role-check-example/)
