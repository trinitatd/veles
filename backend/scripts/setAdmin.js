import dns from "dns";
dns.setServers(["8.8.8.8", "1.1.1.1"]);
import "dotenv/config";
import { clerkClient } from "@clerk/express";

const target = process.argv[2];
const desiredRole = process.argv[3] || "admin";

async function main() {
  if (!process.env.CLERK_SECRET_KEY) {
    console.error("Error: CLERK_SECRET_KEY is not defined in backend/.env");
    process.exit(1);
  }

  // Fetch all Clerk users
  console.log("Fetching Clerk users...");
  const usersResponse = await clerkClient.users.getUserList({ limit: 100 });
  const users = usersResponse.data;

  if (!users || users.length === 0) {
    console.log("No users found in Clerk.");
    process.exit(0);
  }

  if (!target) {
    console.log("\nUsage:");
    console.log("  node scripts/setAdmin.js <email-or-username-or-clerkId> [admin|user]\n");
    console.log("Available users in Clerk:");
    users.forEach((u) => {
      const email = u.emailAddresses?.[0]?.emailAddress || "no-email";
      const role = u.publicMetadata?.role || "user";
      console.log(` - ID: ${u.id} | Email: ${email} | Current Role: ${role}`);
    });
    console.log("\nExample:");
    console.log(`  node scripts/setAdmin.js ${users[0]?.emailAddresses?.[0]?.emailAddress || "user@example.com"} admin`);
    process.exit(0);
  }

  // Find user by email, username, or Clerk user ID
  const matchedUser = users.find((u) => {
    const email = u.emailAddresses?.[0]?.emailAddress?.toLowerCase();
    const username = u.username?.toLowerCase();
    const id = u.id;
    const search = target.toLowerCase();
    return email === search || username === search || id === target;
  });

  if (!matchedUser) {
    console.error(`User "${target}" not found in Clerk.`);
    console.log("Available emails:");
    users.forEach((u) => {
      console.log(` - ${u.emailAddresses?.[0]?.emailAddress} (${u.id})`);
    });
    process.exit(1);
  }

  // Update public metadata
  console.log(`Updating role for ${matchedUser.emailAddresses?.[0]?.emailAddress} (${matchedUser.id}) to "${desiredRole}"...`);
  await clerkClient.users.updateUserMetadata(matchedUser.id, {
    publicMetadata: {
      ...matchedUser.publicMetadata,
      role: desiredRole,
    },
  });

  console.log(`\nSUCCESS! User ${matchedUser.emailAddresses?.[0]?.emailAddress} is now set to role: "${desiredRole}".`);
  console.log("When this user logs in or refreshes Veles, they will have access to /admin and see the Admin Panel.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Error setting admin role:", err.message);
  process.exit(1);
});
