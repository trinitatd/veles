import { clerkClient } from "@clerk/express";

/**
 * Extracts and verifies the role of the authenticated Clerk user.
 * First checks JWT session claims (metadata.role, publicMetadata.role).
 * If absent or not "admin", falls back to querying the Clerk API directly
 * to verify publicMetadata.role or privateMetadata.role.
 *
 * @param {import("express").Request} req
 * @returns {Promise<string>} User role ('admin' | 'user')
 */
export const getClerkUserRole = async (req) => {
  const sessionRole =
    req.auth?.sessionClaims?.metadata?.role ||
    req.auth?.sessionClaims?.publicMetadata?.role ||
    req.auth?.sessionClaims?.public_metadata?.role;

  if (sessionRole) {
    return sessionRole;
  }

  const clerkUserId = req.auth?.userId;
  if (!clerkUserId) return "user";

  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    return (
      clerkUser?.publicMetadata?.role ||
      clerkUser?.privateMetadata?.role ||
      "user"
    );
  } catch (err) {
    console.error("Error fetching Clerk user role:", err?.message || err);
    return "user";
  }
};

/**
 * Express middleware to enforce administrator privileges.
 * Verifies the authenticated identity server-side via Clerk context.
 * Rejects unauthenticated requests with 401, non-admins with 403.
 */
export const requireAdmin = async (req, res, next) => {
  try {
    const clerkUserId = req.auth?.userId;
    if (!clerkUserId) {
      return res.status(401).json("Not authenticated!");
    }

    const role = await getClerkUserRole(req);

    if (role !== "admin") {
      return res.status(403).json("Admin access denied!");
    }

    // Attach verified role to auth context
    req.auth.role = role;
    next();
  } catch (error) {
    console.error("Error in requireAdmin middleware:", error);
    next(error);
  }
};

export default requireAdmin;
